# WhatsApp Auto-Sender Setup Guide

This guide will help you set up automated hourly WhatsApp messages for new shoe products.

## 🎯 What This Does

- ✅ Checks for new shoes every hour automatically
- ✅ Sends product name, price, and link to WhatsApp
- ✅ Never sends the same product twice
- ✅ 100% free with Cloudflare (and Twilio sandbox for testing)
- ✅ No server needed - runs on Cloudflare Workers

---

## 📋 Prerequisites

1. A Cloudflare account (free tier works perfectly)
2. A Twilio account (free tier with sandbox for testing)
3. Node.js installed on your computer
4. Your WhatsApp Business phone number

---

## 🚀 Step-by-Step Setup

### STEP 1: Install Wrangler (Cloudflare CLI)

```bash
npm install -g wrangler
```

Verify installation:
```bash
wrangler --version
```

### STEP 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window - click "Allow" to authorize.

### STEP 3: Create KV Namespace (Storage for Sent Products)

```bash
wrangler kv:namespace create "SENT_PRODUCTS"
```

You'll see output like:
```
{ binding = "SENT_PRODUCTS", id = "abc123xyz456" }
```

**IMPORTANT:** Copy the `id` value and update `wrangler-whatsapp.toml`:
- Open `wrangler-whatsapp.toml`
- Replace `YOUR_KV_NAMESPACE_ID` with your actual ID

### STEP 4: Set Up Twilio WhatsApp (5 minutes)

#### 4a. Create Twilio Account
1. Go to: https://www.twilio.com/try-twilio
2. Sign up for free
3. Verify your phone number

#### 4b. Get WhatsApp Sandbox Access
1. In Twilio Console, go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. You'll see a sandbox number (e.g., `+1 415 523 8886`)
3. Send the join code from YOUR WhatsApp to activate sandbox
   - Example: Send "join <code>" to the sandbox number

#### 4c. Get Your Twilio Credentials
In Twilio Console Dashboard, find:
- **Account SID** (e.g., `AC1234567890abcdef`)
- **Auth Token** (click to reveal)
- **WhatsApp Sandbox Number** (e.g., `whatsapp:+14155238886`)

### STEP 5: Configure Environment Variables (Secrets)

Run these commands ONE BY ONE and paste your values when prompted:

```bash
# Your Twilio Account SID
wrangler secret put TWILIO_ACCOUNT_SID --config wrangler-whatsapp.toml

# Your Twilio Auth Token
wrangler secret put TWILIO_AUTH_TOKEN --config wrangler-whatsapp.toml

# Twilio's WhatsApp number (format: whatsapp:+14155238886)
wrangler secret put TWILIO_WHATSAPP_FROM --config wrangler-whatsapp.toml

# YOUR WhatsApp number where messages will be sent (format: whatsapp:+919876543210)
wrangler secret put WHATSAPP_BROADCAST_TO --config wrangler-whatsapp.toml
```

**Important Format Notes:**
- `TWILIO_WHATSAPP_FROM`: Must include `whatsapp:` prefix (e.g., `whatsapp:+14155238886`)
- `WHATSAPP_BROADCAST_TO`: Must include `whatsapp:` prefix and country code (e.g., `whatsapp:+919876543210` for India)

### STEP 6: Deploy to Cloudflare

```bash
wrangler deploy --config wrangler-whatsapp.toml
```

You'll see:
```
✨ Published whatsapp-auto-sender
   https://whatsapp-auto-sender.YOUR-SUBDOMAIN.workers.dev
```

🎉 **DONE!** Your automation is now live and will run every hour!

---

## 🧪 Testing Your Setup

### Test Immediately (Don't Wait for Hourly Cron)

Visit this URL in your browser (replace with your actual worker URL):
```
https://whatsapp-auto-sender.YOUR-SUBDOMAIN.workers.dev/send-now
```

You should:
1. See "Products checked and sent!" in browser
2. Receive WhatsApp messages for any new shoes

### Check Status

```
https://whatsapp-auto-sender.YOUR-SUBDOMAIN.workers.dev/status
```

Shows:
- Total products sent
- Last run time
- Statistics

### View Logs

```bash
wrangler tail --config wrangler-whatsapp.toml
```

Then trigger `/send-now` to see live logs.

---

## 📱 WhatsApp Broadcast Channel Setup

### For Twilio Sandbox (Testing - FREE):
- Messages go to ONE number only (the one you configured)
- Perfect for testing before going live

### For Production (Multiple Recipients):
You have two options:

#### Option A: Twilio WhatsApp Business API (Paid - $0.005/message)
1. Upgrade from sandbox to approved WhatsApp Business
2. Add multiple recipients by looping through numbers in code

#### Option B: WhatsApp Business API (Official - Free messages, harder setup)
1. Apply at: https://business.whatsapp.com/products/business-platform
2. Requires business verification
3. Takes 1-2 weeks for approval

**For Broadcast to Multiple Numbers:**
You'll need to modify the code to loop through recipients. Let me know when you're ready!

---

## 🔧 Customization

### Change Schedule
Edit `wrangler-whatsapp.toml`:
```toml
# Every hour
crons = ["0 * * * *"]

# Every 30 minutes
crons = ["*/30 * * * *"]

# Every 2 hours
crons = ["0 */2 * * *"]

# Specific times (9 AM and 6 PM daily)
crons = ["0 9 * * *", "0 18 * * *"]
```

Then redeploy:
```bash
wrangler deploy --config wrangler-whatsapp.toml
```

### Change Message Format
Edit `whatsapp-auto-sender.js` around line 88-96 to customize the message template.

### Filter Different Categories
Edit `whatsapp-auto-sender.js` around line 42-46 to filter different product categories.

---

## 🐛 Troubleshooting

### Issue: "No new shoes to send"
- **Cause:** All shoes have already been sent
- **Solution:** Clear KV storage to reset:
  ```bash
  wrangler kv:key delete sent_ids --binding SENT_PRODUCTS --config wrangler-whatsapp.toml
  ```

### Issue: "Twilio API error: 21608"
- **Cause:** WhatsApp number not in sandbox
- **Solution:** Send join code to Twilio sandbox number from your WhatsApp

### Issue: "Twilio API error: 20003"
- **Cause:** Invalid Twilio credentials
- **Solution:** Re-run `wrangler secret put` commands with correct values

### Issue: Messages not sending
- **Check logs:** `wrangler tail --config wrangler-whatsapp.toml`
- **Test manually:** Visit `/send-now` endpoint
- **Verify Twilio:** Check Twilio console for error messages

---

## 💰 Costs

### Cloudflare Workers (FREE tier includes):
- ✅ 100,000 requests/day
- ✅ 1000 cron triggers/day
- ✅ KV: 100,000 reads/day

Your hourly checks = **24 requests/day** → Well within free tier!

### Twilio WhatsApp:
- **Sandbox (Testing):** FREE
- **Production:** $0.005 per message (very cheap!)
  - Example: 100 products/month = $0.50

---

## 🔐 Security Notes

- ✅ Secrets stored securely in Cloudflare (never in code)
- ✅ Never commit `wrangler-whatsapp.toml` if it contains real credentials
- ✅ Twilio credentials are encrypted

---

## 📞 Support

If you need help:
1. Check Cloudflare Worker logs: `wrangler tail --config wrangler-whatsapp.toml`
2. Check Twilio logs: https://console.twilio.com/monitor/logs/
3. Test endpoint: `/send-now`
4. Check status: `/status`

---

## 🎯 Next Steps

Once testing works:
1. Let it run automatically every hour
2. Monitor via `/status` endpoint
3. Check Twilio usage dashboard
4. When ready for production, upgrade from Twilio sandbox

**Want to send to multiple numbers?** Let me know and I'll modify the code for broadcast!
