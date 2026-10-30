import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { getUsersCollection, getOverlayTokenHistoryCollection, getMongoDb } from '../database/mongo';

let io: SocketIOServer | null = null;

// ---------------------------------------------------------------------------
// Cross-instance alert relay (MongoDB `alert_events`)
// Several server instances (local dev, production, replicas) can share the same
// MongoDB + Telegram session. The instance that matches a donation is not always
// the instance the OBS overlay socket is connected to, so every alert is also
// published to MongoDB and re-emitted by all OTHER instances.
// ---------------------------------------------------------------------------
const g = globalThis as any;
const INSTANCE_ID: string = g.__alertRelayInstanceId || (g.__alertRelayInstanceId = randomUUID());
const ALERT_EVENTS_COLLECTION = 'alert_events';

async function publishAlertEvent(overlayToken: string, payload: AlertPayload) {
  try {
    const db = await getMongoDb();
    await db.collection(ALERT_EVENTS_COLLECTION).insertOne({
      instanceId: INSTANCE_ID,
      overlayToken,
      payload,
      createdAt: new Date()
    });
  } catch (e) {
    console.warn('[Socket Relay] Failed to publish alert event to MongoDB:', (e as any)?.message || e);
  }
}

function handleRelayedEvent(doc: any) {
  if (!doc || doc.instanceId === INSTANCE_ID || !doc.overlayToken || !doc.payload) return;
  console.log(`🔁 [Socket Relay] Alert from another server instance → overlay:${String(doc.overlayToken).slice(0, 10)}...: ${doc.payload.donorName} ($${doc.payload.amount})`);
  emitAlertLocally(doc.overlayToken, doc.payload);
}

async function startAlertRelay() {
  if (g.__alertRelayStarted) return;
  g.__alertRelayStarted = true;
  try {
    const db = await getMongoDb();
    const col = db.collection(ALERT_EVENTS_COLLECTION);
    await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 }).catch(() => {});

    let lastSeen = new Date();
    let pollTimer: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (pollTimer) return;
      console.log('[Socket Relay] Using polling fallback for cross-instance alerts');
      pollTimer = setInterval(async () => {
        try {
          const docs = await col
            .find({ createdAt: { $gt: lastSeen }, instanceId: { $ne: INSTANCE_ID } })
            .sort({ createdAt: 1 })
            .limit(50)
            .toArray();
          for (const d of docs) {
            if (d.createdAt > lastSeen) lastSeen = d.createdAt;
            handleRelayedEvent(d);
          }
        } catch (e) {}
      }, 1500);
    };

    try {
      const stream = col.watch([{ $match: { operationType: 'insert' } }]);
      stream.on('change', (change: any) => {
        const doc = change.fullDocument;
        if (doc?.createdAt && doc.createdAt > lastSeen) lastSeen = doc.createdAt;
        handleRelayedEvent(doc);
      });
      stream.on('error', (err: any) => {
        console.warn('[Socket Relay] Change stream error, switching to polling:', err?.message || err);
        try { stream.close(); } catch (e) {}
        startPolling();
      });
      console.log(`⚡ [Socket Relay] Cross-instance alert relay active (instance ${INSTANCE_ID.slice(0, 8)})`);
    } catch (e) {
      startPolling();
    }
  } catch (e) {
    g.__alertRelayStarted = false;
    console.warn('[Socket Relay] Could not start alert relay:', (e as any)?.message || e);
  }
}

async function joinStreamerRooms(socket: Socket, token: string) {
  try {
    const usersCol = await getUsersCollection();
    const histCol = await getOverlayTokenHistoryCollection();
    const db = await getMongoDb();

    let streamer = await usersCol.findOne({
      $or: [{ overlayToken: token }, { overlay_token: token } as any]
    });

    if (!streamer) {
      const hist = await histCol.findOne({ token });
      if (hist?.streamerId) {
        streamer = await usersCol.findOne({
          $or: [{ userId: hist.streamerId }, { id: hist.streamerId } as any]
        });
      }
    }

    if (!streamer) {
      const overlayDoc: any = await db.collection('overlays').findOne({
        $or: [{ overlayToken: token }, { token }]
      });
      if (overlayDoc?.userId) {
        streamer = await usersCol.findOne({
          $or: [{ userId: overlayDoc.userId }, { id: overlayDoc.userId as any }]
        });
      }
    }

    if (streamer) {
      const sId = streamer.userId || (streamer as any).id;
      if (sId) socket.join(`streamer_overlay:${sId}`);
      const activeTok = streamer.overlayToken || streamer.overlay_token;
      if (activeTok) socket.join(`overlay:${activeTok}`);

      if (sId) {
        const histories = await histCol.find({ streamerId: sId }).toArray();
        for (const h of histories) {
          if (h.token) socket.join(`overlay:${h.token}`);
        }
        const overlays = await db.collection('overlays').find({ userId: sId }).toArray();
        for (const o of overlays) {
          if (o.overlayToken) socket.join(`overlay:${o.overlayToken}`);
        }
      }
    }
  } catch (e) {}
}

async function broadcastToAllStreamerRooms(token: string, event: string, payload: any) {
  const io = getIO();
  if (!io) return;
  try {
    const usersCol = await getUsersCollection();
    const histCol = await getOverlayTokenHistoryCollection();
    const db = await getMongoDb();

    let streamer: any = null;
    if (token && token !== 'demo-token') {
      streamer = await usersCol.findOne({
        $or: [{ overlayToken: token }, { overlay_token: token } as any]
      });

      if (!streamer) {
        const hist = await histCol.findOne({ token });
        if (hist?.streamerId) {
          streamer = await usersCol.findOne({
            $or: [{ userId: hist.streamerId }, { id: hist.streamerId } as any]
          });
        }
      }

      if (!streamer) {
        const overlayDoc: any = await db.collection('overlays').findOne({
          $or: [{ overlayToken: token }, { token }]
        });
        if (overlayDoc?.userId) {
          streamer = await usersCol.findOne({
            $or: [{ userId: overlayDoc.userId }, { id: overlayDoc.userId as any }]
          });
        }
      }
    }

    // Fallback: resolve streamer directly by payload.streamerId
    if (!streamer && payload?.streamerId) {
      streamer = await usersCol.findOne({
        $or: [
          { userId: payload.streamerId },
          { id: payload.streamerId as any },
          { username: payload.streamerId }
        ]
      });
    }

    if (streamer) {
      // Collect every linked room and emit across all of them (Socket.IO natively de-duplicates sockets)
      const rooms = new Set<string>();
      const sId = streamer.userId || (streamer as any).id;
      if (sId) rooms.add(`streamer_overlay:${sId}`);
      const activeTok = streamer.overlayToken || streamer.overlay_token;
      if (activeTok) rooms.add(`overlay:${activeTok}`);
      if (token && token !== 'demo-token') rooms.add(`overlay:${token}`);

      if (sId) {
        const histories = await histCol.find({ streamerId: sId }).toArray();
        for (const h of histories) {
          if (h.token) rooms.add(`overlay:${h.token}`);
        }
        const overlays = await db.collection('overlays').find({ userId: sId }).toArray();
        for (const o of overlays) {
          if (o.overlayToken) rooms.add(`overlay:${o.overlayToken}`);
        }
      }

      if (rooms.size > 0) {
        io.to(Array.from(rooms)).emit(event, payload);
      }
    }
  } catch (e) {}
}

export interface AlertPayload {
  id?: string;
  streamerId?: string;
  streamerUsername?: string;
  boxId?: string;
  donationId: string;
  donorName: string;
  donorMessage?: string;
  donor_message?: string;
  message?: string;
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
  donorColor?: string;
  amountColor?: string;
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
  isVideoTest?: boolean;
  directVideo?: boolean;
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

        // Automatically map legacy or regenerated tokens to the streamer's room so OBS never breaks!
        joinStreamerRooms(socket, data.overlayToken);

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
      const token = payload?.overlayToken || 'demo-token';
      console.log(`[Socket] Triggering test alert for overlay token: ${token}`);
      const testPayload = {
        ...payload,
        isTest: true
      };

      // Broadcast single alert event to target overlay room
      io?.to(`overlay:${token}`).emit('donation:alert', testPayload);

      // Also broadcast to streamer's master overlay room and active overlay token
      broadcastToAllStreamerRooms(token, 'donation:alert', testPayload);

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

      broadcastToAllStreamerRooms(token, 'donation:alert_finished', data);

      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('donation:alert_finished', data);
      }
    });

    // Notify overlay room that a video alert has finished so donation sources can advance to next queued alert
    socket.on('overlay:video_finished', (data: { donationId: string; overlayToken: string }) => {
      const token = data?.overlayToken || 'demo-token';
      console.log(`[Socket] Video alert finished for donation "${data?.donationId}" (Token: ${token})`);
      io?.to(`overlay:${token}`).emit('donation:video_finished', data);

      broadcastToAllStreamerRooms(token, 'donation:video_finished', data);

      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('donation:video_finished', data);
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
  startAlertRelay();
  return io;
}

export function getIO(): SocketIOServer | null {
  return io || (global as any).socketIO || null;
}

export function broadcastAlertToOverlay(overlayToken: string, payload: AlertPayload) {
  const activeIo = getIO();
  if (!activeIo) {
    console.warn('[Socket] Socket server not initialized yet — relaying alert via MongoDB only');
  } else {
    console.log(`[Socket] Broadcasting donation alert to overlay:${overlayToken.slice(0, 10)}...: ${payload.donorName} ($${payload.amount})`);
    emitAlertLocally(overlayToken, payload);
  }
  // Relay to other server instances whose sockets may hold the OBS overlay connection
  publishAlertEvent(overlayToken, payload);
}

function emitAlertLocally(overlayToken: string, payload: AlertPayload) {
  const activeIo = getIO();
  if (!activeIo) return;

  activeIo.to(`overlay:${overlayToken}`).emit('donation:alert', payload);

  // Broadcast to streamer master room and all linked overlay tokens via MongoDB
  broadcastToAllStreamerRooms(overlayToken, 'donation:alert', payload);

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
  const payload = {
    ...donation,
    id: donation.id || donation.donationId,
    donationId: donation.id || donation.donationId,
    status: 'PAID',
    streamerId,
    created_at: donation.created_at || donation.paid_at || new Date().toISOString(),
    paid_at: donation.paid_at || donation.created_at || new Date().toISOString()
  };
  activeIo.to(`dashboard:${streamerId}`).emit('donation:new', payload);
  activeIo.emit('donation:paid', payload);
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
