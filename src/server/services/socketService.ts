import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;
const recentOverlayAlerts = new Map<string, { payload: AlertPayload; timestamp: number }>();

export interface AlertPayload {
  id?: string;
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
  ttsType?: string;
  clonedVoiceSampleUrl?: string;
  customGifUrl?: string;
  mediaUrl?: string;
  showImage?: boolean;
  textTemplate?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  layoutMode?: string;
  animationStyle?: string;
  videoUrl?: string;
  videoTitle?: string;
  videoStartTime?: number;
  videoEndTime?: number;
  videoAlertEnabled?: boolean;
  videoMinTipAmount?: number;
  videoMaxDurationSeconds?: number;
  isSecondStageVideo?: boolean;
  upcomingVideo?: boolean;
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

        // If an alert was fired within the last 25 seconds, replay it to the newly connected overlay!
        const recent = recentOverlayAlerts.get(data.overlayToken) || recentOverlayAlerts.get('demo-token');
        if (recent && (Date.now() - recent.timestamp) < 25000) {
          console.log(`⚡ [Socket] Replaying recent alert to newly connected overlay (${data.overlayToken.slice(0, 10)}...)`);
          socket.emit('donation:alert', recent.payload);
        }
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
      const token = payload?.overlayToken || 'demo-token';
      console.log(`[Socket] Triggering test alert for overlay token: ${token}`);
      const testPayload = {
        ...payload,
        isTest: true
      };

      // Broadcast single alert event to target overlay room
      io?.to(`overlay:${token}`).emit('donation:alert', testPayload);

      // If token is specific, also send to demo-token room in case preview overlay uses demo-token
      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('donation:alert', testPayload);
      }
    });

    // Notify overlay room that a donation alert has finished so video sources can start immediately
    socket.on('overlay:alert_finished', (data: { donationId: string; overlayToken: string }) => {
      const token = data?.overlayToken || 'demo-token';
      console.log(`[Socket] Overlay alert finished for donation "${data?.donationId}" (Token: ${token})`);
      io?.to(`overlay:${token}`).emit('donation:alert_finished', data);
      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('donation:alert_finished', data);
      }
    });

    // Soundboard event triggers for OBS overlay & stream sync
    socket.on('soundboard:play', (payload: any) => {
      const token = payload?.overlayToken || payload?.token || 'demo-token';
      console.log(`[Socket] Soundboard play event: "${payload?.title || payload?.soundId}" (Token: ${token})`);
      io?.to(`overlay:${token}`).emit('soundboard:play', payload);
      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('soundboard:play', payload);
      }
    });

    socket.on('soundboard:stop', (payload: any) => {
      const token = payload?.overlayToken || payload?.token || 'demo-token';
      console.log(`[Socket] Soundboard panic stop event (Token: ${token})`);
      io?.to(`overlay:${token}`).emit('soundboard:stop', payload);
      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('soundboard:stop', payload);
      }
    });

    socket.on('soundboard:update', (payload: any) => {
      const token = payload?.overlayToken || payload?.token || 'demo-token';
      io?.to(`overlay:${token}`).emit('soundboard:update', payload);
      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('soundboard:update', payload);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  (global as any).socketIO = io;
  return io;
}

export function getIO(): SocketIOServer | null {
  return io || (global as any).socketIO || null;
}

export function broadcastAlertToOverlay(overlayToken: string, payload: AlertPayload) {
  const activeIo = getIO();
  if (!activeIo) {
    console.warn('[Socket] Socket server not initialized yet');
    return;
  }
  recentOverlayAlerts.set(overlayToken, { payload, timestamp: Date.now() });
  recentOverlayAlerts.set('demo-token', { payload, timestamp: Date.now() });

  console.log(`[Socket] Broadcasting donation alert to overlay:${overlayToken.slice(0, 10)}...: ${payload.donorName} ($${payload.amount})`);
  activeIo.to(`overlay:${overlayToken}`).emit('donation:alert', payload);
  activeIo.emit('donation:paid', {
    ...payload,
    id: payload.donationId || payload.id,
    donationId: payload.donationId || payload.id,
    status: 'PAID'
  });
}

export function broadcastDonationToDashboard(streamerId: string, donation: any) {
  const activeIo = getIO();
  if (!activeIo) return;
  activeIo.to(`dashboard:${streamerId}`).emit('donation:new', donation);
  activeIo.emit('donation:paid', {
    ...donation,
    id: donation.id || donation.donationId,
    donationId: donation.id || donation.donationId,
    status: 'PAID'
  });
}

export function broadcastMediaUpdate(userId: string, data: { media: any[]; storage: any }) {
  const activeIo = getIO();
  if (!activeIo) return;
  console.log(`⚡ [Socket] Broadcasting media:updated for user [${userId}] (${data?.media?.length || 0} items)`);
  activeIo.to(`dashboard:${userId}`).emit('media:updated', data);
  activeIo.emit(`media:${userId}:updated`, data);
  activeIo.emit('media:updated', { ...data, userId });
}

export function broadcastMediaDelete(userId: string, mediaId: string) {
  const activeIo = getIO();
  if (!activeIo) return;
  console.log(`⚡ [Socket] Broadcasting media:deleted for user [${userId}] (mediaId: ${mediaId})`);
  activeIo.to(`dashboard:${userId}`).emit('media:deleted', { mediaId, userId });
  activeIo.emit(`media:${userId}:deleted`, { mediaId });
  activeIo.emit('media:deleted', { mediaId, userId });
}
