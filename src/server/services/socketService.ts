import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { getUsersCollection, getOverlayTokenHistoryCollection, getMongoDb, getSubscribersCollection, buildSubscriberUsernameQuery } from '../database/mongo';
import { extractYoutubeId, getYoutubeLiveStats } from '../../utils/youtube';
import { verifyProStreamerByToken } from './planService';

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

export async function broadcastToAllStreamerRooms(token: string, event: string, payload: any) {
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
      if (!data?.overlayToken) return;
      const roomName = `overlay:${data.overlayToken}`;
      const isAlreadyInRoom = socket.rooms.has(roomName);

      socket.join(roomName);

      if (!isAlreadyInRoom) {
        console.log(`[Socket] Overlay connected for token: ${data.overlayToken.slice(0, 10)}... (Socket ID: ${socket.id})`);
        // Automatically map legacy or regenerated tokens to the streamer's room so OBS never breaks!
        joinStreamerRooms(socket, data.overlayToken);
      }

      socket.emit('overlay:connected', { status: 'ready', message: 'StreamNeon overlay connected successfully' });
    });

    // Streamer dashboard joins room using streamerId
    socket.on('join:dashboard', (data: { streamerId: string }) => {
      if (!data?.streamerId) return;
      const roomName = `dashboard:${data.streamerId}`;
      const isAlreadyInRoom = socket.rooms.has(roomName);

      socket.join(roomName);

      if (!isAlreadyInRoom) {
        console.log(`[Socket] Dashboard connected for streamerId: ${data.streamerId}`);
      }
    });

    // Test alert trigger from dashboard
    socket.on('trigger:test_alert', async (payload: AlertPayload & { overlayToken: string }) => {
      const token = payload?.overlayToken || 'demo-token';
      console.log(`[Socket] Triggering test alert for overlay token: ${token}`);
      const testPayload: any = {
        ...payload,
        isTest: true
      };

      // Strip videoUrl if streamer is on Free plan (Video Alerts is Pro feature)
      if (testPayload.videoUrl) {
        const { isPro } = await verifyProStreamerByToken(token);
        if (!isPro) {
          delete testPayload.videoUrl;
          delete testPayload.videoTitle;
          delete testPayload.videoStartTime;
          delete testPayload.videoEndTime;
        }
      }

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

    // Live Chat overlay test message trigger
    socket.on('chat:test_message', async (data: any) => {
      const token = data?.token || data?.streamerToken || 'demo-token';
      console.log(`[Socket] Broadcasting chat:test_message for token: ${token}`);
      const authorName = (data?.author || 'SubscriberFan').trim();
      let assignedBadge = data?.badge;
      let badgeColor = data?.badgeColor;
      let badgeBg = data?.badgeBg;
      let badgeBorder = data?.badgeBorder;
      let badgeIcon = data?.badgeIcon;
      let badgeGifUrl = data?.badgeGifUrl || data?.badgeImage;
      let badgeImage = data?.badgeImage || data?.badgeGifUrl;

      try {
        const subCol = await getSubscribersCollection();
        const activeSub = await subCol.findOne({
          streamerToken: token,
          status: 'active',
          expiresAt: { $gt: new Date() },
          ...buildSubscriberUsernameQuery(authorName)
        });

        if (activeSub) {
          assignedBadge = activeSub.badgeText;
          badgeColor = activeSub.badgeColor;
          badgeBg = activeSub.badgeBg;
          badgeBorder = activeSub.badgeBorder;
          badgeIcon = activeSub.badgeIcon;
          badgeGifUrl = activeSub.badgeGifUrl || activeSub.badgeImage;
          badgeImage = activeSub.badgeImage || activeSub.badgeGifUrl;
        }
      } catch (err: any) {
        // Fallback
      }

      if (assignedBadge === undefined) {
        assignedBadge = 'VIP';
      }

      const testMsg = {
        id: 'test_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        author: authorName,
        message: data?.message || 'Hyped subscriber in the chat! Let’s go! 🔥✨',
        avatar: data?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorName)}`,
        badge: assignedBadge,
        badgeColor: badgeColor || '#00F0FF',
        badgeBg,
        badgeBorder,
        badgeIcon: badgeIcon || 'Crown',
        badgeGifUrl,
        badgeImage,
        platform: data?.platform || 'youtube',
        isTest: true,
        timestamp: Date.now()
      };

      broadcastToAllStreamerRooms(token, 'chat:message', testMsg);
      if (token === 'demo-token') {
        io?.to('overlay:demo-token').emit('chat:message', testMsg);
      }
    });

    // Soundboard event triggers for OBS overlay & stream sync (PRO Plan Feature Only)
    socket.on('soundboard:play', async (payload: any) => {
      const token = payload?.overlayToken || payload?.token || 'demo-token';
      const { isPro } = await verifyProStreamerByToken(token);
      if (!isPro) {
        console.warn(`[Socket] Blocked soundboard:play - Free streamer token: ${token}`);
        return;
      }
      console.log(`[Socket] Soundboard play event: "${payload?.title || payload?.soundId}" (Token: ${token})`);
      io?.to(`overlay:${token}`).emit('soundboard:play', payload);
      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('soundboard:play', payload);
      }
    });

    socket.on('soundboard:stop', async (payload: any) => {
      const token = payload?.overlayToken || payload?.token || 'demo-token';
      const { isPro } = await verifyProStreamerByToken(token);
      if (!isPro) {
        console.warn(`[Socket] Blocked soundboard:stop - Free streamer token: ${token}`);
        return;
      }
      console.log(`[Socket] Soundboard panic stop event (Token: ${token})`);
      io?.to(`overlay:${token}`).emit('soundboard:stop', payload);
      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('soundboard:stop', payload);
      }
    });

    socket.on('soundboard:update', async (payload: any) => {
      const token = payload?.overlayToken || payload?.token || 'demo-token';
      const { isPro } = await verifyProStreamerByToken(token);
      if (!isPro) {
        console.warn(`[Socket] Blocked soundboard:update - Free streamer token: ${token}`);
        return;
      }
      io?.to(`overlay:${token}`).emit('soundboard:update', payload);
      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('soundboard:update', payload);
      }
    });

    // Spinning Wheel event triggers for OBS overlay & stream sync (PRO Plan Feature Only)
    socket.on('wheel:spin', async (payload: any) => {
      const token = payload?.overlayToken || payload?.token || 'demo-token';
      const { isPro } = await verifyProStreamerByToken(token);
      if (!isPro) {
        console.warn(`[Socket] Blocked wheel:spin - Free streamer token: ${token}`);
        return;
      }
      console.log(`[Socket] Wheel spin event for token: ${token}`);
      io?.to(`overlay:${token}`).emit('wheel:spin', payload);
      if (token !== 'demo-token') {
        io?.to('overlay:demo-token').emit('wheel:spin', payload);
      }
    });

    // Support Ticket live chat rooms
    socket.on('join:ticket', (data: { ticketId: string }) => {
      if (data?.ticketId) {
        socket.join(`ticket:${data.ticketId}`);
        console.log(`[Socket] Client joined live ticket room: ticket:${data.ticketId}`);
      }
    });

    socket.on('leave:ticket', (data: { ticketId: string }) => {
      if (data?.ticketId) {
        socket.leave(`ticket:${data.ticketId}`);
        console.log(`[Socket] Client left live ticket room: ticket:${data.ticketId}`);
      }
    });

    // TV Live YouTube Concurrent Viewers ("watching now") WebSocket Subscription
    socket.on('tv:watch_youtube', async (data: { videoIds?: string[] }) => {
      socket.join('tv:live_viewers');
      const rawIds = Array.isArray(data?.videoIds) ? data.videoIds : [];
      const cleanSet = new Set<string>();
      for (const raw of rawIds) {
        const extracted = extractYoutubeId(raw);
        if (extracted) cleanSet.add(extracted);
      }

      if (cleanSet.size > 0) {
        socketWatchedVideoIds.set(socket.id, cleanSet);
        ensureYoutubeStatsPoller();

        try {
          const entries = await Promise.all(
            Array.from(cleanSet).map(async (vid) => [vid, await getYoutubeLiveStats(vid)] as const)
          );
          const stats: Record<string, { isLive: boolean; viewers: number }> = {};
          for (const [vid, st] of entries) {
            stats[vid] = st;
          }
          socket.emit('tv:youtube_stats', { stats, updatedAt: Date.now() });
        } catch (e) {}
      } else {
        socketWatchedVideoIds.delete(socket.id);
        stopYoutubeStatsPollerIfIdle();
      }
    });

    socket.on('tv:leave', () => {
      socket.leave('tv:live_viewers');
      socketWatchedVideoIds.delete(socket.id);
      stopYoutubeStatsPollerIfIdle();
    });

    socket.on('disconnect', () => {
      socketWatchedVideoIds.delete(socket.id);
      stopYoutubeStatsPollerIfIdle();
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

export function broadcastTicketMessage(ticketId: string, message: any) {
  const activeIo = getIO();
  if (!activeIo) return;
  activeIo.to(`ticket:${ticketId}`).emit('ticket:message', { ticketId, message });
  activeIo.emit('ticket:updated', { ticketId, lastMessage: message });
}

export function broadcastTicketClaimed(ticketId: string, claimedData: any) {
  const activeIo = getIO();
  if (!activeIo) return;
  activeIo.to(`ticket:${ticketId}`).emit('ticket:claimed', claimedData);
  activeIo.emit('ticket:updated', { ticketId, ...claimedData });
}

export function broadcastTicketStatusChanged(ticketId: string, statusData: any) {
  const activeIo = getIO();
  if (!activeIo) return;
  activeIo.to(`ticket:${ticketId}`).emit('ticket:status_changed', statusData);
  activeIo.emit('ticket:updated', { ticketId, ...statusData });
}

// ---------------------------------------------------------------------------
// Live YouTube Concurrent Viewers ("watching now") WebSocket Streamer
// ---------------------------------------------------------------------------
const socketWatchedVideoIds = new Map<string, Set<string>>();
let youtubeStatsInterval: NodeJS.Timeout | null = null;
let youtubeStatsInFlight = false;

function stopYoutubeStatsPollerIfIdle() {
  if (socketWatchedVideoIds.size === 0 && youtubeStatsInterval) {
    clearInterval(youtubeStatsInterval);
    youtubeStatsInterval = null;
  }
}

function ensureYoutubeStatsPoller() {
  if (youtubeStatsInterval) return;
  youtubeStatsInterval = setInterval(async () => {
    if (youtubeStatsInFlight) return;
    if (socketWatchedVideoIds.size === 0) {
      stopYoutubeStatsPollerIfIdle();
      return;
    }

    const activeIo = getIO();
    if (!activeIo) return;

    const allIds = new Set<string>();
    for (const set of socketWatchedVideoIds.values()) {
      for (const vid of set) {
        allIds.add(vid);
      }
    }
    if (allIds.size === 0) return;

    youtubeStatsInFlight = true;
    try {
      const entries = await Promise.all(
        Array.from(allIds).map(async (vid) => [vid, await getYoutubeLiveStats(vid, { bypassCache: true })] as const)
      );
      const stats: Record<string, { isLive: boolean; viewers: number }> = {};
      for (const [vid, st] of entries) {
        stats[vid] = st;
      }
      activeIo.to('tv:live_viewers').emit('tv:youtube_stats', {
        stats,
        updatedAt: Date.now()
      });
    } catch (e) {
      // Ignore transient network errors
    } finally {
      youtubeStatsInFlight = false;
    }
  }, 8000);
}

export function broadcastTvStreamerUpdated(payload: {
  id?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  liveStreamUrl: string;
  youtubeId: string;
  isLive: boolean;
  viewers: number;
}) {
  const activeIo = getIO();
  if (!activeIo) return;
  activeIo.to('tv:live_viewers').emit('tv:streamer_updated', payload);
}
