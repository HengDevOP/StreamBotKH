export interface SubscriberAlertSettings {
  isEnabled?: boolean;
  templateStyle?: 'neon-box' | 'glass-hologram' | 'cyber-glitch' | 'arcade' | 'minimal';
  showImage?: boolean;
  mediaUrl?: string;
  soundUrl?: string;
  soundVolume?: number;
  durationSeconds?: number;
  glowColor?: string;
  fontFamily?: string;
  fontSize?: number;
  textTemplate?: string;
  textColor?: string;
  subscriberColor?: string;
  tierColor?: string;
  layoutMode?: 'top' | 'left' | 'right' | 'banner';
  animationStyle?: string;
  ttsEnabled?: boolean;
  ttsType?: 'google' | 'google-male' | 'kiritts-male' | 'kiritts-female' | 'cloned';
  clonedVoiceName?: string;
  clonedVoiceSampleUrl?: string;
}

export interface SubscriberTier {
  id: string;
  name: string;
  price: number;
  currency: 'USD' | 'KHR';
  badgeText: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeIcon?: string;
  badgeGifUrl?: string;
  badgeImage?: string;
  perks?: string[];
  description?: string;
  enabled?: boolean;
  order?: number;
  alertSettings?: SubscriberAlertSettings;
}

export interface SubscriberItem {
  id: string;
  streamerToken?: string;
  subscriberName: string;
  youtubeHandle?: string;
  tierId: string;
  tierName: string;
  price?: number;
  currency?: 'USD' | 'KHR';
  badgeText?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeIcon?: string;
  badgeGifUrl?: string;
  badgeImage?: string;
  status: 'active' | 'cancelled' | 'expired';
  subscribedAt?: string;
  expiresAt?: string;
  startDate?: string;
  expiryDate?: string;
  totalMonths?: number;
  totalAmountPaid?: number;
  paymentMethod?: string;
  donorMessage?: string;
}

export type SubscriberMember = SubscriberItem;

export interface TelegramOutletGroup {
  chatId: string;
  title: string;
  username?: string;
}

export interface SubscriberSettings {
  streamerToken?: string;
  streamerUsername?: string;
  enabled?: boolean;
  tiers: SubscriberTier[];
  telegramOutletGroup?: TelegramOutletGroup | null;
}

export const DEFAULT_SUBSCRIBER_TIERS: SubscriberTier[] = [];
