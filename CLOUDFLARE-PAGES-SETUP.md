# 🚀 Cloudflare Pages Setup Guide

## Fix: Remove Deploy Command

The error you're seeing is because Cloudflare Pages has a custom deploy command set. **For static sites, you don't need a deploy command** - Pages automatically deploys your build output.

### How to Fix:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → Your Pages Project
3. Go to **Settings** → **Builds & deployments**
4. Find **"Deploy command"** field
5. **Delete/clear the value** (it should be empty)
6. Save changes

### Correct Settings for Your Project:

```
Build command: npm run build
Build output directory: dist
Deploy command: (leave empty)
Root directory: / (or leave empty)
Node version: 18 or 20
```

---

## Complete Setup Steps

### Step 1: Connect Repository to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**
3. Choose GitHub/GitLab and authorize
4. Select your repository

### Step 2: Configure Build Settings

```
Framework preset: None (or Vite if available)
Build command: npm run build
Build output directory: dist
Root directory: / (leave empty)
Node version: 18 or 20
```

**IMPORTANT:** Leave "Deploy command" **EMPTY**

### Step 3: Environment Variables (if needed)

If you use any `VITE_*` environment variables, add them in:
**Settings** → **Environment variables**

### Step 4: Custom Domain

1. Go to your Pages project → **Custom domains**
2. Add `thesolowardrobe.com`
3. Cloudflare will auto-configure DNS (since domain is already on Cloudflare)

### Step 5: Deploy

- Click **Save and Deploy**
- First deploy takes ~2 minutes
- Future `git push` auto-deploys in ~1-2 minutes

---

## Git Auto-Deployment

Once configured correctly:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Update site"
   git push origin main
   ```

2. **Cloudflare Pages automatically:**
   - Detects the push
   - Runs `npm install` and `npm run build`
   - Deploys the `dist` folder
   - Updates your live site in ~1-2 minutes

3. **Preview Deployments:**
   - Every PR gets a preview URL
   - Test before merging

---

## Workers vs Pages

**Important:** Workers and Pages are separate:

- **Cloudflare Pages** = Static site hosting (your React app)
  - Deploys automatically from Git
  - No deploy command needed
  - Just builds and serves `dist/` folder

- **Cloudflare Workers** = Serverless functions (your API endpoints)
  - Deploy separately using `wrangler deploy`
  - Not part of Pages build process
  - Set up routes in Cloudflare dashboard

---

## Troubleshooting

### Error: "Missing entry-point to Worker script"

**Cause:** Deploy command is set to `npx wrangler deploy`

**Fix:** Remove the deploy command in Pages settings (leave it empty)

### Build succeeds but deploy fails

**Cause:** Custom deploy command trying to deploy Workers

**Fix:** Clear the deploy command field in Pages settings

### Site not updating after git push

**Check:**
1. Build logs in Cloudflare Pages dashboard
2. Ensure build command is `npm run build`
3. Ensure output directory is `dist`
4. Check that deploy command is empty

---

## Next Steps: Deploy API Workers Separately

After your Pages site is working, deploy your API Workers separately:

1. Create Workers for `/api/products` and `/api/og-image`
2. Deploy them using `wrangler deploy` (locally or via CI/CD)
3. Set up routes in Cloudflare dashboard

See the Workers setup guide for details.

