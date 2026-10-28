import { request } from './api';
import { Streamer } from '../types/streamer';

export interface AuthResponse {
  token: string;
  user: Streamer;
}

export interface GoogleOAuthConfigResponse {
  configured: boolean;
  redirectUri: string;
}

export const authService = {
  initiateGoogleOAuth() {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      window.location.href = `/api/auth/google?origin=${encodeURIComponent(origin)}`;
    }
  },

  async getGoogleConfig(): Promise<GoogleOAuthConfigResponse> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return request<GoogleOAuthConfigResponse>(`/auth/google?config=1&origin=${encodeURIComponent(origin)}`);
  },

  async googleLogin(credential?: string, code?: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, code })
    });
  },

  async getMe(): Promise<Streamer> {
    return request<Streamer>('/auth/me');
  },

  logout() {
    localStorage.removeItem('streamneon_auth_token');
  }
};
