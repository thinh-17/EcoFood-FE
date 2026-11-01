import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // allows *.localhost subdomains for local tenant testing
  server: {
    allowedHosts: ['.localhost'],
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});