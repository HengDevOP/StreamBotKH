import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'at-username-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (
            req.url &&
            req.url.startsWith('/@') &&
            !req.url.startsWith('/@vite') &&
            !req.url.startsWith('/@fs') &&
            !req.url.startsWith('/@id') &&
            !req.url.includes('.')
          ) {
            req.url = '/index.html';
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true
      },
      '/sounds': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5001',
        ws: true
      }
    }
  }
});
