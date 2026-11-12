'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  ShieldCheck,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { request } from '../../services/api';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';

const USERS_PER_PAGE = 20;
const CLIENT_CACHE_TTL_MS = 60 * 1000;

export interface AdminUserItem {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  plan: string;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
  planDurationDays?: number;
  remainingDays: number;
  trialActive?: boolean;
  hasUsedTrial?: boolean;
  trialRemainingDays?: number;
  isVerified: boolean;
  isAdmin: boolean;
  createdAt?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalMatched: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface AdminUsersResponse {
  users: AdminUserItem[];
  pagination?: PaginationInfo;
  summary: { totalUsers: number; ultraUsers?: number; proUsers: number; freeUsers: number };
  fromCache?: boolean;
}

interface CachedPageEntry {
  timestamp: number;
  data: AdminUsersResponse;
}

const clientUsersPageCache = new Map<string, CachedPageEntry>();

interface AdminUsersManagerProps {
  onCurrentUserPlanUpdated?: () => void;
}

export const AdminUsersManager: React.FC<AdminUsersManagerProps> = ({ onCurrentUserPlanUpdated }) => {
  const { showConfirm } = useModal();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [summary, setSummary] = useState({ totalUsers: 0, ultraUsers: 0, proUsers: 0, freeUsers: 0 });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: USERS_PER_PAGE,
    totalMatched: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'ultra' | 'pro' | 'free'>('ALL');

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inFlightKeyRef = useRef<string | null>(null);

  const loadUsersPage = useCallback(
    async (
      targetPage: number,
      query: string,
      plan: 'ALL' | 'ultra' | 'pro' | 'free',
      options?: { forceRefresh?: boolean }
    ) => {
      const normalizedQuery = query.trim().toLowerCase();
      const cacheKey = `${targetPage}:${USERS_PER_PAGE}:${normalizedQuery}:${plan}`;

      if (!options?.forceRefresh) {
        const cached = clientUsersPageCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
          setUsers(cached.data.users || []);
          setSummary(cached.data.summary || { totalUsers: 0, ultraUsers: 0, proUsers: 0, freeUsers: 0 });
          if (cached.data.pagination) {
            setPagination(cached.data.pagination);
          }
          setLoading(false);
          return;
        }
      }

      if (inFlightKeyRef.current === cacheKey && !options?.forceRefresh) {
        return;
      }
      inFlightKeyRef.current = cacheKey;

      try {
        setLoading(true);
        setErrorMsg(null);

        const params = new URLSearchParams({
          page: String(targetPage),
          limit: String(USERS_PER_PAGE),
          plan
        });
        if (normalizedQuery) {
          params.set('q', normalizedQuery);
        }
        if (options?.forceRefresh) {
          params.set('refresh', '1');
        }

        const data = await request<AdminUsersResponse>(`/admin/users?${params.toString()}`);

        const safePagination: PaginationInfo = data.pagination || {
          page: targetPage,
          limit: USERS_PER_PAGE,
          totalMatched: (data.users || []).length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        };

        const normalizedData: AdminUsersResponse = {
          users: (data.users || []).slice(0, USERS_PER_PAGE),
          pagination: safePagination,
          summary: data.summary || { totalUsers: 0, ultraUsers: 0, proUsers: 0, freeUsers: 0 },
          fromCache: data.fromCache
        };

        clientUsersPageCache.set(cacheKey, {
          timestamp: Date.now(),
          data: normalizedData
        });

        setUsers(normalizedData.users);
        setSummary(normalizedData.summary);
        setPagination(safePagination);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load users');
      } finally {
        if (inFlightKeyRef.current === cacheKey) {
          inFlightKeyRef.current = null;
        }
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadUsersPage(currentPage, committedSearch, planFilter);
  }, [currentPage, committedSearch, planFilter, loadUsersPage]);

  const handleExecuteSearch = () => {
    const trimmed = searchInput.trim();
    if (trimmed === committedSearch && currentPage === 1) {
      loadUsersPage(1, trimmed, planFilter);
      return;
    }
    setCurrentPage(1);
    setCommittedSearch(trimmed);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    if (committedSearch !== '') {
      setCurrentPage(1);
      setCommittedSearch('');
    }
  };

  const handlePlanFilterChange = (nextPlan: 'ALL' | 'ultra' | 'pro' | 'free') => {
    if (nextPlan === planFilter) return;
    setCurrentPage(1);
    setPlanFilter(nextPlan);
  };

  const handleManualRefresh = () => {
    clientUsersPageCache.clear();
    loadUsersPage(currentPage, committedSearch, planFilter, { forceRefresh: true });
  };

  const handleUpdateUserPlan = (
    targetUser: AdminUserItem,
    plan: 'free' | 'pro' | 'ultra',
    durationDays = 31,
    action?: 'set' | 'extend'
  ) => {
    const isExtend = (plan === 'pro' || plan === 'ultra') && action === 'extend';
    const isUltraUpgrade = plan === 'ultra' && action !== 'extend';
    const isProUpgrade = plan === 'pro' && action !== 'extend';

    const modalTitle = isExtend
      ? `Extend ${plan.toUpperCase()} Plan (+${durationDays} Days)?`
      : isUltraUpgrade
      ? `Upgrade @${targetUser.username} to Ultra Plan?`
      : isProUpgrade
      ? `Upgrade @${targetUser.username} to Pro Plan?`
      : `Switch @${targetUser.username} to Free Plan?`;

    const modalMessage = isExtend
      ? `Add +${durationDays} days to @${targetUser.username} (${targetUser.email})'s active ${plan.toUpperCase()} plan.`
      : isUltraUpgrade
      ? `Upgrade @${targetUser.username} (${targetUser.email}) to Ultra Plan (Unlimited tokens, 100MB storage) for ${durationDays} days.`
      : isProUpgrade
      ? `Upgrade @${targetUser.username} (${targetUser.email}) to Pro Plan (20,000 tokens, 20MB storage) for ${durationDays} days.`
      : `Switch @${targetUser.username} (${targetUser.email}) back to the Free Plan (2,000 tokens, 5MB storage).`;

    showConfirm({
      title: modalTitle,
      message: modalMessage,
      type: plan === 'free' ? 'danger' : 'info',
      confirmText: isExtend
        ? `Extend +${durationDays}d`
        : isUltraUpgrade
        ? `Confirm Ultra (${durationDays}d)`
        : isProUpgrade
        ? `Confirm Pro (${durationDays}d)`
        : 'Confirm Free Plan',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setUpdatingId(targetUser.id);
          setErrorMsg(null);
          const res = await request<{ success: boolean; message: string; user: AdminUserItem }>(
            '/admin/users',
            {
              method: 'PUT',
              body: JSON.stringify({ userId: targetUser.id, plan, durationDays, action })
            }
          );

          setToastMsg(res.message);
          setTimeout(() => setToastMsg(null), 3000);

          clientUsersPageCache.clear();
          await loadUsersPage(currentPage, committedSearch, planFilter, { forceRefresh: true });

          if (onCurrentUserPlanUpdated) {
            onCurrentUserPlanUpdated();
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to update user plan');
        } finally {
          setUpdatingId(null);
        }
      }
    });
  };

  const handleInteractAsUser = async (targetUser: AdminUserItem) => {
    // Open blank window immediately on user gesture to prevent browser popup blockers
    const newWindow = window.open('about:blank', '_blank');
    if (newWindow) {
      try {
        newWindow.document.title = `Connecting to @${targetUser.username}...`;
      } catch (_) {}
    }

    try {
      setImpersonatingId(targetUser.id);
      setErrorMsg(null);

      // Issue impersonation token specifically for the new window without affecting current admin window state
      const res = await request<{
        success: boolean;
        token: string;
        user: any;
        impersonatorAdmin: { id?: string; email: string };
      }>('/admin/impersonate', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetUser.id })
      });

      if (!res?.token) {
        throw new Error('Failed to obtain impersonation session token');
      }

      const adminEmail = res.impersonatorAdmin?.email || currentUser?.email || 'admin';
      const adminId = res.impersonatorAdmin?.id || currentUser?.id || '';
      const targetUrl = `/creator?tab=overview&impersonate_token=${encodeURIComponent(res.token)}&impersonator_email=${encodeURIComponent(adminEmail)}&impersonator_id=${encodeURIComponent(adminId)}`;

      if (newWindow && !newWindow.closed) {
        newWindow.location.href = targetUrl;
      } else {
        window.open(targetUrl, '_blank');
      }

      setToastMsg(`Opened @${targetUser.username}'s creator dashboard in a new window`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      if (newWindow && !newWindow.closed) {
        newWindow.close();
      }
      setErrorMsg(err.message || 'Failed to open user session in new window');
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleToggleVerified = (targetUser: AdminUserItem) => {
    const nextVerified = !targetUser.isVerified;
    const modalTitle = nextVerified
      ? `Verify @${targetUser.username}?`
      : `Remove verification from @${targetUser.username}?`;

    const modalMessage = nextVerified
      ? `Grant official Verified Creator badge to @${targetUser.username} (${targetUser.email}).`
      : `Revoke Verified Creator badge from @${targetUser.username} (${targetUser.email}).`;

    showConfirm({
      title: modalTitle,
      message: modalMessage,
      type: nextVerified ? 'info' : 'danger',
      confirmText: nextVerified ? 'Verify Creator' : 'Remove Badge',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setUpdatingId(targetUser.id);
          setErrorMsg(null);
          const res = await request<{ success: boolean; message: string; user: AdminUserItem }>(
            '/admin/users',
            {
              method: 'PUT',
              body: JSON.stringify({ userId: targetUser.id, isVerified: nextVerified })
            }
          );

          setToastMsg(res.message);
          setTimeout(() => setToastMsg(null), 3000);

          clientUsersPageCache.clear();
          await loadUsersPage(currentPage, committedSearch, planFilter, { forceRefresh: true });

          if (onCurrentUserPlanUpdated) {
            onCurrentUserPlanUpdated();
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to update verification status');
        } finally {
          setUpdatingId(null);
        }
      }
    });
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const startRow = pagination.totalMatched === 0 ? 0 : (pagination.page - 1) * USERS_PER_PAGE + 1;
  const endRow = Math.min(pagination.page * USERS_PER_PAGE, pagination.totalMatched);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-white font-['Chakra_Petch'] tracking-wide">
              Users Management
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
              {summary.totalUsers} accounts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage streamer accounts, plan subscriptions, and verification badges.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-slate-400' : 'text-slate-400'} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Feedback Banners ── */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* ── Summary Metrics Cards (2x2 Mobile, 4x1 Desktop) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#090D18] border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400">Total Users</div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">{summary.totalUsers}</div>
        </div>

        <div className="p-4 rounded-xl bg-[#090D18] border border-slate-800">
          <div className="text-[11px] font-medium text-cyan-400 flex items-center justify-between">
            <span>Ultra</span>
            <span className="text-[10px] text-slate-500 font-mono">100MB • ∞</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono mt-1">{(summary as any).ultraUsers || 0}</div>
        </div>

        <div className="p-4 rounded-xl bg-[#090D18] border border-slate-800">
          <div className="text-[11px] font-medium text-purple-400 flex items-center justify-between">
            <span>Pro</span>
            <span className="text-[10px] text-slate-500 font-mono">20MB</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-400 font-mono mt-1">{summary.proUsers}</div>
        </div>

        <div className="p-4 rounded-xl bg-[#090D18] border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Free</span>
            <span className="text-[10px] text-slate-500 font-mono">5MB</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-300 font-mono mt-1">{summary.freeUsers}</div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between bg-[#090D18] p-3 sm:p-3.5 rounded-xl border border-slate-800">
        <div className="relative flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExecuteSearch();
                }
              }}
              placeholder="Search by email, username, or display name..."
              className="w-full pl-8 pr-8 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleExecuteSearch}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            Search
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['ALL', 'ultra', 'pro', 'free'] as const).map((f) => (
            <button
              key={f}
              onClick={() => handlePlanFilterChange(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer shrink-0 ${
                planFilter === f
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'ultra' ? 'Ultra' : f === 'pro' ? 'Pro' : 'Free'}
            </button>
          ))}
        </div>
      </div>

      {/* Active Search Filter Badge */}
      {committedSearch && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300">
          <span>
            Query: <strong className="text-white">&ldquo;{committedSearch}&rdquo;</strong> ({pagination.totalMatched} matches)
          </span>
          <button
            type="button"
            onClick={handleClearSearch}
            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <X size={12} />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* ── Desktop Table View (≥ md screens) ── */}
      <div className="hidden md:block rounded-xl bg-[#090D18] border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-slate-950/60">
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Plan &amp; Duration</th>
                <th className="py-3 px-4">Badge</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading && users.length === 0 ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800/80" />
                        <div className="space-y-1.5">
                          <div className="w-24 h-3 rounded bg-slate-800/80" />
                          <div className="w-16 h-2.5 rounded bg-slate-800/50" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4"><div className="w-32 h-3 rounded bg-slate-800/70" /></td>
                    <td className="py-3.5 px-4"><div className="w-24 h-4 rounded bg-slate-800/70" /></td>
                    <td className="py-3.5 px-4"><div className="w-16 h-5 rounded bg-slate-800/70" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="w-24 h-6 rounded bg-slate-800/70 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isUpdating = updatingId === u.id;
                  const isUltra = u.plan === 'ultra';
                  const isPro = !isUltra && u.plan === 'pro';
                  const isSubscribed = isUltra || isPro;

                  return (
                    <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                            alt={u.displayName}
                            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{u.displayName || u.username}</span>
                              {u.isVerified && (
                                <BadgeCheck size={14} className="text-blue-400 shrink-0" />
                              )}
                              {u.isAdmin && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-mono uppercase shrink-0">
                                  <ShieldCheck size={10} />
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 font-mono text-slate-300 truncate max-w-[200px]">
                        {u.email}
                      </td>

                      {/* Plan & Duration */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div>
                            {isUltra ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-mono font-medium">
                                Ultra (100MB)
                              </span>
                            ) : u.trialActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono font-medium">
                                Trial ({u.trialRemainingDays || 7}d)
                              </span>
                            ) : isPro ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-mono font-medium">
                                Pro (20MB)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-mono font-medium">
                                Free (5MB)
                              </span>
                            )}
                          </div>
                          {isSubscribed && (
                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                              <Clock size={10} className="text-emerald-400 shrink-0" />
                              <span>{u.remainingDays || 31}d remaining</span>
                              {u.planExpiresAt && (
                                <span className="text-slate-500">· exp {formatDate(u.planExpiresAt)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Verified Badge */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleVerified(u)}
                          disabled={isUpdating}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                            u.isVerified
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                              : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                          }`}
                        >
                          <BadgeCheck size={13} className={u.isVerified ? 'text-blue-400' : 'text-slate-500'} />
                          <span>{u.isVerified ? 'Verified' : 'Verify'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Interact As (Open in New Window) */}
                          <button
                            type="button"
                            onClick={() => handleInteractAsUser(u)}
                            disabled={isUpdating || impersonatingId === u.id || u.id === currentUser?.id}
                            title={u.id === currentUser?.id ? 'Your admin account' : `Open creator dashboard in new window as @${u.username}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {impersonatingId === u.id ? (
                              <Loader2 size={12} className="animate-spin text-slate-400" />
                            ) : (
                              <ExternalLink size={12} className="text-slate-400" />
                            )}
                            <span>Interact</span>
                          </button>

                          {/* Plan Actions */}
                          {isUltra ? (
                            <>
                              <button
                                onClick={() => handleUpdateUserPlan(u, 'ultra', 31, 'extend')}
                                disabled={isUpdating}
                                className="px-2 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium transition-colors cursor-pointer disabled:opacity-50"
                              >
                                +31d
                              </button>
                              <button
                                onClick={() => handleUpdateUserPlan(u, 'pro', 31, 'set')}
                                disabled={isUpdating}
                                className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Pro
                              </button>
                              <button
                                onClick={() => handleUpdateUserPlan(u, 'free', 0, 'set')}
                                disabled={isUpdating}
                                className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Free
                              </button>
                            </>
                          ) : isPro ? (
                            <>
                              <button
                                onClick={() => handleUpdateUserPlan(u, 'ultra', 31, 'set')}
                                disabled={isUpdating}
                                className="px-2 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Ultra
                              </button>
                              <button
                                onClick={() => handleUpdateUserPlan(u, 'pro', 31, 'extend')}
                                disabled={isUpdating}
                                className="px-2 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-medium transition-colors cursor-pointer disabled:opacity-50"
                              >
                                +31d
                              </button>
                              <button
                                onClick={() => handleUpdateUserPlan(u, 'free', 0, 'set')}
                                disabled={isUpdating}
                                className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Free
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUpdateUserPlan(u, 'ultra', 31, 'set')}
                                disabled={isUpdating}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Ultra (31d)
                              </button>
                              <button
                                onClick={() => handleUpdateUserPlan(u, 'pro', 31, 'set')}
                                disabled={isUpdating}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-medium transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Pro (31d)
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Stacked Card View (< md screens) ── */}
      <div className="block md:hidden space-y-3">
        {loading && users.length === 0 ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#090D18] border border-slate-800 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-28 h-3.5 rounded bg-slate-800" />
                  <div className="w-20 h-2.5 rounded bg-slate-800/60" />
                </div>
              </div>
              <div className="w-36 h-3 rounded bg-slate-800/70" />
              <div className="w-full h-8 rounded bg-slate-800/40" />
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs bg-[#090D18] rounded-xl border border-slate-800">
            No matching users found.
          </div>
        ) : (
          users.map((u) => {
            const isUpdating = updatingId === u.id;
            const isUltra = u.plan === 'ultra';
            const isPro = !isUltra && u.plan === 'pro';
            const isSubscribed = isUltra || isPro;

            return (
              <div
                key={u.id}
                className="p-4 rounded-xl bg-[#090D18] border border-slate-800 space-y-3 shadow-sm"
              >
                {/* Header: User avatar & details */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                      alt={u.displayName}
                      className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm flex items-center gap-1.5 truncate">
                        <span className="truncate">{u.displayName || u.username}</span>
                        {u.isVerified && (
                          <BadgeCheck size={14} className="text-blue-400 shrink-0" />
                        )}
                        {u.isAdmin && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-mono uppercase shrink-0">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-400 truncate">@{u.username}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInteractAsUser(u)}
                    disabled={isUpdating || impersonatingId === u.id || u.id === currentUser?.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-colors shrink-0 disabled:opacity-40"
                    title={u.id === currentUser?.id ? 'Your admin account' : `Open creator dashboard in new window as @${u.username}`}
                  >
                    {impersonatingId === u.id ? (
                      <Loader2 size={12} className="animate-spin text-slate-400" />
                    ) : (
                      <ExternalLink size={12} className="text-slate-400" />
                    )}
                    <span>Interact</span>
                  </button>
                </div>

                {/* Info row: Email & Verified toggle */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 gap-2 border-t border-slate-800/60 pt-2.5">
                  <span className="truncate text-slate-300">{u.email}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleVerified(u)}
                    disabled={isUpdating}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors shrink-0 ${
                      u.isVerified
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    <BadgeCheck size={12} className={u.isVerified ? 'text-blue-400' : 'text-slate-500'} />
                    <span>{u.isVerified ? 'Verified' : 'Verify'}</span>
                  </button>
                </div>

                {/* Plan status & days */}
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <div>
                    {isUltra ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-medium">
                        Ultra (100MB)
                      </span>
                    ) : u.trialActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
                        Trial ({u.trialRemainingDays || 7}d)
                      </span>
                    ) : isPro ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-medium">
                        Pro (20MB)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-medium">
                        Free (5MB)
                      </span>
                    )}
                  </div>

                  {isSubscribed && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <Clock size={11} />
                      <span>{u.remainingDays || 31}d left</span>
                    </span>
                  )}
                </div>

                {/* Plan Actions Buttons Grid */}
                <div className="flex items-center gap-2 pt-1">
                  {isUltra ? (
                    <>
                      <button
                        onClick={() => handleUpdateUserPlan(u, 'ultra', 31, 'extend')}
                        disabled={isUpdating}
                        className="flex-1 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium text-center transition-colors cursor-pointer"
                      >
                        +31d Ultra
                      </button>
                      <button
                        onClick={() => handleUpdateUserPlan(u, 'pro', 31, 'set')}
                        disabled={isUpdating}
                        className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono text-center transition-colors cursor-pointer"
                      >
                        Set Pro
                      </button>
                      <button
                        onClick={() => handleUpdateUserPlan(u, 'free', 0, 'set')}
                        disabled={isUpdating}
                        className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs font-mono text-center transition-colors cursor-pointer"
                      >
                        Free
                      </button>
                    </>
                  ) : isPro ? (
                    <>
                      <button
                        onClick={() => handleUpdateUserPlan(u, 'ultra', 31, 'set')}
                        disabled={isUpdating}
                        className="flex-1 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium text-center transition-colors cursor-pointer"
                      >
                        Set Ultra
                      </button>
                      <button
                        onClick={() => handleUpdateUserPlan(u, 'pro', 31, 'extend')}
                        disabled={isUpdating}
                        className="flex-1 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-medium text-center transition-colors cursor-pointer"
                      >
                        +31d Pro
                      </button>
                      <button
                        onClick={() => handleUpdateUserPlan(u, 'free', 0, 'set')}
                        disabled={isUpdating}
                        className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs font-mono text-center transition-colors cursor-pointer"
                      >
                        Free
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleUpdateUserPlan(u, 'ultra', 31, 'set')}
                        disabled={isUpdating}
                        className="flex-1 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium text-center transition-colors cursor-pointer"
                      >
                        Set Ultra (31d)
                      </button>
                      <button
                        onClick={() => handleUpdateUserPlan(u, 'pro', 31, 'set')}
                        disabled={isUpdating}
                        className="flex-1 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-medium text-center transition-colors cursor-pointer"
                      >
                        Set Pro (31d)
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Pagination Footer ── */}
      <div className="px-4 py-3 rounded-xl bg-[#090D18] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="text-slate-400 text-center sm:text-left">
          Showing <strong className="text-white">{startRow}</strong>–<strong className="text-white">{endRow}</strong> of{' '}
          <strong className="text-white">{pagination.totalMatched}</strong> users
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!pagination.hasPrevPage || loading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 transition-colors cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium">
            {pagination.page} / {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={!pagination.hasNextPage || loading}
            onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 transition-colors cursor-pointer disabled:cursor-default"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersManager;