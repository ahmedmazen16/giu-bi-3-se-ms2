import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api requests to the Node.js backend on port 4000,
// so the frontend can call fetch('/api/...') with no CORS configuration.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
