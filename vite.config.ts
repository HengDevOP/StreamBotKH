import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (
            req.url &&
            req.url.startsWith('/@') &&
            !req.url.startsWith('/@vite') &&
            !req.url.startsWith('/@react-refresh') &&
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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // Accessible from any network IP / LAN / VPS
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
      '/uploads': {
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
