'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Streamer } from '../types/streamer';
import { authService } from '../services/authService';

interface AuthContextType {
  user: Streamer | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: (credential: string, email?: string, name?: string, picture?: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Streamer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('streamneon_auth_token')) {
        const profile = await authService.getMe();
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      authService.logout();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('streamneon_auth_token');
      if (stored) {
        setToken(stored);
      }
    }
    refreshUser();
  }, []);

  const loginWithGoogle = async (credential: string, email?: string, name?: string, picture?: string) => {
    setLoading(true);
    try {
      const res = await authService.googleLogin(credential, email, name, picture);
      if (typeof window !== 'undefined') {
        localStorage.setItem('streamneon_auth_token', res.token);
      }
      setToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async () => {
    setLoading(true);
    try {
      const res = await authService.demoLogin();
      if (typeof window !== 'undefined') {
        localStorage.setItem('streamneon_auth_token', res.token);
      }
      setToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, loginDemo, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
