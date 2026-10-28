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
    await db.collection('media').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('overlays').createIndex({ overlayToken: 1 }, { unique: true });
    await db.collection('overlays').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('temporary_donations').createIndex({ id: 1 }, { unique: true });
    await db.collection('temporary_donations').createIndex({ streamerId: 1, createdAt: -1 });
    await db.collection('telegram_sessions').createIndex({ streamerId: 1 }, { unique: true });
    await db.collection('telegram_monitored_groups').createIndex({ streamerId: 1, chatId: 1 }, { unique: true });

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
