import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { generateSecureOverlayToken } from '../utils/crypto';

export interface UserDoc {
  _id?: ObjectId;
  userId: string; // Login ID (e.g. demo-streamer-id-1001 or UUID)
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  bannerUrl?: string;
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
  proExpiryReminderSentFor?: string | null;
  proExpiryReminderSentAt?: Date | null;
  proExpiredEmailSentFor?: string | null;
  welcomeEmailSentAt?: Date | null;
  trialActive?: boolean;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  hasUsedTrial?: boolean;
  trialEnded?: boolean;
  overlayToken?: string;
  overlay_token?: string;
  telegramPhone?: string;
  telegramSession?: string;
  telegramUserName?: string;
  telegramApiId?: number;
  telegramApiHash?: string;
  telegramPairingCode?: string;
  telegramPendingPhone?: string;
  telegramPendingHash?: string;
  telegramPendingSession?: string;
  liveStreamUrl?: string;
  youtubeLiveUrl?: string;
  broadcastUrls?: {
    youtube?: string;
    twitch?: string;
    tiktok?: string;
    facebook?: string;
    kick?: string;
    instagram?: string;
  };
  dailyTokensLimit?: number;
  dailyTokensUsed?: number;
  lastTokenResetDate?: string;
  deletionStatus?: 'pending' | 'deleted' | null;
  deletionRequestedAt?: Date | string | null;
  deletionScheduledAt?: Date | string | null;
  accountDeleted?: boolean;
  deletedAt?: Date | string | null;
  lastIp?: string;
  ipHistory?: string[];
  lastUserAgent?: string;
  lastActiveAt?: Date | string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionLogDoc {
  _id?: ObjectId;
  id: string;
  dateKey: string;
  eventType: 'LOGIN' | 'REGISTER' | 'API_REQUEST' | 'SECURITY_BLOCK' | 'RATE_WARNING' | 'AUTH_Action' | string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  userAgent?: string;
  userId?: string | null;
  username?: string | null;
  userEmail?: string | null;
  requestsPerSecond: number;
  isHighRateWarning: boolean;
  isBlocked: boolean;
  durationMs?: number;
  details?: string;
  createdAt: Date;
}

export interface BlockedIpDoc {
  _id?: ObjectId;
  ip: string;
  reason: string;
  blockedBy?: string;
  createdAt: number;
  expiresAt: number; // 0 = permanent block
  violationsCount: number;
  associatedUserId?: string | null;
  associatedUsername?: string | null;
  associatedEmail?: string | null;
}

export interface TrackedIpDoc {
  _id?: ObjectId;
  ip: string;
  totalRequests: number;
  peakRps: number;
  lastRps: number;
  warningCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastPath?: string;
  lastMethod?: string;
  userAgent?: string;
  userIds?: string[];
  usernames?: string[];
  emails?: string[];
}

export interface DonationDoc {
  _id?: ObjectId;
  id: string; // unique UUID
  streamerId: string;
  streamerUsername?: string;
  donorName: string;
  donorMessage?: string;
  amount: number;
  currency: 'USD' | 'KHR';
  bankingName?: string;
  paymentMethod?: string;
  paywayTranId?: string;
  qrString?: string;
  videoUrl?: string;
  videoTitle?: string;
  videoStartTime?: number;
  videoEndTime?: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  isAlerted?: boolean | number;
  paidAt?: Date | string | null;
  createdAt: Date;
  updatedAt?: Date;
  isSubscription?: boolean;
  tierId?: string;
  tierName?: string;
  badgeText?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeIcon?: string;
  badgeGifUrl?: string;
  badgeImage?: string;
  isWheelSpin?: boolean;
  donationType?: 'tip' | 'subscribe' | 'wheel';
}

export interface AlertSettingsDoc {
  _id?: ObjectId;
  streamerId: string;
  templateStyle?: string;
  glowColor?: string;
  soundUrl?: string;
  soundVolume?: number;
  durationSeconds?: number;
  minAmountAlert?: number;
  ttsEnabled?: boolean;
  ttsVoice?: string;
  ttsType?: string;
  clonedVoiceSampleUrl?: string;
  customGifUrl?: string;
  showImage?: boolean;
  textTemplate?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  layoutMode?: string;
  animationStyle?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentSettingsDoc {
  _id?: ObjectId;
  streamerId: string;
  bakongAccountId?: string;
  bankAccountName?: string;
  abaPaywayApiKey?: string;
  abaPaywayMerchantId?: string;
  allowUsd?: boolean;
  allowKhr?: boolean;
  usdMinAmount?: number;
  khrMinAmount?: number;
  exchangeRate?: number;
  isLiveMode?: boolean;
  masterKhqrImage?: string;
  masterKhqrFilename?: string;
  masterKhqrFileSize?: number;
  masterKhqrMimeType?: string;
  customKhqrImageUrl?: string;
  customKhqrFilename?: string;
  customKhqrFileSize?: number;
  khqrBase64?: string;
  khqrItems?: any[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VideoAlertSettingsDoc {
  _id?: ObjectId;
  streamerId: string;
  isEnabled: boolean;
  minTipAmount: number;
  maxDurationSeconds: number;
  autoPlay?: boolean;
  showProgressBar?: boolean;
  allowViewerControl?: boolean;
  blacklistedKeywords?: string;
  videoVolume?: number;
  autoDucking?: boolean;
  headerColor?: string;
  headerBgColor?: string;
  footerColor?: string;
  footerBgColor?: string;
  headerTextAlign?: 'left' | 'center' | 'justify' | 'right';
  footerTextAlign?: 'left' | 'center' | 'justify' | 'right';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OverlayTokenHistoryDoc {
  _id?: ObjectId;
  token: string;
  streamerId: string;
  createdAt: Date;
}

export interface StreamTimerDoc {
  _id?: ObjectId;
  streamerId: string;
  mode: string;
  title: string;
  currentSeconds: number;
  initialSeconds: number;
  secondsPerUsd: number;
  maxSeconds: number;
  isRunning: boolean;
  theme: string;
  fontFamily: string;
  updatedAt: Date;
}

export interface StreamGoalDoc {
  _id?: ObjectId;
  id?: string;
  streamerId?: string;
  streamerToken?: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  initialAmount?: number;
  accentColor?: string;
  templateStyle?: string;
  showBalance?: boolean;
  showBackground?: boolean;
  showAnimation?: boolean;
  showGradientShader?: boolean;
  endDate?: string | null;
  goalWidth?: number;
  currency?: string;
  theme?: string;
  fontFamily?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StreamLeaderboardDoc {
  _id?: ObjectId;
  streamerId?: string;
  streamerToken?: string;
  title: string;
  period?: string;
  timeframe?: string;
  maxRows?: number;
  maxEntries?: number;
  accentColor?: string;
  templateStyle?: string;
  theme?: string;
  fontFamily: string;
  rankFonts?: Record<string, string>;
  nameAmountGap?: number;
  removeRankCardBg?: boolean;
  showBackground?: boolean;
  showAnimation?: boolean;
  showRankBadges?: boolean;
  showAmounts?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt: Date;
}

export interface StreamChatSettingsDoc {
  _id?: ObjectId;
  id?: string;
  streamerToken: string;
  theme?: string;
  fontFamily?: string;
  authorFontFamily?: string;
  messageFontFamily?: string;
  fontSize?: string;
  lineStyle?: 'inline' | 'indented' | 'stacked';
  authorColor?: string;
  messageColor?: string;
  animationStyle?: string;
  overlayWidth?: number;
  overlayHeight?: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  showBadges?: boolean;
  showAvatars?: boolean;
  showTimestamp?: boolean;
  fadeDuration?: number;
  messageDelay?: number;
  maxMessages?: number;
  textBorderWidth?: number;
  textBorderColor?: string;
  textShadowStyle?: 'none' | 'soft' | 'strong' | 'glow' | 'custom';
  textShadowColor?: string;
  textShadowBlur?: number;
  soundEnabled?: boolean;
  soundUrl?: string;
  soundVolume?: number;
  youtubeUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CustomOverlayDoc {
  _id?: ObjectId;
  id?: string;
  streamerId?: string;
  streamerToken: string;
  badgeText?: string;
  badgeIcon?: string;
  headline: string;
  subtext?: string;
  tickerMessages?: string[];
  animationFlow: 'marquee' | 'typewriter' | 'fade-slide' | 'float-bounce' | 'wave-glow' | 'cyber-glitch' | 'flip-3d';
  animationSpeed: 'slow' | 'normal' | 'fast';
  showGoal: boolean;
  goalLayout?: 'docked' | 'compact-pill' | 'stacked';
  customWidth?: number;
  customHeight?: number;
  layoutPosition: 'top-ticker' | 'bottom-ticker' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center-lower';
  fontFamily: string;
  fontSize: number;
  textColor: string;
  accentColor: string;
  glowColor: string;
  backgroundColor: string;
  borderColor: string;
  backgroundStyle: 'glass' | 'deep' | 'neon-border' | 'transparent';
  showBackground?: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriberTierDoc {
  id: string;
  name: string;
  price: number;
  currency: 'USD' | 'KHR';
  badgeText: string;
  badgeColor: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeIcon: string;
  badgeGifUrl?: string;
  badgeImage?: string;
  perks: string[];
  description?: string;
  enabled?: boolean;
  order?: number;
  alertSettings?: any;
}

export interface SubscriberSettingsDoc {
  _id?: ObjectId;
  streamerToken: string;
  streamerUsername?: string;
  enabled: boolean;
  tiers: SubscriberTierDoc[];
  telegramOutletGroup?: {
    chatId: string;
    title: string;
    username?: string;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubscriberDoc {
  _id?: ObjectId;
  id: string;
  streamerToken: string;
  streamerUsername: string;
  subscriberName: string;
  youtubeHandle?: string;
  tierId: string;
  tierName: string;
  price: number;
  currency: 'USD' | 'KHR';
  badgeText: string;
  badgeColor: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeIcon: string;
  badgeGifUrl?: string;
  badgeImage?: string;
  paymentMethod: string;
  status: 'active' | 'cancelled' | 'expired';
  subscribedAt: Date;
  expiresAt: Date;
  donorMessage?: string;
  transactionId?: string;
}

export interface WheelSliceDoc {
  id: string;
  label: string;
  color: string;
  percentage?: number;
}

export interface WheelSettingsDoc {
  _id?: ObjectId;
  streamerToken: string;
  streamerUsername?: string;
  isEnabled: boolean;
  minTipAmount: number;
  spinSoundUrl?: string;
  slices: WheelSliceDoc[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StreamSoundboardDoc {
  _id?: ObjectId;
  id: string;
  streamerId: string;
  name: string;
  isActive: boolean;
  volume: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StreamSoundboardItemDoc {
  _id?: ObjectId;
  id: string;
  soundboardId: string;
  streamerId: string;
  name: string;
  audioUrl: string;
  keybind?: string;
  volume: number;
  color?: string;
  icon?: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PokemonWidgetSettingsDoc {
  _id?: ObjectId;
  streamerId: string;
  enabled: boolean;
  selectedPokemon: string;
  scale: number;
  position: string;
  interactive: boolean;
  animationState: string;
  customName?: string;
  showNameTag: boolean;
  updatedAt: Date;
}

export interface AvatarWidgetSettingsDoc {
  _id?: ObjectId;
  streamerToken: string;
  enabled: boolean;
  defaultAvatarId: string;
  customAvatarUrl?: string;
  customAvatarName?: string;
  allowedAvatars: string[];
  walkSpeed: string; // 'stationary' | 'slow' | 'normal' | 'fast'
  scale: string; // 'small' | 'medium' | 'large' | 'xlarge'
  bubbleDuration: number;
  maxOnScreen: number;
  showName: boolean;
  reactToDonations: boolean;
  reactToChat: boolean;
  soundEnabled: boolean;
  overlayWidth?: number;
  overlayHeight?: number;
  createdAt?: Date;
  updatedAt: Date;
}

export interface PlatformPromotionDoc {
  _id?: ObjectId;
  id: string;
  title: string;
  description: string;
  bannerUrl: string;
  actionUrl: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemIncidentDoc {
  _id?: ObjectId;
  id: string;
  title: string;
  description?: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'investigating' | 'fixing' | 'resolved';
  affectedComponents: string[];
  updates: Array<{
    id: string;
    status: 'investigating' | 'fixing' | 'resolved';
    message: string;
    authorEmail?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface SupportTicketDoc {
  _id?: ObjectId;
  id: string;
  ticketNumber?: number;
  streamerId: string;
  streamerUsername?: string;
  streamerDisplayName?: string;
  streamerEmail?: string;
  streamerAvatar?: string;
  title: string;
  category: string;
  priority: string;
  status: 'open' | 'claimed' | 'resolved' | 'closed';
  claimedById?: string;
  claimedByName?: string;
  claimedByAvatar?: string;
  claimedAt?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketAttachmentDoc {
  id: string;
  kind: 'file' | 'image' | 'video' | 'voice' | 'link';
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  durationSec?: number;
  waveform?: number[];
}

export interface TicketMessageDoc {
  _id?: ObjectId;
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin' | 'system';
  senderAvatar?: string;
  message: string;
  attachments?: TicketAttachmentDoc[];
  createdAt: string;
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
  fileSize: number; // bytes
  fileBase64?: string; // Persistent base64 backup to withstand server restarts, container redeploys & ephemeral storage
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

export interface AlertConditionTierDoc {
  id: string;
  minAmountCondition: number;
  isEnabled?: boolean;
  templateStyle: string;
  showImage: boolean;
  mediaUrl?: string;
  soundUrl: string;
  soundVolume: number;
  durationSeconds: number;
  glowColor: string;
  fontFamily: string;
  fontSize?: number;
  ttsEnabled: boolean;
  ttsMinAmount: number;
  ttsType: 'google' | 'google-male' | 'kiritts-male' | 'kiritts-female' | 'cloned';
  clonedVoiceName?: string;
  clonedVoiceSampleUrl?: string;
  textTemplate?: string;
  textColor?: string;
  donorColor?: string;
  amountColor?: string;
  layoutMode?: string;
  animationStyle?: string;
  capcutAnimation?: string;
  capcutLabel?: string;
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
  ttsType: 'google' | 'google-male' | 'kiritts-male' | 'kiritts-female' | 'cloned';
  clonedVoiceName?: string;
  clonedVoiceSampleUrl?: string;
  textTemplate?: string;
  textColor?: string;
  donorColor?: string;
  amountColor?: string;
  messageTemplate?: string;
  layoutMode?: string;
  animationStyle?: string;
  capcutAnimation?: string;
  capcutLabel?: string;
  conditions?: AlertConditionTierDoc[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Given a list of active AlertBoxDoc items and a donation amount in USD,
 * evaluates all condition tiers inside each box and returns the highest
 * matching tier merged onto its parent box (preserving box._id).
 */
export function resolveMatchingAlertBox(activeBoxes: any[], effectiveAmountUsd: number): any | null {
  if (!Array.isArray(activeBoxes) || activeBoxes.length === 0) return null;

  const candidates: Array<{ merged: any; threshold: number }> = [];

  for (const box of activeBoxes) {
    if (!box) continue;
    const rawTiers = Array.isArray(box.conditions) && box.conditions.length > 0 ? box.conditions : [box];
    for (const tier of rawTiers) {
      if (!tier) continue;
      const threshold = Number(tier?.minAmountCondition ?? box.minAmountCondition) || 0;
      candidates.push({
        merged: tier === box ? box : { ...box, ...tier, _id: box._id, name: box.name, isEnabled: true },
        threshold
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.threshold - a.threshold);
  const matched = candidates.find((c) => effectiveAmountUsd >= c.threshold - 0.0001);
  return matched ? matched.merged : null;
}

export interface VoiceCloneDoc {
  _id?: ObjectId;
  userId: string;
  voiceName: string;
  sampleUrl: string;
  sampleDurationSeconds: number;
  baseModel?: 'neural-male' | 'neural-female' | string;
  pitch?: string; // e.g. "+5Hz" or "-6Hz"
  rate?: string;  // e.g. "+0%" or "+4%"
  volume?: string;
  detectedGender?: 'male' | 'female';
  averagePitchHz?: number;
  soundStyle?: string; // e.g. "Energetic Streamer", "Warm & Conversational", "Deep & Resonant"
  pacingLabel?: string; // e.g. "Brisk (+6%)", "Natural (1.0x)"
  timbre?: string;
  tau?: number;
  f0Std?: number;
  spectralBrightnessHz?: number;
  speakingTempoRatio?: number;
  chestGainDb?: number;
  presenceGainDb?: number;
  airGainDb?: number;
  clonedAt: Date;
}

export interface GatewayConfigDoc {
  _id: string; // 'master_khqr_config' or `khqr_${streamerId}`
  streamerId?: string;
  streamerUsername?: string;
  khqrImageUrl: string; // e.g. /uploads/payment/khqr-official.png
  khqrFilename: string;
  khqrFileSize: number;
  khqrMimeType: string;
  khqrBase64?: string; // Persistent base64 backup to withstand server restarts, container redeploys & ephemeral storage
  customKhqrImageUrl?: string;
  customKhqrFilename?: string;
  customKhqrFileSize?: number;
  customKhqrMimeType?: string;
  customKhqrBase64?: string; // Persistent base64 backup for custom KHQR image
  customKhqrUpdatedAt?: Date;
  bankAccountName?: string;
  bakongAccountId?: string;
  khqrItems?: any[];
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
  isSubscription?: boolean;
  tierId?: string;
  tierName?: string;
  badgeText?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeIcon?: string;
  badgeGifUrl?: string;
  badgeImage?: string;
  isWheelSpin?: boolean;
  donationType?: 'tip' | 'subscribe' | 'wheel';
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

export async function getSupportTicketsCollection(): Promise<Collection<SupportTicketDoc>> {
  const db = await getMongoDb();
  return db.collection<SupportTicketDoc>('support_tickets');
}

export async function getTicketMessagesCollection(): Promise<Collection<TicketMessageDoc>> {
  const db = await getMongoDb();
  return db.collection<TicketMessageDoc>('ticket_messages');
}

export async function getSystemIncidentsCollection(): Promise<Collection<SystemIncidentDoc>> {
  const db = await getMongoDb();
  return db.collection<SystemIncidentDoc>('system_incidents');
}

export async function purgeOldSystemIncidentsMongo(days = 30) {
  try {
    const col = await getSystemIncidentsCollection();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const result = await col.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    if (result.deletedCount && result.deletedCount > 0) {
      console.log(`🧹 [MongoDB] Purged ${result.deletedCount} system incidents older than ${days} days`);
    }
  } catch (e) {
    console.warn('[MongoDB] Purge old incidents warning:', e);
  }
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

export async function getDonationsCollection(): Promise<Collection<DonationDoc>> {
  const db = await getMongoDb();
  return db.collection<DonationDoc>('donations');
}

export async function getAlertSettingsCollection(): Promise<Collection<AlertSettingsDoc>> {
  const db = await getMongoDb();
  return db.collection<AlertSettingsDoc>('alert_settings');
}

export async function getPaymentSettingsCollection(): Promise<Collection<PaymentSettingsDoc>> {
  const db = await getMongoDb();
  return db.collection<PaymentSettingsDoc>('payment_settings');
}

export async function getVideoAlertSettingsCollection(): Promise<Collection<VideoAlertSettingsDoc>> {
  const db = await getMongoDb();
  return db.collection<VideoAlertSettingsDoc>('video_alert_settings');
}

export async function getOverlayTokenHistoryCollection(): Promise<Collection<OverlayTokenHistoryDoc>> {
  const db = await getMongoDb();
  return db.collection<OverlayTokenHistoryDoc>('overlay_token_history');
}

export async function getStreamTimersCollection(): Promise<Collection<StreamTimerDoc>> {
  const db = await getMongoDb();
  return db.collection<StreamTimerDoc>('stream_timers');
}

export async function getStreamGoalsCollection(): Promise<Collection<StreamGoalDoc>> {
  const db = await getMongoDb();
  return db.collection<StreamGoalDoc>('stream_goals');
}

export async function getStreamLeaderboardsCollection(): Promise<Collection<StreamLeaderboardDoc>> {
  const db = await getMongoDb();
  return db.collection<StreamLeaderboardDoc>('stream_leaderboards');
}

export async function getSoundboardsCollection(): Promise<Collection<StreamSoundboardDoc>> {
  const db = await getMongoDb();
  return db.collection<StreamSoundboardDoc>('stream_soundboards');
}

export async function getSoundboardItemsCollection(): Promise<Collection<StreamSoundboardItemDoc>> {
  const db = await getMongoDb();
  return db.collection<StreamSoundboardItemDoc>('stream_soundboard_items');
}

export async function getPokemonSettingsCollection(): Promise<Collection<PokemonWidgetSettingsDoc>> {
  const db = await getMongoDb();
  return db.collection<PokemonWidgetSettingsDoc>('pokemon_widget_settings');
}

export async function getAvatarSettingsCollection(): Promise<Collection<AvatarWidgetSettingsDoc>> {
  const db = await getMongoDb();
  return db.collection<AvatarWidgetSettingsDoc>('avatar_widget_settings');
}

export async function getStreamChatSettingsCollection(): Promise<Collection<StreamChatSettingsDoc>> {
  const db = await getMongoDb();
  return db.collection<StreamChatSettingsDoc>('stream_chat_settings');
}

export async function getCustomOverlaysCollection(): Promise<Collection<CustomOverlayDoc>> {
  const db = await getMongoDb();
  return db.collection<CustomOverlayDoc>('custom_overlays');
}

export interface PlatformTrialConfigDoc {
  _id?: ObjectId;
  id: string; // 'pro_plan_trial'
  isEnabled: boolean;
  durationDays: number;
  trialName: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export async function getTrialConfigCollection(): Promise<Collection<PlatformTrialConfigDoc>> {
  const db = await getMongoDb();
  return db.collection<PlatformTrialConfigDoc>('platform_trial_configs');
}

export async function getPromotionsCollection(): Promise<Collection<PlatformPromotionDoc>> {
  const db = await getMongoDb();
  return db.collection<PlatformPromotionDoc>('platform_promotions');
}

export async function getSubscriberSettingsCollection(): Promise<Collection<SubscriberSettingsDoc>> {
  const db = await getMongoDb();
  return db.collection<SubscriberSettingsDoc>('subscriber_settings');
}

export async function getSubscribersCollection(): Promise<Collection<SubscriberDoc>> {
  const db = await getMongoDb();
  return db.collection<SubscriberDoc>('subscribers');
}

export async function getWheelSettingsCollection(): Promise<Collection<WheelSettingsDoc>> {
  const db = await getMongoDb();
  return db.collection<WheelSettingsDoc>('wheel_settings');
}

export async function getSessionLogsCollection(): Promise<Collection<SessionLogDoc>> {
  const db = await getMongoDb();
  return db.collection<SessionLogDoc>('session_logs');
}

export async function getBlockedIpsCollection(): Promise<Collection<BlockedIpDoc>> {
  const db = await getMongoDb();
  return db.collection<BlockedIpDoc>('blocked_ips');
}

export async function getTrackedIpsCollection(): Promise<Collection<TrackedIpDoc>> {
  const db = await getMongoDb();
  return db.collection<TrackedIpDoc>('tracked_ips');
}

const gDailyLogs = globalThis as unknown as {
  __lastPrunedSessionDateKey?: string;
};

/**
 * Returns today's daily tracking key (YYYY-MM-DD in Asia/Phnom_Penh UTC+7).
 */
export function getDailyLogDateKey(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const utcPlus7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return utcPlus7.toISOString().slice(0, 10);
  }
}

/**
 * Prunes any session_logs stored from previous days (past dateKey or missing dateKey)
 * so MongoDB only retains the current daily record set.
 */
export async function pruneOldSessionLogsMongo(
  currentDateKey: string = getDailyLogDateKey(),
  force: boolean = false
): Promise<number> {
  if (!force && gDailyLogs.__lastPrunedSessionDateKey === currentDateKey) {
    return 0;
  }
  try {
    const col = await getSessionLogsCollection();
    const res = await col.deleteMany({
      $or: [
        { dateKey: { $ne: currentDateKey } },
        { dateKey: { $exists: false } },
      ],
    });
    gDailyLogs.__lastPrunedSessionDateKey = currentDateKey;
    return res.deletedCount || 0;
  } catch (err) {
    console.warn('[MongoDB] pruneOldSessionLogsMongo failed:', err);
    return 0;
  }
}

/**
 * Helper to build a flexible MongoDB query matching YouTube usernames / handles
 * Handles:
 * - With or without leading '@' (e.g. '@SokhaGamer' <=> 'SokhaGamer')
 * - Display names with spaces matching handle without spaces (e.g. 'Sokha Gamer' <=> 'SokhaGamer')
 * - Case-insensitive regex
 */
export function buildSubscriberUsernameQuery(authorName: string) {
  const clean = String(authorName || '').trim();
  const noAt = clean.replace(/^@+/, '').trim();
  const noSpaces = noAt.replace(/\s+/g, '');
  const escapedClean = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedNoAt = noAt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedNoSpaces = noSpaces.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const conditions: any[] = [
    { subscriberName: { $regex: new RegExp(`^@?${escapedNoAt}$`, 'i') } },
    { subscriberName: { $regex: new RegExp(`^@?${escapedClean}$`, 'i') } }
  ];

  if (noSpaces && noSpaces !== noAt) {
    conditions.push({ subscriberName: { $regex: new RegExp(`^@?${escapedNoSpaces}$`, 'i') } });
  }

  conditions.push(
    { youtubeHandle: { $regex: new RegExp(`^@?${escapedNoAt}$`, 'i') } },
    { youtubeHandle: { $regex: new RegExp(`^@?${escapedClean}$`, 'i') } }
  );

  return { $or: conditions };
}

/**
 * Cleanup expired pending donations (>5 mins) in MongoDB donations & temporary_donations
 */
export async function cleanupExpiredPendingDonationsMongo() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const donationsCol = await getDonationsCollection();
    const result = await donationsCol.updateMany(
      { status: 'PENDING', createdAt: { $lte: fiveMinutesAgo } },
      { $set: { status: 'EXPIRED' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`🧹 [MongoDB Cleanup] Marked ${result.modifiedCount} expired pending donation(s) as EXPIRED.`);
    }

    const tempCol = await getTemporaryDonationsCollection();
    const tempResult = await tempCol.deleteMany({
      createdAt: { $lte: fifteenMinutesAgo }
    });
    if (tempResult.deletedCount > 0) {
      console.log(`🧹 [MongoDB Cleanup] Pruned ${tempResult.deletedCount} old temporary donation session(s).`);
    }
  } catch (err) {
    console.warn('[MongoDB Cleanup] Warning during expired pending donations cleanup:', err);
  }
}

/**
 * 6-Month Data Retention Cleanup in MongoDB
 */
export async function cleanupOlderDonationsMongo(months = 6) {
  try {
    const cutoff = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);
    const donationsCol = await getDonationsCollection();
    const res = await donationsCol.deleteMany({
      createdAt: { $lt: cutoff }
    });
    if (res.deletedCount > 0) {
      console.log(`🧹 [MongoDB Cleanup] Pruned ${res.deletedCount} donation record(s) older than ${months} month(s).`);
    }
  } catch (err) {
    console.warn('[MongoDB Cleanup] Warning during 6-month retention cleanup:', err);
  }
}

export async function getMongoMailboxMessages(streamerId: string) {
  try {
    const col = await getMailboxMessagesCollection();

    // Ensure legacy starter/seed messages are removed
    await col.deleteMany({
      senderName: { $in: ['StreamBotKH Team', 'Payment Gateway Bot', 'StreamBotKH Platform'] },
      title: {
        $in: [
          'Welcome to StreamBotKH! 🎉',
          'Payment Gateway Ready for Setup 💳',
          'Pro Streamer Features Available ⚡'
        ]
      }
    });

    const docs = await col
      .find({ streamerId: { $in: [streamerId, 'all'] } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return docs.map((d) => ({
      id: d.id || String(d._id),
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
    const idFilter: any = ObjectId.isValid(messageId)
      ? { $or: [{ id: messageId }, { _id: new ObjectId(messageId) }] }
      : { id: messageId };
    await col.updateOne(
      { ...idFilter, streamerId: { $in: [streamerId, 'all'] } },
      { $set: { isRead: true, updatedAt: new Date() } }
    );
  }
}

export async function deleteMongoMailboxMessage(streamerId: string, messageId?: string, allRead?: boolean) {
  const col = await getMailboxMessagesCollection();
  if (allRead) {
    await col.deleteMany({ streamerId: { $in: [streamerId, 'all'] }, isRead: true });
  } else if (messageId) {
    const idFilter: any = ObjectId.isValid(messageId)
      ? { $or: [{ id: messageId }, { _id: new ObjectId(messageId) }] }
      : { id: messageId };
    await col.deleteOne({ ...idFilter, streamerId: { $in: [streamerId, 'all'] } });
  }
}

export async function seedDefaultMailboxMessages(_streamerId: string) {
  // No-op: mailbox uses real database messages only without starter seed mail
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

export async function addMongoMonitoredGroup(streamerId: string, chatId: string, title: string, username?: string, customId?: string) {
  const cleanChatId = chatId.trim();
  const cleanTitle = title.trim();
  const cleanUsername = username ? username.trim().replace(/^@/, '') : undefined;
  const col = await getTelegramMonitoredGroupsCollection();

  const stripped = cleanChatId.replace(/^-100/, '').replace(/^-/, '');
  const existing = await col.findOne({
    streamerId,
    $or: [
      { chatId: cleanChatId },
      { chat_id: cleanChatId },
      { id: cleanChatId },
      ...(stripped ? [
        { chatId: stripped },
        { chatId: `-${stripped}` },
        { chatId: `-100${stripped}` },
        { chat_id: stripped },
        { chat_id: `-${stripped}` },
        { chat_id: `-100${stripped}` }
      ] : [])
    ]
  });

  if (existing) {
    await col.updateOne(
      { _id: existing._id },
      { $set: { title: cleanTitle, username: cleanUsername, updatedAt: new Date() } }
    );
    return {
      id: existing.id,
      streamer_id: streamerId,
      chat_id: existing.chatId || cleanChatId,
      title: cleanTitle,
      username: cleanUsername,
      created_at: existing.createdAt ? existing.createdAt.toISOString() : new Date().toISOString()
    };
  }

  const id = customId || uuidv4();
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

export async function deleteMongoMonitoredGroup(idOrChatId: string, streamerId: string) {
  try {
    const col = await getTelegramMonitoredGroupsCollection();
    const cleanId = String(idOrChatId || '').trim();
    if (!cleanId) return null;

    const strippedId = cleanId.replace(/^-100/, '').replace(/^-/, '');
    const conditions: any[] = [
      { id: cleanId },
      { chatId: cleanId },
      { chat_id: cleanId }
    ];

    if (strippedId) {
      conditions.push(
        { chatId: strippedId },
        { chatId: `-${strippedId}` },
        { chatId: `-100${strippedId}` },
        { chat_id: strippedId },
        { chat_id: `-${strippedId}` },
        { chat_id: `-100${strippedId}` },
        { id: strippedId },
        { id: `-${strippedId}` },
        { id: `-100${strippedId}` }
      );
    }

    if (ObjectId.isValid(cleanId) && cleanId.length === 24) {
      try {
        conditions.push({ _id: new ObjectId(cleanId) });
      } catch (_) {}
    }

    return await col.deleteMany({
      streamerId,
      $or: conditions
    });
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
    await db.collection('session_logs').createIndex({ dateKey: 1, createdAt: -1 });
    await db.collection('session_logs').createIndex({ createdAt: -1 });
    await db.collection('session_logs').createIndex({ ip: 1, createdAt: -1 });
    await db.collection('session_logs').createIndex({ eventType: 1, createdAt: -1 });
    await db.collection('blocked_ips').createIndex({ ip: 1 }, { unique: true });
    await db.collection('tracked_ips').createIndex({ ip: 1 }, { unique: true });
    await db.collection('tracked_ips').createIndex({ lastSeenAt: -1 });

    // Prune past-day session logs on startup
    await pruneOldSessionLogsMongo(getDailyLogDateKey(), true);

    // Ensure every user has a valid overlayToken
    const usersMissingTokens = await db.collection('users').find({
      $or: [
        { overlayToken: { $exists: false } },
        { overlayToken: null },
        { overlayToken: '' }
      ]
    }).toArray();
    for (const u of usersMissingTokens) {
      const newToken = generateSecureOverlayToken();
      await db.collection('users').updateOne({ _id: u._id }, { $set: { overlayToken: newToken, updatedAt: new Date() } });
    }

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
        mediaUrl: '/sbkh/sbkh_hi.gif',
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

    // Restore and synchronize all streamer Master KHQR images across MongoDB Atlas and local disk
    await restoreAllMasterKhqrImages();

    // Restore and synchronize all media library assets across MongoDB Atlas and local disk
    await restoreAllMediaFiles();
  } catch (err) {
    console.error('❌ [MongoDB] Error during initialization:', err);
  }
}

/**
 * Helper to ensure a streamer's Master KHQR image is verified and restored:
 * 1. Checks MongoDB gateway_settings and payment_settings.
 * 2. If the physical file on disk exists:
 *    - Backs it up to MongoDB as base64 (if not already backed up).
 *    - Ensures MongoDB points to the correct file path.
 * 3. If the physical file on disk is missing:
 *    - Recreates the file on disk from MongoDB's base64 backup.
 *    - If no base64, searches disk folder /uploads/payment/<streamerId>/ for an existing image.
 *    - Syncs the working path in MongoDB.
 */
export async function restoreMasterKhqrImage(
  streamerId?: string,
  username?: string
): Promise<{
  restored: boolean;
  khqrImageUrl?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
}> {
  try {
    const gatewayCol = await getGatewayConfigCollection();

    const queryConditions: any[] = [];
    if (streamerId) {
      queryConditions.push({ _id: `khqr_${streamerId}` });
      queryConditions.push({ streamerId: streamerId });
    }
    if (username) {
      queryConditions.push({ _id: `khqr_${username}` });
      queryConditions.push({ streamerId: username });
    }
    if (queryConditions.length === 0) {
      queryConditions.push({ _id: 'master_khqr_config' });
    }

    // Look for document with image or base64
    let mongoConfig = await gatewayCol.findOne({
      $and: [
        { $or: queryConditions },
        {
          $or: [
            { khqrImageUrl: { $exists: true, $ne: '' } },
            { khqrBase64: { $exists: true, $ne: '' } }
          ]
        }
      ]
    });

    if (!mongoConfig) {
      mongoConfig = await gatewayCol.findOne({ $or: queryConditions });
    }

    let paymentSettingsRow: any = null;
    if (streamerId) {
      try {
        const payCol = await getPaymentSettingsCollection();
        paymentSettingsRow = await payCol.findOne({
          $or: [{ streamerId }, { streamer_id: streamerId }]
        } as any);
      } catch (e) {}
    }

    // Helper to verify if an image file exists on disk and is non-empty
    const checkFile = (relUrl?: string | null): string | null => {
      if (!relUrl || typeof relUrl !== 'string' || !relUrl.trim()) return null;
      const clean = relUrl.trim().replace(/^\//, '');
      const abs = path.join(process.cwd(), 'public', clean);
      try {
        if (fs.existsSync(abs)) {
          const st = fs.statSync(abs);
          if (st.isFile() && st.size > 0) return abs;
        }
      } catch (e) {}
      return null;
    };

    // Helper to find any image in the streamer's upload folder
    const findFolderImage = (id?: string | null): { url: string; absPath: string } | null => {
      if (!id) return null;
      const dir = path.join(process.cwd(), 'public', 'uploads', 'payment', id);
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const f of files) {
            const ext = path.extname(f).toLowerCase();
            if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
              const abs = path.join(dir, f);
              const st = fs.statSync(abs);
              if (st.isFile() && st.size > 0) {
                return { url: `/uploads/payment/${id}/${f}`, absPath: abs };
              }
            }
          }
        }
      } catch (e) {}
      return null;
    };

    // 1. Check if mongoConfig.khqrImageUrl exists on disk
    let verifiedAbsPath = checkFile(mongoConfig?.khqrImageUrl);
    let verifiedUrl = verifiedAbsPath ? (mongoConfig?.khqrImageUrl || '').trim() : '';

    // 2. If not on disk, check paymentSettingsRow
    if (!verifiedAbsPath && (paymentSettingsRow?.masterKhqrImage || paymentSettingsRow?.master_khqr_image)) {
      const payImage = (paymentSettingsRow.masterKhqrImage || paymentSettingsRow.master_khqr_image || '').trim();
      const payAbs = checkFile(payImage);
      if (payAbs) {
        verifiedAbsPath = payAbs;
        verifiedUrl = payImage;
      }
    }

    // 3. If still not found, check the disk folder for any existing payment image
    if (!verifiedAbsPath) {
      const folderImg = findFolderImage(streamerId) || (mongoConfig?.streamerId ? findFolderImage(mongoConfig.streamerId) : null);
      if (folderImg) {
        verifiedAbsPath = folderImg.absPath;
        verifiedUrl = folderImg.url;
      }
    }

    // CASE A: The image file exists on disk
    if (verifiedAbsPath && verifiedUrl) {
      const buffer = fs.readFileSync(verifiedAbsPath);
      const ext = path.extname(verifiedAbsPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      const base64 = buffer.toString('base64');
      const filename = path.basename(verifiedAbsPath);
      const targetId = streamerId || mongoConfig?.streamerId || 'demo-streamer-id-1001';

      // Always ensure MongoDB has the base64 backup and the active URL
      if (!mongoConfig?.khqrBase64 || mongoConfig.khqrImageUrl !== verifiedUrl || mongoConfig.khqrFileSize !== buffer.length) {
        await gatewayCol.updateOne(
          { _id: `khqr_${targetId}` },
          {
            $set: {
              streamerId: targetId,
              ...(username ? { streamerUsername: username } : {}),
              khqrImageUrl: verifiedUrl,
              khqrFilename: mongoConfig?.khqrFilename || filename,
              khqrFileSize: buffer.length,
              khqrMimeType: mongoConfig?.khqrMimeType || mime,
              khqrBase64: base64,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
      }

      // Sync payment_settings in MongoDB
      if (targetId) {
        try {
          const payCol = await getPaymentSettingsCollection();
          await payCol.updateOne(
            { streamerId: targetId },
            {
              $set: {
                streamerId: targetId,
                masterKhqrImage: verifiedUrl,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          );
        } catch (e) {}
      }

      return {
        restored: true,
        khqrImageUrl: verifiedUrl,
        filename: mongoConfig?.khqrFilename || filename,
        fileSize: buffer.length,
        mimeType: mongoConfig?.khqrMimeType || mime
      };
    }

    // CASE B: The image file is NOT on disk, BUT MongoDB has khqrBase64 backup!
    if (mongoConfig?.khqrBase64 && mongoConfig.khqrBase64.trim() !== '') {
      const targetId = streamerId || mongoConfig.streamerId || 'demo-streamer-id-1001';
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payment', targetId);
      fs.mkdirSync(uploadDir, { recursive: true });

      const ext = mongoConfig.khqrMimeType?.includes('png') ? '.png' : '.jpg';
      const origFilename = mongoConfig.khqrFilename || `master-khqr${ext}`;
      const safeExt = path.extname(origFilename).toLowerCase() || ext;
      const storedFilename = `khqr-restored-${Date.now()}-${uuidv4().slice(0, 8)}${safeExt}`;
      const restoredAbs = path.join(uploadDir, storedFilename);

      const buffer = Buffer.from(mongoConfig.khqrBase64, 'base64');
      fs.writeFileSync(restoredAbs, buffer);

      const restoredUrl = `/uploads/payment/${targetId}/${storedFilename}`;

      await gatewayCol.updateOne(
        { _id: mongoConfig._id },
        {
          $set: {
            streamerId: targetId,
            ...(username ? { streamerUsername: username } : {}),
            khqrImageUrl: restoredUrl,
            khqrFileSize: buffer.length,
            updatedAt: new Date()
          }
        }
      );

      if (targetId) {
        try {
          const payCol = await getPaymentSettingsCollection();
          await payCol.updateOne(
            { streamerId: targetId },
            {
              $set: {
                streamerId: targetId,
                masterKhqrImage: restoredUrl,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          );
        } catch (e) {}
      }

      console.log(`✅ [Master KHQR] Restored physical KHQR file from MongoDB backup for [${targetId}]: ${restoredUrl} (${(buffer.length / 1024).toFixed(1)} KB)`);

      return {
        restored: true,
        khqrImageUrl: restoredUrl,
        filename: origFilename,
        fileSize: buffer.length,
        mimeType: mongoConfig.khqrMimeType || (ext === '.png' ? 'image/png' : 'image/jpeg')
      };
    }

    return { restored: false };
  } catch (err: any) {
    console.error('⚠️ [Master KHQR] restoreMasterKhqrImage error:', err);
    return { restored: false };
  }
}

/**
 * Verifies and restores a streamer's Custom KHQR image (for "Custom" donation amount).
 * If the physical file is missing from disk, it reconstitutes it from MongoDB base64.
 * If the physical file is present, it ensures MongoDB has the base64 backup.
 */
export async function restoreCustomKhqrImage(
  streamerId?: string,
  username?: string
): Promise<{
  restored: boolean;
  customKhqrImageUrl?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
}> {
  try {
    const gatewayCol = await getGatewayConfigCollection();

    const queryConditions: any[] = [];
    if (streamerId) {
      queryConditions.push({ _id: `khqr_${streamerId}` });
      queryConditions.push({ streamerId: streamerId });
    }
    if (username) {
      queryConditions.push({ _id: `khqr_${username}` });
      queryConditions.push({ streamerId: username });
    }
    if (queryConditions.length === 0) {
      queryConditions.push({ _id: 'master_khqr_config' });
    }

    let mongoConfig = await gatewayCol.findOne({
      $and: [
        { $or: queryConditions },
        {
          $or: [
            { customKhqrImageUrl: { $exists: true, $ne: '' } },
            { customKhqrBase64: { $exists: true, $ne: '' } }
          ]
        }
      ]
    });

    if (!mongoConfig) {
      mongoConfig = await gatewayCol.findOne({ $or: queryConditions });
    }

    let paymentSettingsRow: any = null;
    if (streamerId) {
      try {
        const payCol = await getPaymentSettingsCollection();
        paymentSettingsRow = await payCol.findOne({
          $or: [{ streamerId }, { streamer_id: streamerId }]
        } as any);
      } catch (e) {}
    }

    const checkFile = (relUrl?: string | null): string | null => {
      if (!relUrl || typeof relUrl !== 'string' || !relUrl.trim()) return null;
      const clean = relUrl.trim().replace(/^\//, '');
      const abs = path.join(process.cwd(), 'public', clean);
      try {
        if (fs.existsSync(abs)) {
          const st = fs.statSync(abs);
          if (st.isFile() && st.size > 0) return abs;
        }
      } catch (e) {}
      return null;
    };

    let verifiedAbsPath: string | null = null;
    let verifiedUrl: string | null = null;

    if (mongoConfig?.customKhqrImageUrl) {
      const abs = checkFile(mongoConfig.customKhqrImageUrl);
      if (abs) {
        verifiedAbsPath = abs;
        verifiedUrl = mongoConfig.customKhqrImageUrl;
      }
    }

    if (!verifiedAbsPath && paymentSettingsRow?.customKhqrImageUrl) {
      const abs = checkFile(paymentSettingsRow.customKhqrImageUrl);
      if (abs) {
        verifiedAbsPath = abs;
        verifiedUrl = paymentSettingsRow.customKhqrImageUrl;
      }
    }

    // CASE A: The image file exists on disk
    if (verifiedAbsPath && verifiedUrl) {
      const buffer = fs.readFileSync(verifiedAbsPath);
      const ext = path.extname(verifiedAbsPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      const base64 = buffer.toString('base64');
      const filename = path.basename(verifiedAbsPath);
      const targetId = streamerId || mongoConfig?.streamerId || 'demo-streamer-id-1001';

      if (!mongoConfig?.customKhqrBase64 || mongoConfig.customKhqrImageUrl !== verifiedUrl || mongoConfig.customKhqrFileSize !== buffer.length) {
        await gatewayCol.updateOne(
          { _id: `khqr_${targetId}` },
          {
            $set: {
              streamerId: targetId,
              ...(username ? { streamerUsername: username } : {}),
              customKhqrImageUrl: verifiedUrl,
              customKhqrFilename: mongoConfig?.customKhqrFilename || filename,
              customKhqrFileSize: buffer.length,
              customKhqrMimeType: mongoConfig?.customKhqrMimeType || mime,
              customKhqrBase64: base64,
              customKhqrUpdatedAt: new Date(),
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
      }

      if (targetId) {
        try {
          const payCol = await getPaymentSettingsCollection();
          await payCol.updateOne(
            { streamerId: targetId },
            {
              $set: {
                streamerId: targetId,
                customKhqrImageUrl: verifiedUrl,
                customKhqrFilename: mongoConfig?.customKhqrFilename || filename,
                customKhqrFileSize: buffer.length,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          );
        } catch (e) {}
      }

      return {
        restored: true,
        customKhqrImageUrl: verifiedUrl,
        filename: mongoConfig?.customKhqrFilename || filename,
        fileSize: buffer.length,
        mimeType: mongoConfig?.customKhqrMimeType || mime
      };
    }

    // CASE B: Image file is NOT on disk, but MongoDB has customKhqrBase64 backup!
    if (mongoConfig?.customKhqrBase64 && mongoConfig.customKhqrBase64.trim() !== '') {
      const targetId = streamerId || mongoConfig.streamerId || 'demo-streamer-id-1001';
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payment', targetId);
      fs.mkdirSync(uploadDir, { recursive: true });

      const ext = mongoConfig.customKhqrMimeType?.includes('png') ? '.png' : '.jpg';
      const origFilename = mongoConfig.customKhqrFilename || `custom-khqr${ext}`;
      const safeExt = path.extname(origFilename).toLowerCase() || ext;
      const storedFilename = `custom-khqr-restored-${Date.now()}-${uuidv4().slice(0, 8)}${safeExt}`;
      const restoredAbs = path.join(uploadDir, storedFilename);

      const buffer = Buffer.from(mongoConfig.customKhqrBase64, 'base64');
      fs.writeFileSync(restoredAbs, buffer);

      const restoredUrl = `/uploads/payment/${targetId}/${storedFilename}`;

      await gatewayCol.updateOne(
        { _id: mongoConfig._id },
        {
          $set: {
            streamerId: targetId,
            ...(username ? { streamerUsername: username } : {}),
            customKhqrImageUrl: restoredUrl,
            customKhqrFileSize: buffer.length,
            updatedAt: new Date()
          }
        }
      );

      if (targetId) {
        try {
          const payCol = await getPaymentSettingsCollection();
          await payCol.updateOne(
            { streamerId: targetId },
            {
              $set: {
                streamerId: targetId,
                customKhqrImageUrl: restoredUrl,
                customKhqrFilename: origFilename,
                customKhqrFileSize: buffer.length,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          );
        } catch (e) {}
      }

      return {
        restored: true,
        customKhqrImageUrl: restoredUrl,
        filename: origFilename,
        fileSize: buffer.length,
        mimeType: mongoConfig.customKhqrMimeType || (ext === '.png' ? 'image/png' : 'image/jpeg')
      };
    }

    return { restored: false };
  } catch (err: any) {
    console.error('⚠️ [Custom KHQR] restoreCustomKhqrImage error:', err);
    return { restored: false };
  }
}

/**
 * Startup restoration: verifies and restores Master and Custom KHQR images for all streamers
 */
export async function restoreAllMasterKhqrImages(): Promise<void> {
  try {
    const gatewayCol = await getGatewayConfigCollection();
    const allConfigs = await gatewayCol.find({
      $or: [
        { khqrImageUrl: { $exists: true, $ne: '' } },
        { khqrBase64: { $exists: true, $ne: '' } },
        { customKhqrImageUrl: { $exists: true, $ne: '' } },
        { customKhqrBase64: { $exists: true, $ne: '' } }
      ]
    }).toArray();

    for (const conf of allConfigs) {
      const sId = conf.streamerId || (conf._id.startsWith('khqr_') ? conf._id.replace('khqr_', '') : null);
      if (sId) {
        await restoreMasterKhqrImage(sId, conf.streamerUsername);
        await restoreCustomKhqrImage(sId, conf.streamerUsername);
      }
    }

    // Also scan payment_settings collection in MongoDB
    try {
      const payCol = await getPaymentSettingsCollection();
      const payRows = await payCol.find({
        $or: [
          { masterKhqrImage: { $exists: true, $ne: '' } },
          { master_khqr_image: { $exists: true, $ne: '' } } as any,
          { customKhqrImageUrl: { $exists: true, $ne: '' } }
        ]
      }).toArray();

      for (const row of payRows) {
        const sId = row.streamerId || (row as any).streamer_id;
        if (sId) {
          await restoreMasterKhqrImage(sId);
          await restoreCustomKhqrImage(sId);
        }
      }
    } catch (e) {}

    console.log('⚡ [Payment Gateway] Restored and synchronized all Master & Custom KHQRs from MongoDB');
  } catch (err) {
    console.warn('⚠️ [Payment Gateway] Warning during startup restoration:', err);
  }
}

/**
 * Helper to ensure a single media file is restored onto disk:
 * 1. Checks if public/uploads/media/<storedFilename> exists on disk.
 * 2. If it exists and fileBase64 is missing in MongoDB, reads the file and saves fileBase64 to MongoDB.
 * 3. If it does not exist on disk and fileBase64 is present, writes the file to disk from fileBase64.
 * 4. Fallback: if storedFilename is missing on disk and no base64, checks public/uploads/media for matching file size.
 */
export async function restoreMediaFile(media: MediaDoc): Promise<boolean> {
  if (!media.storedFilename) return false;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'media');
  const filePath = path.join(uploadDir, media.storedFilename);

  try {
    // 1. If file already exists on disk
    if (fs.existsSync(filePath)) {
      const st = fs.statSync(filePath);
      if (st.isFile() && st.size > 0) {
        // Back up to MongoDB if fileBase64 is missing (safe for MongoDB document limit <= 15MB)
        if (!media.fileBase64 && st.size <= 15 * 1024 * 1024) {
          try {
            const buffer = fs.readFileSync(filePath);
            const base64 = buffer.toString('base64');
            const mediaCol = await getMediaCollection();
            await mediaCol.updateOne(
              { _id: media._id },
              { $set: { fileBase64: base64, fileSize: buffer.length } }
            );
          } catch (e) {}
        }
        return true;
      }
    }

    // 2. If file is missing on disk, but MongoDB has fileBase64 backup!
    if (media.fileBase64 && media.fileBase64.trim() !== '') {
      fs.mkdirSync(uploadDir, { recursive: true });
      const buffer = Buffer.from(media.fileBase64, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log(`✅ [Media Storage] Restored media file from Cloud backup [${media.filename}]: ${media.storedFilename} (${(buffer.length / 1024).toFixed(1)} KB)`);
      return true;
    }

    // 3. Fallback matching: if storedFilename is missing, search public/uploads/media for a file of identical byte size
    if (fs.existsSync(uploadDir) && media.fileSize > 0) {
      const files = fs.readdirSync(uploadDir);
      for (const f of files) {
        const candidatePath = path.join(uploadDir, f);
        try {
          const st = fs.statSync(candidatePath);
          if (st.isFile() && st.size === media.fileSize) {
            fs.copyFileSync(candidatePath, filePath);
            const buffer = fs.readFileSync(filePath);
            const base64 = buffer.toString('base64');
            const mediaCol = await getMediaCollection();
            await mediaCol.updateOne(
              { _id: media._id },
              { $set: { fileBase64: base64 } }
            );
            console.log(`✅ [Media Storage] Linked and restored media file [${media.filename}] from existing local asset`);
            return true;
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn(`⚠️ [Media Storage] Could not restore media file [${media.filename}]:`, err);
  }

  return false;
}

/**
 * Startup restoration: verifies and restores all media files across MongoDB Atlas and disk
 */
export async function restoreAllMediaFiles(): Promise<void> {
  try {
    const mediaCol = await getMediaCollection();
    const allMedia = await mediaCol.find({}).toArray();

    let restoredCount = 0;
    for (const item of allMedia) {
      const ok = await restoreMediaFile(item);
      if (ok) restoredCount++;
    }

    console.log(`⚡ [Media Storage] Verified and synchronized ${restoredCount}/${allMedia.length} media library assets`);
  } catch (err) {
    console.warn('⚠️ [Media Storage] Warning during startup media restoration:', err);
  }
}

/**
 * Permanently deletes all database documents and settings for a streamer across all collections,
 * while preserving ONLY the user's email address record in the `users` collection.
 */
export async function executePermanentAccountDeletion(userDoc: any): Promise<boolean> {
  if (!userDoc || !userDoc._id) return false;

  const streamerId = String(userDoc.userId || userDoc.id || '').trim();
  const username = String(userDoc.username || '').trim();
  const overlayToken = String(userDoc.overlayToken || userDoc.overlay_token || '').trim();
  const email = String(userDoc.email || '').trim().toLowerCase();

  try {
    const db = await getMongoDb();

    if (streamerId || username || overlayToken) {
      const streamerIdOrUsername: any[] = [];
      if (streamerId) streamerIdOrUsername.push({ streamerId });
      if (username) streamerIdOrUsername.push({ streamerUsername: username });

      const tokenOrIdOrUsername: any[] = [];
      if (streamerId) tokenOrIdOrUsername.push({ streamerToken: streamerId }, { streamerId });
      if (overlayToken) tokenOrIdOrUsername.push({ streamerToken: overlayToken });
      if (username) tokenOrIdOrUsername.push({ streamerUsername: username });

      // 1. Delete donations & temporary donations
      if (streamerIdOrUsername.length > 0) {
        await db.collection('donations').deleteMany({ $or: streamerIdOrUsername }).catch(() => {});
        await db.collection('temporary_donations').deleteMany({ $or: streamerIdOrUsername }).catch(() => {});
      }

      // 2. Delete streamer-scoped settings & widgets
      if (streamerId) {
        await db.collection('alert_settings').deleteMany({ streamerId }).catch(() => {});
        await db.collection('payment_settings').deleteMany({ streamerId }).catch(() => {});
        await db.collection('video_alert_settings').deleteMany({ streamerId }).catch(() => {});
        await db.collection('alert_boxes').deleteMany({ userId: streamerId }).catch(() => {});
        await db.collection('overlays').deleteMany({ userId: streamerId }).catch(() => {});
        await db.collection('overlay_token_history').deleteMany({ streamerId }).catch(() => {});
        await db.collection('stream_timers').deleteMany({ streamerId }).catch(() => {});
        await db.collection('stream_leaderboards').deleteMany({ streamerId }).catch(() => {});
        await db.collection('stream_soundboards').deleteMany({ streamerId }).catch(() => {});
        await db.collection('stream_soundboard_items').deleteMany({ streamerId }).catch(() => {});
        await db.collection('pokemon_widget_settings').deleteMany({ streamerId }).catch(() => {});
        await db.collection('mailbox_messages').deleteMany({ streamerId }).catch(() => {});
        await db.collection('issue_reports').deleteMany({ streamerId }).catch(() => {});
        await db.collection('voice_clones').deleteMany({ userId: streamerId }).catch(() => {});
        await db.collection('telegram_sessions').deleteMany({ streamerId }).catch(() => {});
        await db.collection('telegram_monitored_groups').deleteMany({ streamerId }).catch(() => {});
        await db.collection('gateway_settings').deleteMany({
          $or: [{ _id: `khqr_${streamerId}` as any }, { streamerId }]
        }).catch(() => {});

        // Delete support tickets, their messages, and uploaded attachment folders
        const tickets = await db.collection('support_tickets').find({ streamerId }).toArray().catch(() => []);
        if (tickets.length > 0) {
          const ticketIds = tickets.map((t: any) => t.id).filter(Boolean);
          if (ticketIds.length > 0) {
            await db.collection('ticket_messages').deleteMany({
              $or: [{ ticketId: { $in: ticketIds } }, { ticket_id: { $in: ticketIds } }]
            }).catch(() => {});
            const uploadsTicketsRoot = path.resolve(process.cwd(), 'public', 'uploads', 'tickets');
            for (const tid of ticketIds) {
              const safeDir = String(tid).replace(/[^a-zA-Z0-9_-]/g, '');
              if (safeDir) {
                const resolvedDir = path.resolve(uploadsTicketsRoot, safeDir);
                if (resolvedDir.startsWith(uploadsTicketsRoot + path.sep)) {
                  await fs.promises.rm(resolvedDir, { recursive: true, force: true }).catch(() => {});
                }
              }
            }
          }
          await db.collection('support_tickets').deleteMany({ streamerId }).catch(() => {});
        }
      }

      // 3. Delete token/username-scoped widgets (goals, chat, subscribers, wheel)
      if (tokenOrIdOrUsername.length > 0) {
        await db.collection('stream_goals').deleteMany({ $or: tokenOrIdOrUsername }).catch(() => {});
        await db.collection('stream_chat_settings').deleteMany({ $or: tokenOrIdOrUsername }).catch(() => {});
        await db.collection('subscriber_settings').deleteMany({ $or: tokenOrIdOrUsername }).catch(() => {});
        await db.collection('subscribers').deleteMany({ $or: tokenOrIdOrUsername }).catch(() => {});
        await db.collection('wheel_settings').deleteMany({ $or: tokenOrIdOrUsername }).catch(() => {});
      }

      // 4. Delete media library files from disk and MongoDB
      const mediaOr: any[] = [];
      if (streamerId) mediaOr.push({ userId: streamerId });
      if (email) mediaOr.push({ userEmail: email });
      if (mediaOr.length > 0) {
        const userMedia = await db.collection('media').find({ $or: mediaOr }).toArray().catch(() => []);
        for (const m of userMedia) {
          if (m.storedFilename) {
            const diskPath = path.join(process.cwd(), 'public', 'uploads', 'media', m.storedFilename);
            try {
              if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
            } catch (_) {}
          }
        }
        await db.collection('media').deleteMany({ $or: mediaOr }).catch(() => {});
      }
    }

    // 5. Replace the user document in `users` so ONLY the email address record remains stored
    const usersCol = await getUsersCollection();
    if (email) {
      await usersCol.replaceOne(
        { _id: userDoc._id },
        { email } as any
      );
    } else {
      await usersCol.deleteOne({ _id: userDoc._id });
    }

    console.log(`🗑️ [Account Deletion] Permanently deleted account data for ${email || streamerId} (retained email record only).`);
    return true;
  } catch (err) {
    console.error('[Account Deletion] Error executing permanent account deletion:', err);
    return false;
  }
}

/**
 * Checks for any accounts whose 7-day deletion grace period has expired
 * and executes permanent deletion on them.
 */
export async function processExpiredAccountDeletions(): Promise<number> {
  try {
    const usersCol = await getUsersCollection();
    const pendingUsers = await usersCol
      .find({ deletionStatus: 'pending' })
      .toArray();

    if (pendingUsers.length === 0) return 0;

    const nowMs = Date.now();
    let deletedCount = 0;

    for (const u of pendingUsers) {
      if (!u.deletionScheduledAt) continue;
      const scheduledMs = new Date(u.deletionScheduledAt).getTime();
      if (!isNaN(scheduledMs) && scheduledMs <= nowMs) {
        const ok = await executePermanentAccountDeletion(u);
        if (ok) deletedCount++;
      }
    }

    return deletedCount;
  } catch (err) {
    console.warn('[Account Deletion] Warning checking expired account deletions:', err);
    return 0;
  }
}

/**
 * Background worker:
 * 1. Downgrades expired Pro subscriptions (past their 12:00 AM midnight expiration) to Free plan,
 *    and sends the plan expired notification email to review their subscription.
 * 2. Scans for Pro plans expiring within 3 days and sends the 3-day reminder email.
 */
export async function processPlanExpirationsAndReminders(): Promise<void> {
  try {
    const usersCol = await getUsersCollection();
    const now = new Date();
    const nowIso = now.toISOString();

    // Dynamically import email functions to avoid circular references
    const { sendProPlanExpiredEmail, sendProPlanExpiringSoonEmail } = await import('@/server/services/emailService');

    // 1. Process Expired Pro Users (planExpiresAt <= now)
    const expiredUsers = await usersCol
      .find({
        plan: 'pro',
        planExpiresAt: { $ne: null, $lte: nowIso }
      })
      .toArray();

    for (const u of expiredUsers) {
      try {
        const expiredDateIso = u.planExpiresAt;

        // Downgrade user back to free plan and reset limits
        await usersCol.updateOne(
          { _id: u._id },
          {
            $set: {
              plan: 'free',
              dailyTokensLimit: DEFAULT_DAILY_TOKENS, // 2,000
              planExpiresAt: null,
              planStartedAt: null,
              planDurationDays: 0,
              trialActive: false,
              trialEnded: true,
              proExpiredEmailSentFor: expiredDateIso,
              updatedAt: new Date()
            }
          }
        );

        // Send expired email notification
        if (u.email && u.proExpiredEmailSentFor !== expiredDateIso) {
          sendProPlanExpiredEmail({
            toEmail: u.email,
            displayName: u.displayName || u.username,
            username: u.username,
            planExpiresAt: expiredDateIso || new Date()
          }).catch((err) => {
            console.error(`⚠️ [Plan Expiry] Failed to send expired email to ${u.email}:`, err);
          });
          console.log(`📧 [Plan Expiry] Transitioned @${u.username} (${u.email}) to Free Plan and queued expiry review email.`);
        }
      } catch (err) {
        console.error(`❌ [Plan Expiry] Error processing expired user ${u.username}:`, err);
      }
    }

    // 2. Process Pro Users Expiring within 3 Days (now < planExpiresAt <= now + 3 days)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const threeDaysIso = threeDaysFromNow.toISOString();

    const expiringSoonUsers = await usersCol
      .find({
        plan: 'pro',
        planExpiresAt: { $gt: nowIso, $lte: threeDaysIso }
      })
      .toArray();

    for (const u of expiringSoonUsers) {
      try {
        const expIso = u.planExpiresAt;
        if (!expIso) continue;

        // Ensure reminder is sent strictly once per specific plan expiration date
        if (u.proExpiryReminderSentFor === expIso) {
          continue;
        }

        const expMs = new Date(expIso).getTime();
        const daysLeft = Math.max(1, Math.ceil((expMs - now.getTime()) / (1000 * 60 * 60 * 24)));

        // Record reminder sent
        await usersCol.updateOne(
          { _id: u._id },
          {
            $set: {
              proExpiryReminderSentFor: expIso,
              proExpiryReminderSentAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        if (u.email) {
          sendProPlanExpiringSoonEmail({
            toEmail: u.email,
            displayName: u.displayName || u.username,
            username: u.username,
            daysLeft,
            planExpiresAt: expIso
          }).catch((err) => {
            console.error(`⚠️ [Plan Reminder] Failed to send 3-day reminder email to ${u.email}:`, err);
          });
          console.log(`📧 [Plan Reminder] Sent 3-day expiry reminder to @${u.username} (${u.email}), expiring in ${daysLeft} days.`);
        }
      } catch (err) {
        console.error(`❌ [Plan Reminder] Error processing expiring user ${u.username}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ [processPlanExpirationsAndReminders] Global error:', err);
  }
}

// ============================================================================
// DAILY TOKEN USAGE SYSTEM (Free: 2,000 / Pro: 20,000 Daily Tokens with Daily Reset)
// ============================================================================

export const DEFAULT_DAILY_TOKENS = 2000;
export const PRO_DAILY_TOKENS = 20000; // 10x token allowance for Pro plan users (2,000 * 10)
export const ULTRA_DAILY_TOKENS = -1; // Unlimited token allowance for Ultra plan users

/**
 * Helper to check if a user qualifies for the Ultra plan (unlimited tokens, 100MB storage).
 */
export function isUltraUser(user: any): boolean {
  if (!user) return false;
  const plan = String(user.plan || '').toLowerCase();
  if (plan === 'ultra') {
    if (user.planExpiresAt) {
      const expMs = new Date(user.planExpiresAt).getTime();
      if (!isNaN(expMs) && expMs <= Date.now()) {
        return false;
      }
    }
    return true;
  }
  return false;
}

/**
 * Helper to check if a user qualifies for the Pro plan benefits (Pro subscription, active trial, ultra, or admin).
 */
export function isProUser(user: any): boolean {
  if (!user) return false;
  if (user.isAdmin || user.role === 'admin') return true;

  // Active 7-Day Free Pro Trial
  if (user.trialActive) {
    if (user.trialEndDate) {
      const endMs = new Date(user.trialEndDate).getTime();
      if (!isNaN(endMs) && endMs <= Date.now()) {
        return false;
      }
    }
    return true;
  }

  // Active Pro or Ultra Subscription
  const plan = String(user.plan || '').toLowerCase();
  if (plan === 'pro' || plan === 'premium' || plan === 'trial' || plan === 'ultra') {
    if (user.planExpiresAt) {
      const expMs = new Date(user.planExpiresAt).getTime();
      if (!isNaN(expMs) && expMs <= Date.now()) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Returns the effective daily token limit based on user's active plan.
 * Free Plan: 2,000 daily tokens
 * Pro Plan (and active trial): 20,000 daily tokens (10x multiplier)
 */
export function getUserDailyTokenLimit(user: any): number {
  if (isProUser(user)) {
    if (typeof user?.dailyTokensLimit === 'number' && user.dailyTokensLimit > PRO_DAILY_TOKENS) {
      return user.dailyTokensLimit;
    }
    return PRO_DAILY_TOKENS;
  }

  if (typeof user?.dailyTokensLimit === 'number' && user.dailyTokensLimit > 0 && user.dailyTokensLimit !== PRO_DAILY_TOKENS) {
    return user.dailyTokensLimit;
  }

  return DEFAULT_DAILY_TOKENS;
}

/**
 * Global Daily Reset Time: 2:00 PM (14:00) Singapore Time (Asia/Singapore, UTC+8).
 * In UTC, this is exactly 06:00:00 UTC (14:00 - 8 hours).
 */
export const GLOBAL_RESET_HOUR_UTC = 6;

/**
 * Calculates the exact 12:00 AM midnight expiration date in Cambodia / Singapore timezone (UTC+7 / UTC+8).
 * Defaults to Asia/Phnom_Penh (UTC+7).
 * For example, if a plan is activated/extended today for 31 days:
 * The expiration occurs at exactly 12:00 AM midnight (00:00:00.000 local time) on the end date.
 */
export function calculateMidnightPlanExpiration(
  days: number,
  fromDate = new Date(),
  timezoneOffsetHours = 7
): Date {
  const localTimeMs = fromDate.getTime() + timezoneOffsetHours * 60 * 60 * 1000;
  const localDate = new Date(localTimeMs);

  const targetYear = localDate.getUTCFullYear();
  const targetMonth = localDate.getUTCMonth();
  const targetDay = localDate.getUTCDate() + days;

  // Local 00:00:00.000 (12:00 AM Midnight) converted back to UTC
  const localMidnightUtc = Date.UTC(targetYear, targetMonth, targetDay, 0 - timezoneOffsetHours, 0, 0, 0);
  return new Date(localMidnightUtc);
}

/**
 * Returns the Date timestamp of the NEXT 2:00 PM Singapore Time (06:00 UTC) reset.
 */
export function getNextSingaporeResetTime(now = new Date()): Date {
  const resetToday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    GLOBAL_RESET_HOUR_UTC,
    0,
    0,
    0
  ));

  if (now.getTime() >= resetToday.getTime()) {
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      GLOBAL_RESET_HOUR_UTC,
      0,
      0,
      0
    ));
  }

  return resetToday;
}

/**
 * Returns the current cycle identifier (YYYY-MM-DD) anchored at 2:00 PM Singapore Time (06:00 UTC).
 * If current time is before 2:00 PM SGT, it belongs to yesterday's cycle.
 * If current time is at or after 2:00 PM SGT, it belongs to today's cycle.
 */
export function getGlobalResetCycleKey(now = new Date()): string {
  const resetToday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    GLOBAL_RESET_HOUR_UTC,
    0,
    0,
    0
  ));

  if (now.getTime() < resetToday.getTime()) {
    const yesterday = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 1,
      GLOBAL_RESET_HOUR_UTC,
      0,
      0,
      0
    ));
    return yesterday.toISOString().slice(0, 10);
  }

  return resetToday.toISOString().slice(0, 10);
}

/**
 * Returns the current daily cycle key anchored at 2:00 PM Singapore Time.
 */
export function getTodayDateString(): string {
  return getGlobalResetCycleKey();
}

/**
 * Formats duration until next reset (e.g. "14h 47m", "45m").
 */
export function formatResetDuration(targetDate: Date, now = new Date()): string {
  const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export interface TokenBucket {
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
}

export interface UserTokenStats {
  isPro: boolean;
  isUltra?: boolean;
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
  lastResetDate: string;
  nextResetAt: string;
  free: TokenBucket;
  pro?: TokenBucket;
  ultra?: {
    isUnlimited: boolean;
    remaining: number;
  };
}

/**
 * Computes live token stats for a user document.
 * Free plan: 2,000 daily tokens, resets daily at 2:00 PM SGT.
 * Pro plan: Dual usage limits (Free 2,000 tokens used first, then Pro 20,000 tokens).
 * Ultra plan: Unlimited tokens (no limited token).
 */
export function computeUserTokenStats(user: any): UserTokenStats {
  const today = getTodayDateString();
  const nextResetDate = getNextSingaporeResetTime();
  const userIsUltra = isUltraUser(user);
  const userIsPro = isProUser(user);

  const freeLimit = 2000;
  const proLimit = 20000;

  if (userIsUltra) {
    // Ultra Plan: Unlimited tokens
    const ultraUsed = Math.max(0, Number(user?.dailyTokensUsed ?? 0));
    return {
      isPro: true,
      isUltra: true,
      limit: -1,
      used: ultraUsed,
      remaining: 999999,
      percentage: 100,
      lastResetDate: user?.lastTokenResetDate || today,
      nextResetAt: nextResetDate.toISOString(),
      free: {
        limit: freeLimit,
        used: 0,
        remaining: freeLimit,
        percentage: 100
      },
      pro: {
        limit: proLimit,
        used: 0,
        remaining: proLimit,
        percentage: 100
      },
      ultra: {
        isUnlimited: true,
        remaining: 999999
      }
    };
  }

  if (userIsPro) {
    // 1. Pro tokens reset daily at 2:00 PM SGT
    const isDifferentDayPro = !user?.lastTokenResetDate || user.lastTokenResetDate !== today;
    const proUsed = isDifferentDayPro ? 0 : Math.max(0, Number(user?.proTokensUsed ?? user?.dailyTokensUsed ?? 0));
    const proRemaining = Math.max(0, proLimit - proUsed);
    const proPercentage = Math.max(0, Math.min(100, Math.round((proRemaining / proLimit) * 100)));

    // 2. Free tokens: "the free plan token will stop reseting until the client plan is reset to free back."
    // While on Pro, free tokens DO NOT reset daily. They persist until exhausted or plan reverts to Free.
    const freeUsed = Math.min(freeLimit, Math.max(0, Number(user?.freeTokensUsed ?? (user?.dailyTokensUsed && user.dailyTokensUsed <= 2000 ? user.dailyTokensUsed : 0))));
    const freeRemaining = Math.max(0, freeLimit - freeUsed);
    const freePercentage = Math.max(0, Math.min(100, Math.round((freeRemaining / freeLimit) * 100)));

    const totalLimit = freeLimit + proLimit;
    const totalRemaining = freeRemaining + proRemaining;
    const totalUsed = freeUsed + proUsed;
    const totalPercentage = Math.max(0, Math.min(100, Math.round((totalRemaining / totalLimit) * 100)));

    return {
      isPro: true,
      limit: totalLimit,
      used: totalUsed,
      remaining: totalRemaining,
      percentage: totalPercentage,
      lastResetDate: isDifferentDayPro ? today : (user?.lastTokenResetDate || today),
      nextResetAt: nextResetDate.toISOString(),
      free: {
        limit: freeLimit,
        used: freeUsed,
        remaining: freeRemaining,
        percentage: freePercentage
      },
      pro: {
        limit: proLimit,
        used: proUsed,
        remaining: proRemaining,
        percentage: proPercentage
      }
    };
  } else {
    // Free plan: 2,000 tokens resetting daily at 2:00 PM SGT
    const isDifferentDay = !user?.lastTokenResetDate || user.lastTokenResetDate !== today;
    const freeUsed = isDifferentDay ? 0 : Math.max(0, Number(user?.freeTokensUsed ?? user?.dailyTokensUsed ?? 0));
    const freeRemaining = Math.max(0, freeLimit - freeUsed);
    const freePercentage = Math.max(0, Math.min(100, Math.round((freeRemaining / freeLimit) * 100)));

    return {
      isPro: false,
      limit: freeLimit,
      used: freeUsed,
      remaining: freeRemaining,
      percentage: freePercentage,
      lastResetDate: isDifferentDay ? today : (user?.lastTokenResetDate || today),
      nextResetAt: nextResetDate.toISOString(),
      free: {
        limit: freeLimit,
        used: freeUsed,
        remaining: freeRemaining,
        percentage: freePercentage
      }
    };
  }
}

/**
 * Fetches token stats for a streamer by userId, username, or overlayToken.
 * Automatically synchronizes daily reset in the database if a new day has arrived.
 */
export async function getUserTokenStats(userIdOrOverlayToken: string): Promise<UserTokenStats> {
  const defaultStats = computeUserTokenStats(null);
  if (!userIdOrOverlayToken) return defaultStats;

  try {
    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({
      $or: [
        { userId: userIdOrOverlayToken },
        { id: userIdOrOverlayToken as any },
        { username: userIdOrOverlayToken },
        { overlayToken: userIdOrOverlayToken },
        { overlay_token: userIdOrOverlayToken }
      ]
    });

    if (!user) return defaultStats;

    const stats = computeUserTokenStats(user);
    const today = getTodayDateString();

    // If day changed, synchronize daily reset in MongoDB
    if (user.lastTokenResetDate !== today) {
      const updateFields: any = {
        lastTokenResetDate: today,
        updatedAt: new Date()
      };
      if (stats.isPro) {
        // Pro plan: proTokensUsed resets to 0 daily; freeTokensUsed does NOT reset on Pro!
        updateFields.proTokensUsed = 0;
        updateFields.dailyTokensUsed = 0;
        updateFields.dailyTokensLimit = 20000;
      } else {
        // Free plan: freeTokensUsed resets to 0 daily
        updateFields.freeTokensUsed = 0;
        updateFields.dailyTokensUsed = 0;
        updateFields.dailyTokensLimit = 2000;
      }

      await usersCol.updateOne({ _id: user._id }, { $set: updateFields }).catch(() => {});
    }

    return stats;
  } catch (err) {
    console.warn('[Tokens] Error fetching token stats:', err);
    return defaultStats;
  }
}

/**
 * Deducts tokens from a user's daily allowance.
 * Pro users consume the Free bucket first, then transition to Pro tokens.
 * The Free bucket stops resetting daily while on Pro; Pro tokens reset daily.
 */
export async function deductUserTokens(
  streamerIdOrToken: string,
  cost: number
): Promise<{ success: boolean; stats: UserTokenStats; error?: string }> {
  const today = getTodayDateString();
  const emptyStats = computeUserTokenStats(null);

  if (!streamerIdOrToken || cost <= 0) {
    return { success: true, stats: emptyStats };
  }

  try {
    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({
      $or: [
        { userId: streamerIdOrToken },
        { id: streamerIdOrToken as any },
        { username: streamerIdOrToken },
        { overlayToken: streamerIdOrToken },
        { overlay_token: streamerIdOrToken }
      ]
    });

    if (!user) {
      return {
        success: false,
        stats: emptyStats,
        error: 'User not found'
      };
    }

    const currentStats = computeUserTokenStats(user);

    if (currentStats.isUltra) {
      // ULTRA PLAN: Unlimited tokens (no token deduction required)
      return { success: true, stats: currentStats };
    }

    if (currentStats.isPro) {
      // PRO PLAN DEDUCTION:
      const freeRemaining = currentStats.free.remaining;
      const proRemaining = currentStats.pro ? currentStats.pro.remaining : 0;
      const totalRemaining = freeRemaining + proRemaining;

      if (totalRemaining < cost) {
        return {
          success: false,
          stats: currentStats,
          error: `Insufficient tokens. Required: ${cost}, Available: ${totalRemaining}`
        };
      }

      let newFreeUsed = currentStats.free.used;
      let newProUsed = currentStats.pro ? currentStats.pro.used : 0;

      // Consume Free tokens first; if exhausted, continue to Pro tokens
      if (freeRemaining >= cost) {
        newFreeUsed += cost;
      } else if (freeRemaining > 0) {
        const fromFree = freeRemaining;
        const fromPro = cost - fromFree;
        newFreeUsed += fromFree; // Free bucket fully exhausted (2,000 / 2,000)
        newProUsed += fromPro;
      } else {
        newProUsed += cost;
      }

      const updatedUserDoc = {
        ...user,
        freeTokensUsed: newFreeUsed,
        proTokensUsed: newProUsed,
        dailyTokensUsed: newProUsed,
        lastTokenResetDate: today
      };

      const newStats = computeUserTokenStats(updatedUserDoc);

      await usersCol.updateOne(
        { _id: user._id },
        {
          $set: {
            freeTokensUsed: newFreeUsed,
            proTokensUsed: newProUsed,
            dailyTokensUsed: newProUsed,
            dailyTokensLimit: 20000,
            lastTokenResetDate: today,
            updatedAt: new Date()
          }
        }
      );

      return {
        success: true,
        stats: newStats
      };
    } else {
      // FREE PLAN DEDUCTION:
      const freeRemaining = currentStats.free.remaining;
      if (freeRemaining < cost) {
        return {
          success: false,
          stats: currentStats,
          error: `Insufficient daily tokens. Required: ${cost}, Remaining: ${freeRemaining}`
        };
      }

      const newFreeUsed = currentStats.free.used + cost;
      const updatedUserDoc = {
        ...user,
        freeTokensUsed: newFreeUsed,
        dailyTokensUsed: newFreeUsed,
        lastTokenResetDate: today
      };

      const newStats = computeUserTokenStats(updatedUserDoc);

      await usersCol.updateOne(
        { _id: user._id },
        {
          $set: {
            freeTokensUsed: newFreeUsed,
            dailyTokensUsed: newFreeUsed,
            dailyTokensLimit: 2000,
            lastTokenResetDate: today,
            updatedAt: new Date()
          }
        }
      );

      return {
        success: true,
        stats: newStats
      };
    }
  } catch (err: any) {
    console.error('[Tokens] Error deducting tokens:', err);
    return {
      success: false,
      stats: emptyStats,
      error: err.message || 'Error deducting tokens'
    };
  }
}

