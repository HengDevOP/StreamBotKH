export interface Donation {
  id: string;
  streamer_id: string;
  donor_name: string;
  donor_message?: string;
  amount: number;
  currency: 'USD' | 'KHR';
  banking_name?: string;
  payment_method: 'BAKONG_KHQR' | 'ABA_PAYWAY' | 'SIMULATOR';
  payway_tran_id?: string;
  bakong_hash?: string;
  video_url?: string;
  video_title?: string;
  video_start_time?: number;
  video_end_time?: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  is_alerted: number;
  is_subscription?: boolean;
  tier_id?: string;
  tier_name?: string;
  badge_text?: string;
  badge_color?: string;
  badge_icon?: string;
  created_at: string;
  paid_at?: string;
}

export interface CreateDonationRequest {
  streamerId: string;
  donorName: string;
  donorMessage?: string;
  amount?: number;
  currency?: 'USD' | 'KHR';
  bankingName?: string;
  videoUrl?: string;
  videoTitle?: string;
  videoStartTime?: number;
  videoEndTime?: number;
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
}

export interface CreateDonationResponse {
  donationId: string;
  amount: number;
  currency: 'USD' | 'KHR';
  bankingName?: string;
  qrString: string;
  qrImage: string;
  abaDeepLink: string;
  bakongDeepLink: string;
  expiresInSeconds: number;
  isSubscription?: boolean;
  tierId?: string;
  tierName?: string;
  badgeText?: string;
  badgeColor?: string;
  badgeIcon?: string;
}
