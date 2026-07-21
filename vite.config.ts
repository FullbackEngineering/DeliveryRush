import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Delivery Rush — Vite config.
// Production source lives under src/ and is emitted to dist/.
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    allowedHosts: ['epidural-suffix-slingshot.ngrok-free.dev'],
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
