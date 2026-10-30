'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  // Synchronous initialization from localStorage prevents flash-of-unauthenticated-state on window refresh
  const [user, setUser] = useState<Streamer | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedToken = localStorage.getItem('streamneon_auth_token');
        const storedUser = localStorage.getItem('streamneon_user');
        if (storedToken && storedUser) {
          return JSON.parse(storedUser);
        }
      } catch (_) {}
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('streamneon_auth_token');
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('streamneon_auth_token');
      const params = new URLSearchParams(window.location.search);
      const hasToken = Boolean(storedToken || params.get('token'));
      if (hasToken) {
        // If user profile is already cached synchronously, not loading
        const storedUser = localStorage.getItem('streamneon_user');
        return !storedUser;
      }
      return false;
    }
    return true;
  });

  const isRefreshingRef = useRef<boolean>(false);

  const refreshUser = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      if (typeof window !== 'undefined' && localStorage.getItem('streamneon_auth_token')) {
        const profile = await authService.getMe();
        setUser(profile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('streamneon_user', JSON.stringify(profile));
        }
      } else {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('streamneon_user');
        }
      }
    } catch (err: any) {
      console.warn('Session refresh check notice:', err?.message || err);
      // ONLY log out if the server explicitly responded with 401 Unauthorized
      // Aborted requests (e.g. from page reload / spam reload), network timeouts, or server 5xx errors MUST NOT log out the user!
      const isExplicitUnauthorized =
        err?.status === 401 ||
        err?.message?.includes('401') ||
        err?.message?.toLowerCase().includes('unauthorized') ||
        err?.message?.toLowerCase().includes('invalid token') ||
        err?.message?.toLowerCase().includes('jwt expired');

      if (isExplicitUnauthorized) {
        console.warn('Session expired or unauthorized. Logging out.');
        authService.logout();
        setToken(null);
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('streamneon_user');
        }
      } else {
        // Transient error or page reload abort: Keep existing token and cached user!
        console.log('Preserving cached session across transient reload / network event.');
      }
    } finally {
      isRefreshingRef.current = false;
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
        localStorage.setItem('streamneon_user', JSON.stringify(res.user));
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('streamneon_user');
    }
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
