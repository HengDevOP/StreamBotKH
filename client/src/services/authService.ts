import { request } from './api';
import { Streamer } from '../types/streamer';

export interface AuthResponse {
  token: string;
  user: Streamer;
}

export const authService = {
  async googleLogin(credential: string, email?: string, name?: string, picture?: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, email, name, picture })
    });
  },

  async demoLogin(): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/demo', {
      method: 'POST'
    });
  },

  async getMe(): Promise<Streamer> {
    return request<Streamer>('/auth/me');
  },

  logout() {
    localStorage.removeItem('streamneon_auth_token');
  }
};
