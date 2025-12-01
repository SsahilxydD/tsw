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

// CSS preload plugin disabled - was causing render issues
// Vite's default CSS handling is sufficient

// Vite config tuned for VPS/nginx deploys at root domain
export default defineConfig({
  plugins: [
    react(),
    // Copy all original files from src/assets into dist/assets alongside hashed outputs.
    copyExtraAssets({ from: 'src/assets', to: 'assets' })
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
        // Manual chunk splitting for optimal loading
        manualChunks: (id) => {
          // Vendor chunks - split heavy libraries
          if (id.includes('node_modules')) {
            // React core - needed everywhere
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react';
            }
            // Router - needed for navigation
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Animation library - can load later
            if (id.includes('framer-motion') || id.includes('motion')) {
              return 'vendor-motion';
            }
            // Toast notifications
            if (id.includes('react-toastify')) {
              return 'vendor-toast';
            }
            // Other vendor code
            return 'vendor';
          }
          // Let Vite handle page chunks automatically via dynamic imports
        }
      }
    }
  }
})
