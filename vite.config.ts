import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // GitHub Pages sirve el proyecto bajo /<repo>/. El workflow define
  // VITE_BASE_PATH en el build; en local se queda en la raiz.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssTarget: 'chrome111',
    // El chunk de Monaco pesa ~1 MB gzip, pero se carga bajo demanda:
    // el JS inicial de la app se queda en ~120 KB gzip.
    chunkSizeWarningLimit: 4500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('monaco-editor')) return 'monaco';
          if (id.includes('react') || id.includes('scheduler')) return 'react';
          if (id.includes('lucide-react')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});