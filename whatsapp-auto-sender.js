// Cloudflare Worker - Auto WhatsApp Product Sender
// Runs hourly to check for new shoes and send to WhatsApp broadcast

export default {
  async scheduled(event, env, ctx) {
    // This runs every hour via cron trigger
    await sendNewShoesToWhatsApp(env);
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    // Manual trigger endpoint for testing: https://your-worker.workers.dev/send-now
    if (url.pathname === '/send-now') {
      await sendNewShoesToWhatsApp(env);
      return new Response('Products checked and sent!', { status: 200 });
    }

    // Status endpoint: https://your-worker.workers.dev/status
    if (url.pathname === '/status') {
      const stats = await getStats(env);
      return new Response(JSON.stringify(stats, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('WhatsApp Auto Sender Active', { status: 200 });
  }
};

async function sendNewShoesToWhatsApp(env) {
  try {
    console.log('Checking for new shoe products...');

    // Fetch latest products
    const response = await fetch('https://thesolowardrobe.com/data/products.json');
    const products = await response.json();

    // Filter only shoes
    const shoes = products.filter(product => {
      const hint = `${product.category || ''} ${product.subCategory || ''} ${product.title || ''}`.toLowerCase();
      return /\bshoes?\b/i.test(hint) || /\bsneakers?\b/i.test(hint) ||
             /\bfootwear\b/i.test(hint) || /\bboots?\b/i.test(hint) ||
             /\bsandals?\b/i.test(hint);
    });

    console.log(`Found ${shoes.length} total shoes`);

    // Get sent products from KV storage
    const sentProductIds = await getSentProductIds(env);
    console.log(`Already sent: ${sentProductIds.size} products`);

    // Find new shoes that haven't been sent
    const newShoes = shoes.filter(shoe => !sentProductIds.has(shoe.slug));

    if (newShoes.length === 0) {
      console.log('No new shoes to send');
      return;
    }

    console.log(`Found ${newShoes.length} new shoes to send`);

    // Send each new shoe to WhatsApp
    let successCount = 0;
    for (const shoe of newShoes) {
      const sent = await sendToWhatsApp(shoe, env);
      if (sent) {
        await markAsSent(shoe.slug, env);
        successCount++;
        // Add small delay to avoid rate limits
        await sleep(1000);
      }
    }

    console.log(`Successfully sent ${successCount} new shoes to WhatsApp`);

    // Update stats
    await updateStats(env, successCount);

  } catch (error) {
    console.error('Error in sendNewShoesToWhatsApp:', error);
    throw error;
  }
}

async function sendToWhatsApp(product, env) {
  try {
    // Calculate display price (same logic as your Cloudflare worker)
    const basePrice = Number(product.price || 0);
    const priceAdj = 550; // Shoe price adjustment
    const displayPrice = Math.max(0, basePrice + priceAdj);
    const displayMrp = product.mrp ? Math.max(0, Number(product.mrp) + priceAdj) : null;

    // Format product name
    const productName = product.title || product.slug_name || 'New Shoe';

    // Create product URL
    const productUrl = `https://thesolowardrobe.com/product/${product.slug}`;

    // Build simple message
    let message = `🆕 ${productName}\n`;
    message += `💰 ₹${displayPrice.toLocaleString('en-IN')}`;

    // Add discount if available
    if (displayMrp && displayMrp > displayPrice) {
      const discount = Math.round(((displayMrp - displayPrice) / displayMrp) * 100);
      message += ` (${discount}% OFF)`;
    }

    message += `\n🔗 ${productUrl}`;

    // Send via Twilio WhatsApp API
    const twilioAccountSid = env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppFrom = env.TWILIO_WHATSAPP_FROM; // e.g., "whatsapp:+14155238886"
    const whatsappBroadcastTo = env.WHATSAPP_BROADCAST_TO; // e.g., "whatsapp:+919876543210"

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('From', twilioWhatsAppFrom);
    formData.append('To', whatsappBroadcastTo);
    formData.append('Body', message);

    const authHeader = 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio API error:', error);
      return false;
    }

    const result = await response.json();
    console.log(`Sent: ${productName} - Message SID: ${result.sid}`);
    return true;

  } catch (error) {
    console.error(`Failed to send product ${product.slug}:`, error);
    return false;
  }
}

// KV Storage helpers
async function getSentProductIds(env) {
  const stored = await env.SENT_PRODUCTS.get('sent_ids', 'json');
  return new Set(stored || []);
}

async function markAsSent(productId, env) {
  const sentIds = await getSentProductIds(env);
  sentIds.add(productId);

  // Store as array (KV supports up to 25 MB per key)
  await env.SENT_PRODUCTS.put('sent_ids', JSON.stringify([...sentIds]));

  // Also store individual timestamp for tracking
  await env.SENT_PRODUCTS.put(`sent:${productId}`, new Date().toISOString());
}

async function getStats(env) {
  const stats = await env.SENT_PRODUCTS.get('stats', 'json') || {
    totalSent: 0,
    lastRun: null
  };
  const sentIds = await getSentProductIds(env);
  return {
    totalProductsSent: sentIds.size,
    lastRun: stats.lastRun,
    lifetimeSent: stats.totalSent
  };
}

async function updateStats(env, newCount) {
  const stats = await env.SENT_PRODUCTS.get('stats', 'json') || {
    totalSent: 0,
    lastRun: null
  };

  stats.totalSent += newCount;
  stats.lastRun = new Date().toISOString();

  await env.SENT_PRODUCTS.put('stats', JSON.stringify(stats));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
