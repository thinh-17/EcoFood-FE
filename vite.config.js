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
    // @thinh-17/fe-core is linked in from ../EcoFood-FEcore (see
    // package.json), which has its own react/react-dom in its own
    // node_modules — without dedupe, Vite can resolve two separate React
    // instances and hooks break ("Invalid hook call") even though the code
    // looks fine. This forces both packages to share this app's own copy.
    dedupe: ['react', 'react-dom'],
  },
});