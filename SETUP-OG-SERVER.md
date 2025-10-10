# Setup OG Meta Tags Server on VPS

Since Vercel API functions aren't working with the Vite SPA setup, here's a simple solution using your existing VPS.

## Step 1: Setup the OG Server on VPS

```bash
# SSH into your VPS
ssh root@srv952597

# Navigate to your web directory
cd /var/www/tsw

# Copy the og-server files (or clone the repo)
# Make sure og-server.js and og-server-package.json are present

# Rename package.json
mv og-server-package.json package-og.json

# Install dependencies
npm install --prefix . express

# Test the server
node og-server.js
```

The server will run on port 3001.

## Step 2: Configure Nginx to Proxy Product Pages

Edit your Nginx config (usually at `/etc/nginx/sites-available/thesolowardrobe.com`):

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name thesolowardrobe.com www.thesolowardrobe.com;

    # SSL configuration (your existing SSL setup)
    # ...

    root /var/www/tsw/dist;
    index index.html;

    # Special handling for product pages (for social media crawlers)
    location ~* ^/product/(.+)$ {
        # Check if the request is from a bot/crawler
        if ($http_user_agent ~* (facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|SkypeUriPreview)) {
            proxy_pass http://localhost:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            break;
        }

        # For regular users, serve the SPA
        try_files $uri /index.html;
    }

    # All other requests serve the SPA
    location / {
        try_files $uri /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Step 3: Run the Server with PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start the OG server
pm2 start og-server.js --name og-meta-server

# Make it start on boot
pm2 startup
pm2 save
```

## Step 4: Reload Nginx

```bash
# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx
```

## Step 5: Test

```bash
# Test from your VPS
curl -A "facebookexternalhit/1.1" "https://thesolowardrobe.com/product/5487546952058530185" | grep "og:title"
```

You should see:
```html
<meta property="og:title" content="Men Black Sneaker Shoes – Solo Wardrobe" />
```

## How It Works

1. **Regular users**: Access `/product/123` → Nginx serves the SPA (React app)
2. **Social media bots**: Access `/product/123` → Nginx proxies to Node server → Gets HTML with OG tags
3. **Result**: Social media sees product-specific meta tags, users see your fast SPA!

## Troubleshooting

- Check server logs: `pm2 logs og-meta-server`
- Check if server is running: `pm2 status`
- Test locally: `curl http://localhost:3001/product/5487546952058530185`
- Check Nginx errors: `tail -f /var/log/nginx/error.log`
