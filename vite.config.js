import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss()],

    // allows *.localhost subdomains for local tenant testing
    server: {
      allowedHosts: ['.localhost'],
      // Optional same-origin Guest API for phone/LAN development. Private API calls are unchanged.
      proxy: env.VITE_PUBLIC_API_BASE_URL === '/' ? {
        '/api/v1/public/receipts': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8081',
          changeOrigin: true,
        },
      } : undefined,
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
