'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Streamer } from '../types/streamer';
import { authService } from '../services/authService';
import { request } from '../services/api';

interface AuthContextType {
  user: Streamer | null;
  token: string | null;
  loading: boolean;
  loginWithGoogleRedirect: () => void;
  loginWithGoogle: (credential?: string, code?: string) => Promise<void>;
  setTokenAndRefresh: (newToken: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  // Admin impersonation controls
  isImpersonating: boolean;
  impersonatorAdmin: { id?: string; email: string } | null;
  impersonateUser: (targetUserId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initialization from sessionStorage / localStorage prevents flash-of-unauthenticated-state
  const [user, setUser] = useState<Streamer | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedToken = sessionStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_auth_token');
        const storedUser = sessionStorage.getItem('streamneon_user') || localStorage.getItem('streamneon_user');
        if (storedToken && storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed && !parsed.id && parsed.userId) {
            parsed.id = parsed.userId;
          }
          return parsed;
        }
      } catch (_) {}
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_auth_token');
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_auth_token');
      const params = new URLSearchParams(window.location.search);
      const hasToken = Boolean(storedToken || params.get('token') || params.get('impersonate_token'));
      if (hasToken) {
        // If user profile is already cached synchronously, not loading
        const storedUser = sessionStorage.getItem('streamneon_user') || localStorage.getItem('streamneon_user');
        return !storedUser;
      }
      return false;
    }
    return true;
  });

  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(
        sessionStorage.getItem('streamneon_is_impersonating') ||
        sessionStorage.getItem('streamneon_impersonator_admin_user') ||
        localStorage.getItem('streamneon_impersonator_admin_token')
      );
    }
    return false;
  });

  const [impersonatorAdmin, setImpersonatorAdmin] = useState<{ id?: string; email: string } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('streamneon_impersonator_admin_user') || localStorage.getItem('streamneon_impersonator_admin_user');
        return stored ? JSON.parse(stored) : null;
      } catch (_) {}
    }
    return null;
  });

  const isRefreshingRef = useRef<boolean>(false);

  const refreshUser = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      const activeToken = typeof window !== 'undefined'
        ? (sessionStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_auth_token'))
        : null;

      if (activeToken) {
        const profile = await authService.getMe();
        if (profile && !(profile as any).id && (profile as any).userId) {
          (profile as any).id = (profile as any).userId;
        }
        if ((profile as any)?.token && typeof window !== 'undefined') {
          if (sessionStorage.getItem('streamneon_auth_token')) {
            sessionStorage.setItem('streamneon_auth_token', (profile as any).token);
          } else {
            localStorage.setItem('streamneon_auth_token', (profile as any).token);
          }
          setToken((profile as any).token);
        }
        setUser(profile);
        if (typeof window !== 'undefined') {
          if (sessionStorage.getItem('streamneon_auth_token')) {
            sessionStorage.setItem('streamneon_user', JSON.stringify(profile));
          } else {
            localStorage.setItem('streamneon_user', JSON.stringify(profile));
          }
        }
      } else {
        setUser(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('streamneon_user');
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
          sessionStorage.removeItem('streamneon_user');
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
      const impersonateToken = params.get('impersonate_token');
      const impersonatorEmail = params.get('impersonator_email');
      const impersonatorId = params.get('impersonator_id');
      const callbackToken = params.get('token');

      if (impersonateToken) {
        // Window-isolated impersonation session: write ONLY to sessionStorage so parent/admin window is preserved
        sessionStorage.setItem('streamneon_auth_token', impersonateToken);
        sessionStorage.setItem('streamneon_is_impersonating', 'true');
        if (impersonatorEmail || impersonatorId) {
          const adminInfo = {
            id: impersonatorId || '',
            email: impersonatorEmail || 'Admin'
          };
          sessionStorage.setItem('streamneon_impersonator_admin_user', JSON.stringify(adminInfo));
          setImpersonatorAdmin(adminInfo);
        }
        setToken(impersonateToken);
        setIsImpersonating(true);

        // Clean ?impersonate_token=... from URL
        params.delete('impersonate_token');
        params.delete('impersonator_email');
        params.delete('impersonator_id');
        const newQuery = params.toString();
        const cleanUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', cleanUrl);
      } else if (callbackToken) {
        localStorage.setItem('streamneon_auth_token', callbackToken);
        setToken(callbackToken);

        // Clean ?token=... from URL
        params.delete('token');
        const newQuery = params.toString();
        const cleanUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', cleanUrl);
      } else {
        const stored = sessionStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_auth_token');
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

  const impersonateUser = async (targetUserId: string) => {
    setLoading(true);
    try {
      const currentAdminToken = localStorage.getItem('streamneon_auth_token') || token;
      const currentAdminUser = user;

      const res = await request<{
        success: boolean;
        token: string;
        user: Streamer;
        impersonatorAdmin: { id?: string; email: string };
      }>('/admin/impersonate', {
        method: 'POST',
        body: JSON.stringify({ targetUserId })
      });

      if (res && res.token && res.user) {
        if (typeof window !== 'undefined') {
          // Store original admin session only if not already impersonating
          if (!localStorage.getItem('streamneon_impersonator_admin_token')) {
            localStorage.setItem('streamneon_impersonator_admin_token', currentAdminToken || '');
            if (currentAdminUser) {
              localStorage.setItem(
                'streamneon_impersonator_admin_user',
                JSON.stringify({
                  id: currentAdminUser.id,
                  email: currentAdminUser.email,
                  username: currentAdminUser.username,
                  displayName: currentAdminUser.displayName
                })
              );
            }
          }
          localStorage.setItem('streamneon_auth_token', res.token);
          localStorage.setItem('streamneon_user', JSON.stringify(res.user));
        }

        setToken(res.token);
        setUser(res.user);
        setIsImpersonating(true);
        setImpersonatorAdmin(res.impersonatorAdmin);
      }
    } finally {
      setLoading(false);
    }
  };

  const stopImpersonating = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('streamneon_auth_token');
        sessionStorage.removeItem('streamneon_user');
        sessionStorage.removeItem('streamneon_is_impersonating');
        sessionStorage.removeItem('streamneon_impersonator_admin_user');

        const storedAdminToken = localStorage.getItem('streamneon_impersonator_admin_token');
        const storedAdminUser = localStorage.getItem('streamneon_impersonator_admin_user');

        localStorage.removeItem('streamneon_impersonator_admin_token');
        localStorage.removeItem('streamneon_impersonator_admin_user');

        if (storedAdminToken) {
          localStorage.setItem('streamneon_auth_token', storedAdminToken);
          setToken(storedAdminToken);
          if (storedAdminUser) {
            try {
              const parsed = JSON.parse(storedAdminUser);
              localStorage.setItem('streamneon_user', JSON.stringify(parsed));
              setUser(parsed);
            } catch (_) {}
          }
          await refreshUser();
        } else {
          // If this was a sessionStorage-isolated window, check if localStorage has an admin token
          const existingLocalToken = localStorage.getItem('streamneon_auth_token');
          if (existingLocalToken) {
            setToken(existingLocalToken);
            await refreshUser();
          }
        }
      }
      setIsImpersonating(false);
      setImpersonatorAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('streamneon_auth_token');
      sessionStorage.removeItem('streamneon_user');
      sessionStorage.removeItem('streamneon_is_impersonating');
      sessionStorage.removeItem('streamneon_impersonator_admin_user');
      localStorage.removeItem('streamneon_user');
      localStorage.removeItem('streamneon_impersonator_admin_token');
      localStorage.removeItem('streamneon_impersonator_admin_user');
    }
    setToken(null);
    setUser(null);
    setIsImpersonating(false);
    setImpersonatorAdmin(null);
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
        refreshUser,
        isImpersonating,
        impersonatorAdmin,
        impersonateUser,
        stopImpersonating
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
