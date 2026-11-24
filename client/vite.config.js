import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React app (5173) proxies API + WebSocket traffic to Express (5000),
// so the browser sees a single origin and no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
