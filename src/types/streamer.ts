export interface SocialLink {
  id: string;
  url: string;
  title?: string;
  platform?: string;
  icon?: string;
}

export interface TokenBucket {
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
}

export interface TokenUsage {
  isPro?: boolean;
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
  lastResetDate?: string;
  nextResetAt?: string;
  free?: TokenBucket;
  pro?: TokenBucket;
}

export interface Streamer {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  socialLinks?: SocialLink[];
  links?: SocialLink[];
  plan?: string;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
  planDurationDays?: number;
  trialActive?: boolean;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  hasUsedTrial?: boolean;
  trialRemainingDays?: number;
  isAdmin?: boolean;
  overlayToken: string;
  telegramChatId?: string;
  telegramPairingCode?: string;
  customThanksMessage?: string;
  isVerified?: boolean;
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
  broadcastViewCount?: {
    enabledPlatforms?: ('youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick' | 'instagram')[];
    manualViewers?: number;
    showLiveDot?: boolean;
    showLabel?: boolean;
    theme?: string;
  };
  tokenUsage?: TokenUsage;
  deletionStatus?: 'pending' | 'deleted' | null;
  deletionRequestedAt?: string | null;
  deletionScheduledAt?: string | null;
  createdAt?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin' | 'system';
  senderAvatar?: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber?: number;
  streamerId: string;
  streamerUsername?: string;
  streamerDisplayName?: string;
  streamerEmail?: string;
  streamerAvatar?: string;
  title: string;
  category: 'general' | 'technical' | 'payment' | 'overlay' | 'feature' | 'other' | string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'claimed' | 'resolved' | 'closed';
  claimedById?: string | null;
  claimedByName?: string | null;
  claimedByAvatar?: string | null;
  claimedAt?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueReport {
  id: string;
  streamerId: string;
  streamerUsername: string;
  streamerDisplayName: string;
  streamerEmail: string;
  streamerAvatar?: string;
  title: string;
  category: 'bug' | 'plan_upgrade' | 'payment' | 'feature' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeframeMetrics {
  usd: number;
  khr: number;
  count: number;
  avgPerDayUsd: number;
  avgPerDayKhr: number;
  potentialMonthlyUsd: number;
  potentialMonthlyKhr: number;
}

export interface StreamerDashboardStats {
  summary: {
    totalRevenueUsd: number;
    totalRevenueKhr: number;
    totalDonationsCount: number;
    todayRevenueUsd: number;
    todayRevenueKhr: number;
    todayDonationsCount: number;
  };
  timeframeAnalytics?: {
    today?: TimeframeMetrics;
    yesterday?: TimeframeMetrics;
    '1d'?: TimeframeMetrics;
    '3d'?: TimeframeMetrics;
    this_week?: TimeframeMetrics;
    last_week?: TimeframeMetrics;
    this_month?: TimeframeMetrics;
    last_month?: TimeframeMetrics;
    '3_months'?: TimeframeMetrics;
    '6_months'?: TimeframeMetrics;
    lifetime?: TimeframeMetrics;
    [key: string]: TimeframeMetrics | undefined;
  };
  topDonors: Array<{
    donor_name: string;
    total_usd_equiv: number;
    donations_count: number;
  }>;
  recentDonations: Array<{
    id: string;
    donor_name: string;
    donor_message?: string;
    amount: number;
    currency: 'USD' | 'KHR';
    banking_name?: string;
    payment_method: string;
    status: string;
    created_at: string;
    paid_at?: string;
  }>;
  trend: Array<{
    date: string;
    amount_usd: number;
    count: number;
  }>;
}

export interface PaymentSettings {
  streamer_id: string;
  aba_merchant_id: string;
  aba_api_key: string;
  bakong_account_id: string;
  bakong_account_name: string;
  is_sandbox: number;
}
