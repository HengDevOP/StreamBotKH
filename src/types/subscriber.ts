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
}

export interface SubscriberItem {
  id: string;
  subscriberName: string;
  youtubeHandle?: string;
  tierId: string;
  tierName: string;
  price: number;
  currency: 'USD' | 'KHR';
  badgeText?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeIcon?: string;
  badgeGifUrl?: string;
  badgeImage?: string;
  status: 'active' | 'cancelled' | 'expired';
  subscribedAt: string;
  expiresAt: string;
  paymentMethod?: string;
  donorMessage?: string;
}

export const DEFAULT_SUBSCRIBER_TIERS: SubscriberTier[] = [];
