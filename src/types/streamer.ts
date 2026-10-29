export interface SocialLink {
  id: string;
  url: string;
  title?: string;
  platform?: string;
  icon?: string;
}

export interface Streamer {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  socialLinks?: SocialLink[];
  links?: SocialLink[];
  plan?: string;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
  planDurationDays?: number;
  isAdmin?: boolean;
  overlayToken: string;
  telegramChatId?: string;
  telegramPairingCode?: string;
  customThanksMessage?: string;
  isVerified?: boolean;
  createdAt?: string;
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
    today: TimeframeMetrics;
    '1d': TimeframeMetrics;
    '3d': TimeframeMetrics;
    'last_week': TimeframeMetrics;
    'last_month': TimeframeMetrics;
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
