import dotenv from 'dotenv';
const cliPort = process.env.PORT;
dotenv.config({ override: true });
if (cliPort) {
  process.env.PORT = cliPort;
}

import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { NextRequest } from 'next/server';
import { initMongo, cleanupExpiredPendingDonationsMongo, cleanupOlderDonationsMongo, processExpiredAccountDeletions, processPlanExpirationsAndReminders, pruneOldSessionLogsMongo } from '../src/server/database/mongo';
import { initSocketServer } from '../src/server/services/socketService';
import { globalRateLimiterMiddleware, isIpBlockedAsync, getClientIp, renderBlockedHtmlPage } from '../src/server/utils/rateLimiter';

const app = express();
app.set('trust proxy', true);
const server = http.createServer({ maxHeaderSize: 65536 }, app);

// Keep-alive timeouts to prevent idle connection stalls
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// CORS configuration: allow OBS Studio, local development, and configured production origins
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [])
].filter(Boolean);

app.use(cors({
  origin: (requestOrigin, callback) => {
    // Requests with no origin (e.g. mobile apps, curl, OBS Browser Source)
    if (!requestOrigin || requestOrigin === 'null') {
      return callback(null, true);
    }

    try {
      const parsed = new URL(requestOrigin);
      // Whitelist local development ports
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return callback(null, true);
      }

      // Whitelist configured production / deployment domains
      const isAllowed = allowedOrigins.some(ao => {
        try {
          return new URL(ao!).host.toLowerCase() === parsed.host.toLowerCase();
        } catch {
          return false;
        }
      });

      if (isAllowed) {
        return callback(null, true);
      }
    } catch (e) {}

    // Disallow unknown external origins from making credentialed requests
    return callback(new Error(`CORS blocked for untrusted origin: ${requestOrigin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// 0. Global Rate Limiter & Anti-Flood Shield (protects against DDoS, scraping, and brute force)
app.use(globalRateLimiterMiddleware({
  windowMs: 60000,
  maxRequests: 180,
  autoBanThreshold: 350
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Assets
const publicDir = path.resolve(process.cwd(), 'public');
app.use('/sounds', express.static(path.join(publicDir, 'sounds'), { maxAge: '7d' })); // long-lived cache for fast soundboard playback
app.use('/fonts', express.static(path.join(publicDir, 'fonts')));
app.use('/uploads', express.static(path.join(publicDir, 'uploads')));
app.use('/assets', express.static(path.join(publicDir, 'assets')));

/**
 * Adapter bridging Express Request/Response to Next.js Web standard Request/Response handlers
 */
function createRouteHandler(fullPath: string, method: string) {
  return async (req: express.Request, res: express.Response) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        try {
          for (const key of Object.keys(require.cache)) {
            if (key.includes('/src/server/services/ttsService')) {
              delete require.cache[key];
            }
          }
          delete require.cache[require.resolve(fullPath)];
        } catch (e) {}
      }
      const module = require(fullPath);
      const handler = module[method];
      if (typeof handler !== 'function') {
        return res.status(405).json({ error: `Method ${method} not allowed on ${req.originalUrl}` });
      }

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
        if (contentType.includes('multipart/form-data')) {
          body = req;
        } else if (contentType.includes('application/json')) {
          body = JSON.stringify(req.body ?? {});
          headers.delete('content-length');
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          body = new URLSearchParams(req.body ?? {}).toString();
          headers.delete('content-length');
        } else if (req.body !== undefined) {
          body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
          headers.delete('content-length');
        }
      }

      const nextReq = new NextRequest(url, {
        method: req.method,
        headers,
        body: body || undefined,
        ...(body === req ? { duplex: 'half' } : {})
      } as any);

      // Safety timeout: prevent hanging API handlers from exhausting browser sockets
      let timeoutHandle: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`API request timed out after 15s on ${req.method} ${req.originalUrl}`));
        }, 15000);
      });

      const nextRes = await Promise.race([
        handler(nextReq, { params: req.params }),
        timeoutPromise
      ]);

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (!nextRes) {
        return res.status(204).end();
      }

      const location = nextRes.headers.get('location');
      if (location && nextRes.status >= 300 && nextRes.status < 400) {
        return res.redirect(nextRes.status, location);
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

const mountedRoutesList: string[] = [];
const routeLoadErrors: { file: string; error: string; stack?: string }[] = [];

/**
 * Scan src/app/api recursively and mount each route file onto Express
 */
function scanAndMountRoutes(dir: string, baseRoute = '/api') {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️ [API Scanner] Directory does not exist: ${dir}`);
    return;
  }

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
            app[expressMethod](baseRoute, createRouteHandler(fullPath, m));
            mountedRoutesList.push(`${m} ${baseRoute}`);
          }
        }
      } catch (err: any) {
        console.error(`❌ Failed to load API route at ${fullPath}:`, err?.message || err);
        routeLoadErrors.push({
          file: path.relative(process.cwd(), fullPath),
          error: err?.message || String(err),
          stack: err?.stack
        });
      }
    }
  }
}

// 1. Initialize MongoDB Atlas (100% MongoDB)
initMongo();

// 2. Attach Socket.IO
initSocketServer(server);

// 3. Mount all API routes
const apiDirectoryCandidates = [
  path.resolve(__dirname, '../src/app/api'),
  path.resolve(process.cwd(), 'src/app/api'),
  path.resolve('/var/www/StreamBotKH/src/app/api')
];
const apiDirectory = apiDirectoryCandidates.find((d) => fs.existsSync(d)) || path.resolve(process.cwd(), 'src/app/api');
scanAndMountRoutes(apiDirectory, '/api');

// Ensure unmatched /api/* routes return JSON 404 instead of HTML
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// 4. Background Workers: Expired Pending Donations, Account Deletions, Pro Plan Midnight Expiration & 3-Day Reminders, 6-Month Retention Cleanup, Daily Session Log Pruner
cleanupExpiredPendingDonationsMongo();
cleanupOlderDonationsMongo(6);
processExpiredAccountDeletions();
processPlanExpirationsAndReminders();
pruneOldSessionLogsMongo();
setInterval(() => {
  cleanupExpiredPendingDonationsMongo();
  cleanupOlderDonationsMongo(6);
  processExpiredAccountDeletions();
  processPlanExpirationsAndReminders();
  pruneOldSessionLogsMongo();
}, 30 * 1000);

// Health check endpoint
app.get('/health', (_req, res) => {
  let gitCommit = 'unknown';
  let gitDate = 'unknown';
  try {
    const { execSync } = require('child_process');
    gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8', timeout: 2000 }).trim();
    gitDate = execSync('git log -1 --format=%cd', { encoding: 'utf-8', timeout: 2000 }).trim();
  } catch (e) {}

  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    gitCommit,
    gitDate,
    mountedRoutesCount: mountedRoutesList.length,
    mountedRoutes: mountedRoutesList,
    routeErrors: routeLoadErrors
  });
});

// 5. Production Static Frontend (serve dist/ from Vite build)
const candidateDirs = [
  path.resolve(__dirname, '../dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve('/var/www/StreamBotKH/dist')
];
const distDir = candidateDirs.find((d) => fs.existsSync(d) && fs.existsSync(path.join(d, 'index.html')));

if (distDir) {
  console.log(`⚡ [StreamBotKH Web] Found compiled React SPA at: ${distDir}`);
  app.use(express.static(distDir, { maxAge: '1h', index: 'index.html' }));

  // SPA fallback for all non-API routes
  app.use(async (req, res, next) => {
    if (
      (req.method !== 'GET' && req.method !== 'HEAD') ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/sounds') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io')
    ) {
      return next();
    }
    const clientIp = getClientIp(req);
    const blockStatus = await isIpBlockedAsync(clientIp);
    if (blockStatus.blocked) {
      return res.status(403).send(renderBlockedHtmlPage(clientIp, blockStatus.reason));
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  console.warn('⚠️ [StreamBotKH Web] dist/index.html not found! Run "npm run build" to build React frontend.');
  app.get('/', (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>StreamWidgets Core API</title>
        </head>
        <body style="background:#070A12;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;padding:60px 20px;text-align:center;">
          <h1 style="color:#00F0FF;margin-bottom:8px;">⚡ StreamWidgets Server Active</h1>
          <p style="color:#94a3b8;font-size:16px;">Core API & Socket.IO are running successfully on port ${process.env.PORT || '5173'}.</p>
          <div style="margin:30px auto;max-width:500px;background:#0d1322;border:1px solid #1e293b;border-radius:12px;padding:20px;text-align:left;">
            <p style="color:#f59e0b;font-weight:bold;margin-top:0;">Notice: Frontend assets not built yet</p>
            <p style="color:#cbd5e1;font-size:14px;">To serve the full React web dashboard, run this in your server terminal:</p>
            <pre style="background:#05070d;padding:12px;border-radius:8px;color:#38bdf8;font-size:14px;overflow-x:auto;">npm run build</pre>
          </div>
          <p><a href="/api/overlays" style="color:#00F0FF;text-decoration:none;font-weight:600;">Test API Endpoint &rarr; /api/overlays</a></p>
        </body>
      </html>
    `);
  });
}

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ [Server Error]:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// Port configuration: Always prioritize process.env.PORT
const PORT = parseInt(process.env.PORT || '5173', 10);
const HOST = '0.0.0.0'; // Bound to all interfaces for universal reachability

server.listen(PORT, HOST, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⚡ [StreamBotKH Core API] Running on http://${HOST}:${PORT}`);
  console.log(`⚡ [StreamBotKH OBS Socket.IO] ws://${HOST}:${PORT}/socket.io`);
  if (distDir) {
    console.log(`⚡ [StreamBotKH Web] Production React SPA served from ${distDir}`);
  } else {
    console.log(`⚡ [StreamBotKH Web] Development Vite frontend active at http://localhost:5173`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

export default server;
