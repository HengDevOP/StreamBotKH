export interface Streamer {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  overlayToken: string;
  telegramChatId?: string;
  telegramPairingCode?: string;
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
