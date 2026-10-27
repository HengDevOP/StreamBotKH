import { request } from './api';
import { StreamerDashboardStats, PaymentSettings } from '../types/streamer';
import { AlertSettings } from '../types/alert';

export const streamerService = {
  async getDashboard(): Promise<StreamerDashboardStats> {
    return request<StreamerDashboardStats>('/streamer/dashboard');
  },

  async getAlertSettings(): Promise<AlertSettings> {
    return request<AlertSettings>('/streamer/alerts');
  },

  async updateAlertSettings(settings: Partial<AlertSettings>): Promise<{ success: boolean; settings: AlertSettings }> {
    return request<{ success: boolean; settings: AlertSettings }>('/streamer/alerts', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  async getPaymentSettings(): Promise<PaymentSettings> {
    return request<PaymentSettings>('/streamer/payments');
  },

  async updatePaymentSettings(settings: Partial<PaymentSettings>): Promise<{ success: boolean; settings: PaymentSettings }> {
    return request<{ success: boolean; settings: PaymentSettings }>('/streamer/payments', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  async regenerateToken(): Promise<{ success: boolean; overlayToken: string }> {
    return request<{ success: boolean; overlayToken: string }>('/streamer/token/regenerate', {
      method: 'POST'
    });
  },

  async triggerTestAlert(custom?: { donorName?: string; donorMessage?: string; amount?: number }): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/streamer/alerts/test', {
      method: 'POST',
      body: JSON.stringify(custom || {})
    });
  },

  async updateProfile(profile: {
    username?: string;
    description?: string;
    bio?: string;
    displayName?: string;
    avatarUrl?: string;
    plan?: string;
  }): Promise<{ success: boolean; user: any }> {
    return request<{ success: boolean; user: any }>('/streamer/profile', {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
  }
};
