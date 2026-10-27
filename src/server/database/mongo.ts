import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

export interface UserDoc {
  _id?: ObjectId;
  userId: string; // Login ID (e.g. demo-streamer-id-1001)
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
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

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streamneon';

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri);
  globalWithMongo._mongoClientPromise = client.connect();
}

export const clientPromise: Promise<MongoClient> = globalWithMongo._mongoClientPromise;

export async function getMongoDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db('streamneon');
}

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

    console.log('⚡ [MongoDB] Collections and indexes verified successfully');
  } catch (err) {
    console.error('❌ [MongoDB] Error during initialization:', err);
  }
}
