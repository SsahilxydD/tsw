/**
 * Cloudflare Images orphan sweep.
 *
 * Truth = live products.json (CF image IDs currently referenced).
 * Orphan = an image ID on the Cloudflare account NOT referenced by products.json.
 *
 * Usage:
 *   node --env-file=../.env cf-orphan-sweep.cjs verify   # read-only: list + compute, writes orphans-to-delete.json
 *   node --env-file=../.env cf-orphan-sweep.cjs delete    # destructive: deletes ids in orphans-to-delete.json
 *
 * Safety:
 *   - Aborts if referenced set < MIN_REFERENCED (guards against diffing the wrong products.json).
 *   - Delete phase re-derives referenced ids and refuses to delete any that are live.
 *   - Resumable: appends to deleted-orphans-record.json; already-deleted ids are skipped.
 */
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.CLOUDFLARE_IMAGES_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!TOKEN || !ACCOUNT) {
  console.error('❌ Missing CLOUDFLARE_IMAGES_TOKEN / CLOUDFLARE_ACCOUNT_ID (use node --env-file=../.env)');
  process.exit(1);
}

const DIR = __dirname;
const PRODUCTS = path.join(DIR, '..', 'public', 'data', 'products.json');
const ORPHAN_FILE = path.join(DIR, 'orphans-to-delete.json');
const ACCOUNT_FILE = path.join(DIR, 'cf-account-images.json');
const RECORD_FILE = path.join(DIR, 'deleted-orphans-record.json'); // cumulative audit log (union)
const DONE_FILE = path.join(DIR, 'orphan-delete-done.json'); // THIS sweep's confirmed deletes (resume state)
const FAIL_FILE = path.join(DIR, 'orphan-delete-failures.json');
const MISSING_FILE = path.join(DIR, 'live-missing-from-account.json');

const MIN_REFERENCED = 10000; // sanity floor; live set is ~15,387
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/images`;
const H = { Authorization: `Bearer ${TOKEN}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function referencedIds() {
  const prods = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
  const ids = new Set();
  for (const p of prods) {
    for (const u of p.images || []) {
      const m = /imagedelivery\.net\/[^/]+\/([^/]+)\//.exec(u || '');
      if (m) ids.add(m[1]);
    }
  }
  return ids;
}

async function fetchRetry(url, opts = {}, tries = 7) {
  for (let i = 0; i < tries; i++) {
    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(500 * 2 ** i);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      const ra = parseInt(res.headers.get('retry-after') || '0', 10);
      await sleep(ra ? ra * 1000 : 500 * 2 ** i);
      continue;
    }
    return res;
  }
  throw new Error('retries exhausted: ' + url);
}

async function listAccount() {
  const ids = new Set();
  let token = null;
  let pages = 0;
  do {
    const url = new URL(`${API}/v2`);
    url.searchParams.set('per_page', '1000');
    if (token) url.searchParams.set('continuation_token', token);
    const res = await fetchRetry(url, { headers: H });
    const j = await res.json();
    if (!j.success) throw new Error('list failed: ' + JSON.stringify(j.errors));
    for (const img of j.result.images || []) ids.add(img.id);
    token = j.result.continuation_token || null;
    pages++;
    process.stdout.write(`\r  listing… pages=${pages} images=${ids.size}   `);
  } while (token);
  process.stdout.write('\n');
  return ids;
}

async function verify() {
  const ref = referencedIds();
  console.log(`referenced by live products.json: ${ref.size}`);
  if (ref.size < MIN_REFERENCED) {
    console.error(`❌ ABORT: referenced set (${ref.size}) below floor ${MIN_REFERENCED} — wrong products.json?`);
    process.exit(1);
  }
  const account = await listAccount();
  console.log(`on Cloudflare account: ${account.size}`);

  const orphans = [...account].filter((id) => !ref.has(id));
  const missing = [...ref].filter((id) => !account.has(id)); // live images already gone (broken)

  // hard guard
  const leak = orphans.filter((id) => ref.has(id));
  if (leak.length) {
    console.error(`❌ ABORT: ${leak.length} live ids leaked into orphan list`);
    process.exit(1);
  }

  fs.writeFileSync(ORPHAN_FILE, JSON.stringify(orphans));
  fs.writeFileSync(ACCOUNT_FILE, JSON.stringify([...account]));
  if (missing.length) fs.writeFileSync(MISSING_FILE, JSON.stringify(missing, null, 2));

  console.log('─'.repeat(50));
  console.log(`KEEP (live):     ${ref.size}`);
  console.log(`DELETE (orphan): ${orphans.length}`);
  console.log(`live missing from account (already broken): ${missing.length}`);
  console.log('─'.repeat(50));
  console.log(`orphan list written → ${ORPHAN_FILE}`);
  console.log('sample orphans:', orphans.slice(0, 3));
}

async function del() {
  if (!fs.existsSync(ORPHAN_FILE)) {
    console.error('❌ run verify first (orphans-to-delete.json missing)');
    process.exit(1);
  }
  const orphans = JSON.parse(fs.readFileSync(ORPHAN_FILE, 'utf8'));
  const ref = referencedIds(); // re-derive truth, never delete a live id
  const toDelete = orphans.filter((id) => !ref.has(id));
  if (toDelete.length !== orphans.length) {
    console.error(`❌ ABORT: ${orphans.length - toDelete.length} live ids present in orphan list`);
    process.exit(1);
  }

  // Resume from THIS sweep's confirmed deletes only — never trust the historical
  // record file (it logged intended, not confirmed, deletions under the old Node bug).
  let confirmed = [];
  try {
    confirmed = JSON.parse(fs.readFileSync(DONE_FILE, 'utf8'));
  } catch {}
  const done = new Set(confirmed);
  const pending = toDelete.filter((id) => !done.has(id));
  console.log(`to delete: ${toDelete.length} | confirmed this sweep: ${done.size} | pending: ${pending.length}`);

  let ok = 0;
  let fail = 0;
  const failures = [];
  const CONC = 16;
  let idx = 0;
  const start = Date.now();

  async function worker() {
    while (idx < pending.length) {
      const id = pending[idx++];
      try {
        const res = await fetchRetry(`${API}/v1/${id}`, { method: 'DELETE', headers: H });
        if (res.ok || res.status === 404) {
          ok++;
          confirmed.push(id);
        } else {
          fail++;
          failures.push({ id, status: res.status, body: (await res.text()).slice(0, 200) });
        }
      } catch (e) {
        fail++;
        failures.push({ id, error: String(e.message || e) });
      }
      const n = ok + fail;
      if (n % 200 === 0 || n === pending.length) {
        fs.writeFileSync(DONE_FILE, JSON.stringify(confirmed));
        const rate = ok / ((Date.now() - start) / 1000 || 1);
        process.stdout.write(`\r  deleted=${ok} failed=${fail} ${n}/${pending.length} ${rate.toFixed(1)}/s   `);
      }
    }
  }

  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync(DONE_FILE, JSON.stringify(confirmed));
  if (failures.length) fs.writeFileSync(FAIL_FILE, JSON.stringify(failures, null, 2));

  // Merge this sweep's confirmed deletes into the cumulative audit log (deduped union).
  let prior = [];
  try {
    prior = JSON.parse(fs.readFileSync(RECORD_FILE, 'utf8'));
  } catch {}
  const union = [...new Set([...prior, ...confirmed])];
  fs.writeFileSync(RECORD_FILE, JSON.stringify(union));

  console.log(`\n✅ done. deleted=${ok} failed=${fail}${failures.length ? ` (see ${FAIL_FILE})` : ''}`);
}

const mode = process.argv[2] || 'verify';
(mode === 'delete' ? del() : verify()).catch((e) => {
  console.error('\n❌ fatal:', e.message || e);
  process.exit(1);
});
