import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { NextRequest } from 'next/server';
import { initDatabase, cleanupExpiredPendingDonations } from '../src/server/database/db';
import { initMongo } from '../src/server/database/mongo';
import { initSocketServer } from '../src/server/services/socketService';

const app = express();
const server = http.createServer(app);

// CORS support for OBS Studio, external origins & Vite dev server
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Assets
const publicDir = path.resolve(process.cwd(), 'public');
app.use('/sounds', express.static(path.join(publicDir, 'sounds')));
app.use('/uploads', express.static(path.join(publicDir, 'uploads')));

/**
 * Adapter bridging Express Request/Response to Next.js Web standard Request/Response handlers
 */
function createRouteHandler(handler: Function) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.get('host') || 'localhost';
      const url = `${protocol}://${host}${req.originalUrl}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
        }
      }

      let body: any = undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          body = JSON.stringify(req.body);
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          body = new URLSearchParams(req.body).toString();
        } else {
          body = JSON.stringify(req.body);
        }
      }

      const nextReq = new NextRequest(url, {
        method: req.method,
        headers,
        body: body || undefined
      });

      const nextRes = await handler(nextReq, { params: req.params });

      if (!nextRes) {
        return res.status(204).end();
      }

      res.status(nextRes.status || 200);
      nextRes.headers.forEach((val: string, key: string) => {
        res.setHeader(key, val);
      });

      const arrayBuffer = await nextRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.error(`❌ [Express API Error] ${req.method} ${req.originalUrl}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
      }
    }
  };
}

/**
 * Scan src/app/api recursively and mount each route file onto Express
 */
function scanAndMountRoutes(dir: string, baseRoute = '/api') {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // Sort: dynamic param routes like [:id] should be registered AFTER static routes
  entries.sort((a, b) => {
    const aIsParam = a.name.startsWith('[');
    const bIsParam = b.name.startsWith('[');
    if (aIsParam && !bIsParam) return 1;
    if (!aIsParam && bIsParam) return -1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const part = entry.name.startsWith('[') && entry.name.endsWith(']')
        ? `:${entry.name.slice(1, -1)}`
        : entry.name;
      scanAndMountRoutes(fullPath, `${baseRoute}/${part}`);
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      try {
        const module = require(fullPath);
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

        for (const m of methods) {
          if (typeof module[m] === 'function') {
            const expressMethod = m.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
            app[expressMethod](baseRoute, createRouteHandler(module[m]));
          }
        }
      } catch (err: any) {
        console.error(`❌ Failed to load API route at ${fullPath}:`, err.message);
      }
    }
  }
}

// 1. Initialize Databases
initDatabase();
initMongo();

// 2. Attach Socket.IO
initSocketServer(server);

// 3. Mount all API routes
const apiDirectory = path.resolve(process.cwd(), 'src/app/api');
scanAndMountRoutes(apiDirectory, '/api');

// 4. Background Expired Pending Donations Cleanup (runs every 30s)
cleanupExpiredPendingDonations();
setInterval(() => {
  cleanupExpiredPendingDonations();
}, 30 * 1000);

// 5. Production Static Frontend (serve dist/ from Vite build)
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  // SPA fallback for all non-API routes (catch-all middleware)
  app.use((req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/sounds') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io')
    ) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ [Server Error]:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Port configuration
// In production or when running stand-alone: PORT from env or 5173
// In dev: Backend runs on 5001, Vite runs on 3000
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.API_PORT || (isProd ? (process.env.PORT || '3000') : '5001'), 10);
const HOST = '0.0.0.0'; // Bound to all interfaces for universal reachability

server.listen(PORT, HOST, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⚡ [StreamBotKH Core API] Running on http://${HOST}:${PORT}`);
  console.log(`⚡ [StreamBotKH OBS Socket.IO] ws://${HOST}:${PORT}/socket.io`);
  if (isProd && fs.existsSync(distDir)) {
    console.log(`⚡ [StreamBotKH Web] Production React SPA served from /dist`);
  } else {
    console.log(`⚡ [StreamBotKH Web] Development Vite frontend active at http://localhost:3000`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

export default server;
