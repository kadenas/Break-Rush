import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'spa',
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true
  }
});
