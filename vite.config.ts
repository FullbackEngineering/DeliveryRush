import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Delivery Rush — Vite config.
// The repo root also contains reference-only folders (book-of-game, game-promt,
// game-example-foto). They are never imported, so Vite happily ignores them.
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
