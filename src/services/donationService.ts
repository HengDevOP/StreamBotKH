import { request } from './api';
import { CreateDonationRequest, CreateDonationResponse, Donation } from '../types/donation';

export interface PublicStreamerInfo {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  plan?: 'free' | 'pro' | string;
  glowColor: string;
  minAmountAlert: number;
  ttsMinAmount: number;
  bakongAccountName: string;
  isSandbox: boolean;
  hasVideoOverlay?: boolean;
  videoAlertEnabled?: boolean;
  videoMinTipAmount?: number;
  videoMaxDurationSeconds?: number;
  customThanksMessage?: string;
  isVerified?: boolean;
}

export const donationService = {
  async getPublicStreamer(username: string): Promise<PublicStreamerInfo> {
    return request<PublicStreamerInfo>(`/donations/streamer/${username}`);
  },

  async createDonation(data: CreateDonationRequest): Promise<CreateDonationResponse> {
    return request<CreateDonationResponse>('/donations/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getDonationStatus(id: string): Promise<Donation> {
    return request<Donation>(`/donations/${id}/status`);
  },

  async getStreamerRecentDonations(username: string): Promise<Donation[]> {
    return request<Donation[]>(`/donations/streamer/${username}/recent`);
  },

  async simulatePayment(donationId: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/payway/simulate', {
      method: 'POST',
      body: JSON.stringify({ donationId })
    });
  }
};
