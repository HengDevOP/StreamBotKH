import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

export interface UserDoc {
  _id?: ObjectId;
  userId: string; // Login ID (e.g. demo-streamer-id-1001)
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  customThanksMessage?: string;
  isVerified?: boolean;
  socialLinks?: Array<{
    id: string;
    url: string;
    title?: string;
    platform?: string;
    icon?: string;
  }>;
  plan?: string;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
  planDurationDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueReportDoc {
  _id?: ObjectId;
  id: string;
  streamerId: string;
  streamerUsername?: string;
  streamerDisplayName?: string;
  streamerEmail?: string;
  streamerAvatar?: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaDoc {
  _id?: ObjectId;
  userId: string; // Login ID owner
  userEmail?: string; // Verified Google Email anchor
  filename: string;
  storedFilename: string;
  url: string; // e.g. /uploads/media/xxx.gif
  fileType: string; // 'image/png' | 'image/jpeg' | 'image/gif'
  fileSize: number; // bytes (max 2MB = 2097152 bytes)
  createdAt: Date;
}

export interface OverlayDoc {
  _id?: ObjectId;
  userId: string; // Login ID owner
  name: string;
  overlayToken: string; // unique token for OBS source (e.g. ovl_token_xxx)
  mediaId?: string;
  mediaUrl?: string; // Selected GIF/PNG/JPG URL
  soundUrl?: string;
  soundVolume?: number;
  glowColor?: string;
  templateStyle?: string;
  durationSeconds?: number;
  minAmountAlert?: number;
  ttsEnabled?: boolean;
  isDefault?: boolean;
  width?: number; // e.g. 1080
  height?: number; // e.g. 720
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertBoxDoc {
  _id?: ObjectId;
  userId: string;
  name: string;
  minAmountCondition: number;
  isEnabled: boolean;
  templateStyle: string; // 'neon-box' | 'glass-hologram' | 'cyber-glitch' | 'arcade' | 'minimal'
  showImage: boolean;
  mediaUrl?: string; // image/GIF picked from storage or custom URL
  soundUrl: string;
  soundVolume: number;
  durationSeconds: number;
  glowColor: string;
  fontFamily: string;
  fontSize?: number;
  ttsEnabled: boolean;
  ttsMinAmount: number;
  ttsType: 'google' | 'kiritts-male' | 'kiritts-female' | 'cloned';
  clonedVoiceName?: string;
  clonedVoiceSampleUrl?: string;
  textTemplate?: string;
  textColor?: string;
  messageTemplate?: string;
  layoutMode?: string;
  animationStyle?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceCloneDoc {
  _id?: ObjectId;
  userId: string;
  voiceName: string;
  sampleUrl: string;
  sampleDurationSeconds: number;
  clonedAt: Date;
}

export interface GatewayConfigDoc {
  _id: string; // 'master_khqr_config'
  khqrImageUrl: string; // e.g. /uploads/payment/khqr-official.png
  khqrFilename: string;
  khqrFileSize: number;
  khqrMimeType: string;
  bankAccountName?: string;
  bakongAccountId?: string;
  uploadedBy?: string;
  updatedAt: Date;
}

export interface TemporaryDonationDoc {
  _id?: ObjectId;
  id: string; // unique donationId
  streamerId: string;
  streamerUsername?: string;
  donorName: string;
  donorMessage?: string;
  amount: number;
  currency: 'USD' | 'KHR';
  bankingName?: string;
  videoUrl?: string;
  videoTitle?: string;
  videoStartTime?: number;
  videoEndTime?: number;
  createdAt: Date;
}

export interface TelegramSessionDoc {
  _id?: ObjectId;
  streamerId: string;
  phoneNumber?: string;
  userName?: string;
  sessionString?: string;
  apiId?: number | string;
  apiHash?: string;
  isSimulation?: boolean;
  isConnected: boolean;
  pendingPhone?: string;
  pendingHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TelegramMonitoredGroupDoc {
  _id?: ObjectId;
  id: string; // unique uuid string
  streamerId: string;
  chatId: string;
  title: string;
  username?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailboxMessageDoc {
  _id?: ObjectId;
  id: string; // unique uuid string
  streamerId: string; // target user ID or 'all' for platform announcements
  title: string;
  senderName: string;
  senderAvatar?: string;
  category: 'system' | 'donation' | 'security' | 'announcement';
  content: string;
  preview?: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  priority?: 'normal' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Safely extract MONGODB_URI directly from process.env with fallback
 */
export function getMongoUri(): string {
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streamneon';
}

/**
 * Extract target database name from MONGODB_DB, MONGODB_DATABASE,
 * or directly from the MONGODB_URI path.
 */
export function getMongoDbName(): string {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB;
  if (process.env.MONGODB_DATABASE) return process.env.MONGODB_DATABASE;

  const uri = getMongoUri();
  try {
    const parsed = new URL(uri.replace(/^mongodb(\+srv)?:\/\//i, 'http://'));
    const pathname = parsed.pathname.replace(/^\//, '').trim();
    if (pathname) {
      const db = pathname.split('/')[0].split('?')[0];
      if (db) return db;
    }
  } catch {
    const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/\s]+)/i);
    if (match && match[1]) {
      return match[1];
    }
  }

  return 'streamneon';
}

function maskMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  } catch {
    return uri;
  }
}

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
  _cachedMongoUri?: string;
};

/**
 * Returns a connected MongoClient promise, lazily reading current process.env.MONGODB_URI.
 */
export function getMongoClient(): Promise<MongoClient> {
  const currentUri = getMongoUri();

  if (!globalWithMongo._mongoClientPromise || globalWithMongo._cachedMongoUri !== currentUri) {
    globalWithMongo._cachedMongoUri = currentUri;
    const client = new MongoClient(currentUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 25000,
      maxPoolSize: 25,
      minPoolSize: 1,
      maxIdleTimeMS: 60000,
      waitQueueTimeoutMS: 8000
    });
    
    globalWithMongo._mongoClientPromise = client.connect().then((c) => {
      const dbName = getMongoDbName();
      console.log(`⚡ [MongoDB] Connected successfully to ${maskMongoUri(currentUri)} | Active Database: "${dbName}"`);
      return c;
    }).catch((err) => {
      console.error(`❌ [MongoDB] Connection failed to ${maskMongoUri(currentUri)}:`, err?.message || err);
      globalWithMongo._mongoClientPromise = undefined;
      throw err;
    });
  }

  return globalWithMongo._mongoClientPromise;
}

export const clientPromise: Promise<MongoClient> = {
  then(onfulfilled, onrejected) {
    return getMongoClient().then(onfulfilled, onrejected);
  },
  catch(onrejected) {
    return getMongoClient().catch(onrejected);
  },
  finally(onfinally) {
    return getMongoClient().finally(onfinally);
  },
  [Symbol.toStringTag]: 'Promise'
} as Promise<MongoClient>;

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  const dbName = getMongoDbName();
  return client.db(dbName);
}

export const connectMongo = getMongoDb;

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  const db = await getMongoDb();
  return db.collection<UserDoc>('users');
}

export async function getMediaCollection(): Promise<Collection<MediaDoc>> {
  const db = await getMongoDb();
  return db.collection<MediaDoc>('media');
}

export async function getOverlaysCollection(): Promise<Collection<OverlayDoc>> {
  const db = await getMongoDb();
  return db.collection<OverlayDoc>('overlays');
}

export async function getAlertBoxesCollection(): Promise<Collection<AlertBoxDoc>> {
  const db = await getMongoDb();
  return db.collection<AlertBoxDoc>('alert_boxes');
}

export async function getVoiceClonesCollection(): Promise<Collection<VoiceCloneDoc>> {
  const db = await getMongoDb();
  return db.collection<VoiceCloneDoc>('voice_clones');
}

export async function getGatewayConfigCollection(): Promise<Collection<GatewayConfigDoc>> {
  const db = await getMongoDb();
  return db.collection<GatewayConfigDoc>('gateway_settings');
}

export async function getTemporaryDonationsCollection(): Promise<Collection<TemporaryDonationDoc>> {
  const db = await getMongoDb();
  return db.collection<TemporaryDonationDoc>('temporary_donations');
}

export async function getIssueReportsCollection(): Promise<Collection<IssueReportDoc>> {
  const db = await getMongoDb();
  return db.collection<IssueReportDoc>('issue_reports');
}

export async function getTelegramSessionsCollection(): Promise<Collection<TelegramSessionDoc>> {
  const db = await getMongoDb();
  return db.collection<TelegramSessionDoc>('telegram_sessions');
}

export async function getTelegramMonitoredGroupsCollection(): Promise<Collection<TelegramMonitoredGroupDoc>> {
  const db = await getMongoDb();
  return db.collection<TelegramMonitoredGroupDoc>('telegram_monitored_groups');
}

export async function getMailboxMessagesCollection(): Promise<Collection<MailboxMessageDoc>> {
  const db = await getMongoDb();
  return db.collection<MailboxMessageDoc>('mailbox_messages');
}

export async function getMongoMailboxMessages(streamerId: string) {
  try {
    const col = await getMailboxMessagesCollection();
    const docs = await col
      .find({ streamerId: { $in: [streamerId, 'all'] } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return docs.map((d) => ({
      id: d.id,
      streamerId: d.streamerId,
      title: d.title,
      senderName: d.senderName || 'StreamBotKH System',
      senderAvatar: d.senderAvatar || '',
      category: d.category || 'system',
      content: d.content,
      preview: d.preview || d.content.slice(0, 100),
      isRead: !!d.isRead,
      actionUrl: d.actionUrl,
      actionLabel: d.actionLabel,
      priority: d.priority || 'normal',
      createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: d.updatedAt ? d.updatedAt.toISOString() : new Date().toISOString()
    }));
  } catch (e) {
    return [];
  }
}

export async function addMongoMailboxMessage(data: {
  streamerId: string;
  title: string;
  senderName?: string;
  senderAvatar?: string;
  category?: 'system' | 'donation' | 'security' | 'announcement';
  content: string;
  preview?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: 'normal' | 'high' | 'urgent';
}) {
  const col = await getMailboxMessagesCollection();
  const id = uuidv4();
  const now = new Date();
  const doc: MailboxMessageDoc = {
    id,
    streamerId: data.streamerId,
    title: data.title.trim(),
    senderName: data.senderName?.trim() || 'StreamBotKH System',
    senderAvatar: data.senderAvatar?.trim(),
    category: data.category || 'system',
    content: data.content.trim(),
    preview: data.preview?.trim() || data.content.trim().slice(0, 100),
    isRead: false,
    actionUrl: data.actionUrl,
    actionLabel: data.actionLabel,
    priority: data.priority || 'normal',
    createdAt: now,
    updatedAt: now
  };
  await col.insertOne(doc);
  return {
    ...doc,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

export async function markMongoMailboxRead(streamerId: string, messageId?: string, all?: boolean) {
  const col = await getMailboxMessagesCollection();
  if (all) {
    await col.updateMany(
      { streamerId: { $in: [streamerId, 'all'] }, isRead: false },
      { $set: { isRead: true, updatedAt: new Date() } }
    );
  } else if (messageId) {
    await col.updateOne(
      { id: messageId },
      { $set: { isRead: true, updatedAt: new Date() } }
    );
  }
}

export async function deleteMongoMailboxMessage(streamerId: string, messageId?: string, allRead?: boolean) {
  const col = await getMailboxMessagesCollection();
  if (allRead) {
    await col.deleteMany({ streamerId: { $in: [streamerId, 'all'] }, isRead: true });
  } else if (messageId) {
    await col.deleteOne({ id: messageId, streamerId: { $in: [streamerId, 'all'] } });
  }
}

export async function seedDefaultMailboxMessages(streamerId: string) {
  try {
    const col = await getMailboxMessagesCollection();
    const count = await col.countDocuments({ streamerId: { $in: [streamerId, 'all'] } });
    if (count > 0) return;

    const initialMessages: Array<Omit<MailboxMessageDoc, '_id'>> = [
      {
        id: uuidv4(),
        streamerId,
        title: 'Welcome to StreamBotKH! 🎉',
        senderName: 'StreamBotKH Team',
        senderAvatar: '',
        category: 'system',
        content: `Welcome to StreamBotKH! We are thrilled to empower your live streaming journey across Cambodia and beyond.\n\nHere are a few quick tips to get set up:\n1. Payment Gateway: Connect your Telegram bank notification group to receive instant Bakong KHQR alerts with 0% platform fee.\n2. Overlays: Copy your donation alert or goal overlay URL and paste it as a Browser Source in OBS Studio.\n3. Interactive Widgets: Engage your audience with the Subathon Timer, Spinning Wheel, and 2D Pokémon overlays.\n\nIf you ever need help or encounter an issue, visit the Report Issue tab. Happy Streaming!`,
        preview: 'Welcome to StreamBotKH! We are thrilled to empower your live streaming journey...',
        isRead: false,
        actionUrl: '/dashboard?tab=overview',
        actionLabel: 'Explore Dashboard',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        streamerId,
        title: 'Payment Gateway Ready for Setup 💳',
        senderName: 'Payment Gateway Bot',
        senderAvatar: '',
        category: 'security',
        content: `Your automated KHQR payment listener is waiting for activation.\n\nGo to the Payment Gateway tab:\n• Step 1: Input your authentication code.\n• Step 2: Upload your official Bakong KHQR image.\n• Step 3: Connect your Telegram bank notification group.\n\nOnce active, incoming bank transfers will automatically be detected and projected on your OBS overlay within seconds!`,
        preview: 'Your automated KHQR payment listener is waiting for activation. Complete setup in 3 easy steps...',
        isRead: false,
        actionUrl: '/dashboard?tab=payments',
        actionLabel: 'Configure Gateway',
        priority: 'normal',
        createdAt: new Date(Date.now() - 3600000), // 1 hr ago
        updatedAt: new Date(Date.now() - 3600000)
      },
      {
        id: uuidv4(),
        streamerId,
        title: 'Pro Streamer Features Available ⚡',
        senderName: 'StreamBotKH Platform',
        senderAvatar: '',
        category: 'announcement',
        content: `Looking to level up your broadcast? Pro Plan gives you access to:\n• Leaderboard widget for top donor recognition\n• Dynamic Stream Goals & Subathon Timer\n• Custom Soundboard & Video Media Share\n• 2D Pokémon companion and Spinning Wheel\n• 500MB Media Storage and 0% commission\n\nCheck out Plans & Commission anytime in your dashboard!`,
        preview: 'Looking to level up your broadcast? Unlock Leaderboards, Goals, Timer, Soundboard, and more...',
        isRead: false,
        actionUrl: '/dashboard?tab=billing',
        actionLabel: 'View Plans',
        priority: 'normal',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000)
      }
    ];

    await col.insertMany(initialMessages);
  } catch (e) {
    console.warn('[MongoDB] Failed seeding default mailbox messages:', e);
  }
}

export async function getMongoMonitoredGroups(streamerId: string) {
  try {
    const col = await getTelegramMonitoredGroupsCollection();
    const docs = await col.find({ streamerId }).sort({ createdAt: -1 }).toArray();
    return docs.map((d) => ({
      id: d.id,
      streamer_id: d.streamerId,
      chat_id: d.chatId,
      title: d.title,
      username: d.username,
      created_at: d.createdAt.toISOString()
    }));
  } catch (e) {
    return [];
  }
}

export async function addMongoMonitoredGroup(streamerId: string, chatId: string, title: string, username?: string) {
  const cleanChatId = chatId.trim();
  const cleanTitle = title.trim();
  const cleanUsername = username ? username.trim().replace(/^@/, '') : undefined;
  const col = await getTelegramMonitoredGroupsCollection();

  const existing = await col.findOne({ streamerId, chatId: cleanChatId });
  if (existing) {
    await col.updateOne(
      { _id: existing._id },
      { $set: { title: cleanTitle, username: cleanUsername, updatedAt: new Date() } }
    );
    return {
      id: existing.id,
      streamer_id: streamerId,
      chat_id: cleanChatId,
      title: cleanTitle,
      username: cleanUsername,
      created_at: existing.createdAt.toISOString()
    };
  }

  const id = uuidv4();
  const now = new Date();
  await col.insertOne({
    id,
    streamerId,
    chatId: cleanChatId,
    title: cleanTitle,
    username: cleanUsername,
    createdAt: now,
    updatedAt: now
  });

  return {
    id,
    streamer_id: streamerId,
    chat_id: cleanChatId,
    title: cleanTitle,
    username: cleanUsername,
    created_at: now.toISOString()
  };
}

export async function deleteMongoMonitoredGroup(id: string, streamerId: string) {
  try {
    const col = await getTelegramMonitoredGroupsCollection();
    return await col.deleteOne({ id, streamerId });
  } catch (e) {
    return null;
  }
}

export async function clearMongoMonitoredGroups(streamerId: string) {
  try {
    const col = await getTelegramMonitoredGroupsCollection();
    return await col.deleteMany({ streamerId });
  } catch (e) {
    return null;
  }
}

/**
 * Initialize MongoDB indexes and default data for streamer
 */
export async function initMongo() {
  try {
    const db = await getMongoDb();
    
    // Create unique indices
    await db.collection('users').createIndex({ userId: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 });
    await db.collection('media').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('media').createIndex({ userEmail: 1, createdAt: -1 });
    await db.collection('overlays').createIndex({ overlayToken: 1 }, { unique: true });
    await db.collection('overlays').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('temporary_donations').createIndex({ id: 1 }, { unique: true });
    await db.collection('temporary_donations').createIndex({ streamerId: 1, createdAt: -1 });
    await db.collection('telegram_sessions').createIndex({ streamerId: 1 }, { unique: true });
    await db.collection('telegram_monitored_groups').createIndex({ streamerId: 1, chatId: 1 }, { unique: true });
    await db.collection('mailbox_messages').createIndex({ id: 1 }, { unique: true });
    await db.collection('mailbox_messages').createIndex({ streamerId: 1, createdAt: -1 });

    // Seed default user if not exists
    const usersCol = await getUsersCollection();
    const existingUser = await usersCol.findOne({ userId: 'demo-streamer-id-1001' });
    if (!existingUser) {
      await usersCol.insertOne({
        userId: 'demo-streamer-id-1001',
        username: 'neonstreamer',
        displayName: 'Neon Master VIP',
        email: 'streamer@streamneon.vip',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=neonmaster',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('⚡ [MongoDB] Default user demo-streamer-id-1001 initialized');
    }

    // Seed default overlay if none exists for default user
    const overlaysCol = await getOverlaysCollection();
    const existingOverlay = await overlaysCol.findOne({ userId: 'demo-streamer-id-1001' });
    if (!existingOverlay) {
      await overlaysCol.insertOne({
        userId: 'demo-streamer-id-1001',
        name: 'Default Neon Alert Overlay',
        overlayToken: 'ovl_token_neon_demo_9921',
        mediaUrl: 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
        soundUrl: '/sounds/neon-chime.mp3',
        soundVolume: 0.85,
        glowColor: '#00F0FF',
        templateStyle: 'neon-box',
        durationSeconds: 8,
        minAmountAlert: 1.0,
        ttsEnabled: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('⚡ [MongoDB] Default overlay initialized with token ovl_token_neon_demo_9921');
    }

    // Seed default payment gateway config if not exists
    const gatewayCol = await getGatewayConfigCollection();
    const existingGateway = await gatewayCol.findOne({ _id: 'master_khqr_config' });
    if (!existingGateway) {
      await gatewayCol.insertOne({
        _id: 'master_khqr_config',
        khqrImageUrl: '',
        khqrFilename: '',
        khqrFileSize: 0,
        khqrMimeType: '',
        bankAccountName: 'STREAMBOTKH OFFICIAL KHQR',
        bakongAccountId: 'streambotkh@abaa',
        uploadedBy: 'admin',
        updatedAt: new Date()
      });
      console.log('⚡ [MongoDB] Default gateway_settings initialized');
    }

    console.log(`⚡ [MongoDB] Collections and indexes verified successfully on database: "${db.databaseName}"`);
  } catch (err) {
    console.error('❌ [MongoDB] Error during initialization:', err);
  }
}
