'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Streamer } from '../types/streamer';
import { authService } from '../services/authService';

interface AuthContextType {
  user: Streamer | null;
  token: string | null;
  loading: boolean;
  loginWithGoogleRedirect: () => void;
  loginWithGoogle: (credential?: string, code?: string) => Promise<void>;
  setTokenAndRefresh: (newToken: string) => Promise<void>;
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
      const params = new URLSearchParams(window.location.search);
      const callbackToken = params.get('token');

      if (callbackToken) {
        localStorage.setItem('streamneon_auth_token', callbackToken);
        setToken(callbackToken);

        // Clean ?token=... from URL
        params.delete('token');
        const newQuery = params.toString();
        const cleanUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', cleanUrl);
      } else {
        const stored = localStorage.getItem('streamneon_auth_token');
        if (stored) {
          setToken(stored);
        }
      }
    }
    refreshUser();

    // Fail-safe: auth loading state should never block window beyond 5s
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => clearTimeout(safetyTimer);
  }, []);

  const loginWithGoogleRedirect = () => {
    authService.initiateGoogleOAuth();
  };

  const loginWithGoogle = async (credential?: string, code?: string) => {
    setLoading(true);
    try {
      const res = await authService.googleLogin(credential, code);
      if (typeof window !== 'undefined') {
        localStorage.setItem('streamneon_auth_token', res.token);
      }
      setToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const setTokenAndRefresh = async (newToken: string) => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('streamneon_auth_token', newToken);
      }
      setToken(newToken);
      await refreshUser();
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
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginWithGoogleRedirect,
        loginWithGoogle,
        setTokenAndRefresh,
        logout,
        refreshUser
      }}
    >
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
