UPI QR Auto-Verification (Minimal)

What this is
- A tiny Node/Express service to:
  - Create orders and generate dynamic UPI QR codes per order
  - Receive bank SMS (forwarded via an Android “SMS to Webhook” app) and auto-mark orders as PAID when amount + note match
  - Persist orders and payments in local JSON files

Quick start
1) Copy .env.example to .env and set your UPI ID and name

   UPI_ID=yourhandle@upi
   UPI_NAME=Your Store

2) Install and run (Node 18+)

   # Windows PowerShell
   npm install --omit=dev
   $env:NODE_ENV="production"; npm start

3) Create an order (amount in rupees)

   curl -X POST http://localhost:3000/orders \
     -H "Content-Type: application/json" \
     -d '{"amount":799}'

   Response:
   {
     "orderId": "ORD-...",
     "upiLink": "upi://pay?...",
     "qr": "/qrs/ORD-....png",
     "status": "PENDING"
   }

   Open http://localhost:3000/qrs/ORD-....png to view the QR.

Production build (Docker)
- This repo includes a production-ready Dockerfile.

   docker build -t upi-qr .
   docker run --rm -p 3000:3000 --env-file .env upi-qr

   Then visit http://localhost:3000/health

Pre-configured UPI (as per your request)
- .env already contains:

   UPI_ID=6355875881-2@ybl
   UPI_NAME=Sahil Yadav

4) Forward bank SMS to the webhook
- Install any “SMS to Webhook” app on Android
- Configure it to POST JSON to: http://YOUR_SERVER/webhooks/sms
- Body example (most apps can send custom JSON template):

   {"text":"INR 799.00 received via UPI Ref ORD-20240901-ABCD"}

   The server will parse amount and try to find an orderId from the message.

5) Check order status

   curl http://localhost:3000/orders/ORD-...

Files
- src/server.js: Express server, routes, and logic
- src/upi.js: Builds UPI deep links; formats amounts
- src/parsers/sms.js: Simple, adjustable patterns to parse SMS
- src/utils/fsdb.js: Tiny JSON file persistence layer
- public/qrs/: Generated QR images
- data/orders.json, data/payments.json: Created at runtime
 - Note: QR filenames include amount for versioning (e.g., ORD-...-79900.png)

Security notes
- Only accept payments to your own UPI handle set in .env
- Use strong, unique order IDs (already done)
- Keep payment logs (payments.json) for audit/trace
- Protect SMS webhook with WEBHOOK_SECRET (header X-Webhook-Secret) and built-in rate limiting
- Enable STRICT_UPI_ID_MATCH=true if your bank SMS includes your VPA to prevent spoofed texts

Partial payments
- If paid amount < remaining balance, the server marks the order PARTIAL, generates a new QR for the remaining amount, and updates fields:
  - currentQr, currentUpiLink, remainingPaise, paidPaise, status
- Poll GET /orders/:id every few seconds on the client to swap in the new QR automatically.

Environment
- UPI_ID (required): your VPA
- UPI_NAME (required): display name
- WEBHOOK_SECRET (recommended): shared secret for /webhooks/sms (header X-Webhook-Secret)
- STRICT_UPI_ID_MATCH (optional): set to true to require your UPI_ID to be present in incoming SMS text

Gmail option (outline)
- If your bank sends emails for credits, you can poll Gmail via the Gmail API and POST the parsed messages to the same /webhooks/sms endpoint with a body containing a concatenated text, or build a /webhooks/email endpoint mirroring the SMS logic.
- Libraries: googleapis (Node). Steps: create OAuth client, use Gmail “messages.list” with from/bank filters, fetch message, extract plain text, parse amount + note with the same regex, POST internally into the matcher.

Customization
- Adjust regexes in src/parsers/sms.js to match your bank’s SMS format precisely.
- Change orderId format in src/server.js if needed.
- Serve QR files behind auth or signed URLs in production.
