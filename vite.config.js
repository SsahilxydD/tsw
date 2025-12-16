import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function copyDir(src, dest, { skipIfExists = false } = {}) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, { skipIfExists });
    else {
      if (skipIfExists && fs.existsSync(d)) continue;
      fs.copyFileSync(s, d);
    }
  }
}

// Minimal, dependency-free copy plugin to ship unreferenced assets
function copyExtraAssets({ from = 'src/assets', to = 'assets' } = {}) {
  let outDir = 'dist';
  return {
    name: 'copy-extra-assets',
    apply: 'build',
    configResolved(cfg) { outDir = cfg.build.outDir || 'dist'; },
    closeBundle() {
      try {
        const src = path.resolve(process.cwd(), from);
        const dest = path.resolve(process.cwd(), outDir, to);
        // Do NOT remove existing hashed assets under dist/assets; just add originals.
        fs.mkdirSync(dest, { recursive: true });
        copyDir(src, dest, { skipIfExists: true });
      } catch {}
    }
  };
}

// Plugin to convert render-blocking CSS to preload + async load
function cssPreloadPlugin() {
  return {
    name: 'css-preload',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      // Find CSS link tags and convert to preload pattern
      return html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
        (match, href) => {
          // Add preload link + non-blocking stylesheet load
          return `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="${href}"></noscript>`;
        }
      );
    }
  };
}

// Vite config tuned for VPS/nginx deploys at root domain
export default defineConfig({
  plugins: [
    react(),
    // Copy all original files from src/assets into dist/assets alongside hashed outputs.
    copyExtraAssets({ from: 'src/assets', to: 'assets' }),
    // Convert CSS to non-render-blocking preload pattern
    cssPreloadPlugin()
  ],
  base: '/',   // IMPORTANT: ensures assets load correctly at thesolowardrobe.com/
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Split vendor libraries for better caching and reduce unused code
        manualChunks: (id) => {
          // Split node_modules into separate chunks
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            // Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Framer Motion - heavy library, split out
            if (id.includes('framer-motion') || id.includes('@use-gesture')) {
              return 'vendor-motion';
            }
            // UI libraries
            if (id.includes('react-toastify')) {
              return 'vendor-ui';
            }
            // Other vendor code
            return 'vendor-other';
          }
          // Split slider components into their own chunk for code splitting
          if (id.includes('src/components/HeroSlider.jsx') || 
              id.includes('src/components/AllCategoriesSlider.jsx') || 
              id.includes('src/components/DiscountedSlider.jsx')) {
            return 'sliders';
          }
        }
      }
    }
  }
})
