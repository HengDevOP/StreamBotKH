import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import next from 'next';
import { parse } from 'url';
import { initDatabase, cleanupExpiredPendingDonations } from './src/server/database/db';
import { initMongo } from './src/server/database/mongo';
import { initSocketServer } from './src/server/services/socketService';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5173', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

process.on('uncaughtException', (err) => {
  console.error('⚡ [Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚡ [Server] Unhandled Rejection:', reason);
});

app.prepare().then(() => {
  // 1. Initialize Databases & safe migrations
  initDatabase();
  initMongo();

  // 2. Create HTTP Server for Next.js
  const server = http.createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ [Server] Port ${port} is already in use. Please free port ${port} or choose another port.`);
    } else {
      console.error('❌ [Server] HTTP server error:', err);
    }
  });

  // 3. Mount Socket.IO directly onto the same HTTP server
  initSocketServer(server);

  // 4. Recurring 5-Minute Cache Duration Expiration Timer (Runs every 30s to clear stale pending sessions)
  cleanupExpiredPendingDonations();
  setInterval(() => {
    cleanupExpiredPendingDonations();
  }, 30 * 1000);

  server.listen(port, () => {
    console.log(`⚡ [streambotkh.com] Next.js Full-Stack App running on http://${hostname}:${port}`);
    console.log(`⚡ [streambotkh.com] Real-time OBS Socket.IO active at ws://${hostname}:${port}/socket.io`);
    console.log(`⚡ [streambotkh.com] Try donation route: http://${hostname}:${port}/@neonstreamer`);
  });

  const shutdown = () => {
    console.log('\n⚡ [Server] Gracefully shutting down...');
    server.close(() => {
      console.log('⚡ [Server] Closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}).catch((err) => {
  console.error('❌ [Server] Failed to prepare Next.js app:', err);
  process.exit(1);
});
