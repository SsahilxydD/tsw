# Cache Headers Setup Guide

This guide will help you fix the "Use efficient cache lifetimes" issue from PageSpeed Insights.

## Problem

- `/hero.webp` (5.6MB) has only 4 hours cache TTL
- Static assets need longer cache lifetimes
- Estimated savings: 3,862 KiB

## Solution

Add proper cache headers to your nginx configuration.

## Step 1: SSH into Your VPS

```bash
ssh root@srv952597
```

## Step 2: Backup Current Nginx Config

```bash
cp /etc/nginx/sites-available/thesolowardrobe.com /etc/nginx/sites-available/thesolowardrobe.com.backup
```

## Step 3: Edit Nginx Configuration

```bash
nano /etc/nginx/sites-available/thesolowardrobe.com
```

## Step 4: Add Cache Headers

Add the following location blocks **before** your existing `location /` block:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name thesolowardrobe.com www.thesolowardrobe.com;

    # SSL configuration (your existing SSL setup)
    # ...

    root /var/www/tsw/dist;
    index index.html;

    # ============================================
    # CACHE HEADERS - Add these blocks
    # ============================================

    # Cache images with long lifetime (1 year)
    location ~* \.(jpg|jpeg|png|gif|ico|webp|svg|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Cache hero.webp specifically (large file, should cache long)
    location = /hero.webp {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Cache fonts with long lifetime
    location ~* \.(woff|woff2|ttf|otf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Cache CSS and JS with long lifetime
    location ~* \.(css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Cache JSON data files - shorter cache for data that might change
    location ~* \.(json)$ {
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # Cache manifest and other web app files
    location ~* \.(webmanifest|xml|txt)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache static assets directory (already hashed files)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Cache favicon and other root assets
    location ~* ^/(favicon\.png|robots\.txt|sitemap\.xml|manifest\.webmanifest)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ============================================
    # Your existing location blocks below
    # ============================================

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
}
```

## Step 5: Test Nginx Configuration

```bash
nginx -t
```

You should see:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## Step 6: Reload Nginx

```bash
systemctl reload nginx
```

## Step 7: Verify Cache Headers

Test that cache headers are working:

```bash
curl -I https://thesolowardrobe.com/hero.webp | grep -i cache
```

You should see:
```
Cache-Control: public, immutable
```

And check the `Expires` header shows a date 1 year in the future.

## Expected Results

After applying these changes:

- ✅ `/hero.webp` will have 1 year cache (instead of 4 hours)
- ✅ All images will cache for 1 year
- ✅ CSS/JS files will cache for 1 year
- ✅ Fonts will cache for 1 year
- ✅ JSON files will cache for 1 hour (data might change)
- ✅ Estimated savings: ~3,862 KiB

## Additional Optimization: Compress hero.webp

The `/hero.webp` file is 5.6MB which is very large. Consider:

1. **Optimize the image** using tools like:
   - [Squoosh](https://squoosh.app/)
   - [ImageOptim](https://imageoptim.com/)
   - `cwebp` command line tool

2. **Target size**: Try to get it under 500KB-1MB for mobile

3. **Use responsive images**: Consider serving different sizes for mobile vs desktop

## Troubleshooting

### Cache headers not showing?

1. Check nginx config syntax: `nginx -t`
2. Check nginx error log: `tail -f /var/log/nginx/error.log`
3. Clear browser cache and test again
4. Use incognito/private browsing mode

### Images still not caching?

1. Verify the location blocks are in the correct order (more specific first)
2. Check that the file paths match your actual file structure
3. Ensure nginx was reloaded: `systemctl status nginx`

## Cloudflare Cache Settings

If you're using Cloudflare, also check:

1. **Caching Level**: Set to "Standard" or "Aggressive"
2. **Browser Cache TTL**: Set to "Respect Existing Headers" or "1 year"
3. **Auto Minify**: Enable for CSS, JS, HTML

---

**Note**: The cache configuration file `nginx-cache-config.conf` is included in this project for reference.

