import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { ENV } from './config/env';
import { initDatabase } from './database/db';
import { initSocketServer } from './services/socketService';
import authRoutes from './routes/authRoutes';
import streamerRoutes from './routes/streamerRoutes';
import donationRoutes from './routes/donationRoutes';
import paywayRoutes from './routes/paywayRoutes';
import { errorHandler } from './middlewares/errorMiddleware';

const app = express();
const server = http.createServer(app);

// Initialize Database
initDatabase();

// Initialize Socket.IO
initSocketServer(server);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static sounds & public assets
app.use('/sounds', express.static(path.join(__dirname, '../public/sounds')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/streamer', streamerRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/payway', paywayRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'StreamNeon.vip Core API',
    time: new Date().toISOString()
  });
});

// Serve frontend client from client/dist if present
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // Single Page Application (SPA) fallback for all page routes (/, /dashboard, /overlay/*, /donate/*, etc.)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/sounds') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // If client/dist is not built yet, redirect to Vite development server
  app.get('/', (req, res) => {
    res.redirect(ENV.CLIENT_URL);
  });
}

// Error handling
app.use(errorHandler);

// Start Server
const PORT = Number(ENV.PORT) || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ [streambotkh.com] Server running on http://localhost:${PORT}`);
  console.log(`⚡ [streambotkh.com] PayWay Webhook Endpoint: http://localhost:${PORT}/api/payway/webhook`);
});

export default app;
