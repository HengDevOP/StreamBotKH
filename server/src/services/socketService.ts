import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { ENV } from '../config/env';

let io: SocketIOServer | null = null;

export interface AlertPayload {
  donationId: string;
  donorName: string;
  donorMessage?: string;
  amount: number;
  currency: string;
  bankingName?: string;
  templateStyle?: string;
  glowColor?: string;
  soundUrl?: string;
  soundVolume?: number;
  durationSeconds?: number;
  ttsEnabled?: boolean;
  ttsVoice?: string;
  customGifUrl?: string;
  isTest?: boolean;
}

export function initSocketServer(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Allow OBS browser sources and web clients from anywhere
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    // OBS overlay joins room using overlay_token
    socket.on('join:overlay', (data: { overlayToken: string }) => {
      if (data?.overlayToken) {
        socket.join(`overlay:${data.overlayToken}`);
        console.log(`[Socket] Overlay connected for token: ${data.overlayToken.slice(0, 10)}... (Socket ID: ${socket.id})`);
        socket.emit('overlay:connected', { status: 'ready', message: 'StreamNeon overlay connected successfully' });
      }
    });

    // Streamer dashboard joins room using streamerId
    socket.on('join:dashboard', (data: { streamerId: string }) => {
      if (data?.streamerId) {
        socket.join(`dashboard:${data.streamerId}`);
        console.log(`[Socket] Dashboard connected for streamerId: ${data.streamerId}`);
      }
    });

    // Test alert trigger from dashboard
    socket.on('trigger:test_alert', (payload: AlertPayload & { overlayToken: string }) => {
      if (payload?.overlayToken) {
        console.log(`[Socket] Triggering test alert for overlay token: ${payload.overlayToken}`);
        io?.to(`overlay:${payload.overlayToken}`).emit('donation:alert', {
          ...payload,
          isTest: true
        });
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function broadcastAlertToOverlay(overlayToken: string, payload: AlertPayload) {
  if (!io) {
    console.warn('[Socket] Socket server not initialized yet');
    return;
  }
  console.log(`[Socket] Broadcasting donation alert to overlay:${overlayToken.slice(0, 10)}...: ${payload.donorName} ($${payload.amount})`);
  io.to(`overlay:${overlayToken}`).emit('donation:alert', payload);
}

export function broadcastDonationToDashboard(streamerId: string, donation: any) {
  if (!io) return;
  io.to(`dashboard:${streamerId}`).emit('donation:new', donation);
}

export function getIO(): SocketIOServer | null {
  return io;
}
