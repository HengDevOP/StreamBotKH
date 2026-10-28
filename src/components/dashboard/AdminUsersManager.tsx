'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Crown,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  ShieldCheck,
  BadgeCheck,
  Sparkles,
  Plus,
  ChevronLeft,
  ChevronRight,
  Database,
  X,
  CornerDownLeft
} from 'lucide-react';
import { request } from '../../services/api';
import { useModal } from '../../context/ModalContext';

const USERS_PER_PAGE = 20;
const CLIENT_CACHE_TTL_MS = 60 * 1000; // 60s client-side page cache to prevent server overload

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
  summary: { totalUsers: number; proUsers: number; freeUsers: number };
  fromCache?: boolean;
}

interface CachedPageEntry {
  timestamp: number;
  data: AdminUsersResponse;
}

// Persistent client-side cache across tab switches to prevent redundant server hits
const clientUsersPageCache = new Map<string, CachedPageEntry>();

interface AdminUsersManagerProps {
  onCurrentUserPlanUpdated?: () => void;
}

export const AdminUsersManager: React.FC<AdminUsersManagerProps> = ({ onCurrentUserPlanUpdated }) => {
  const { showConfirm } = useModal();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [summary, setSummary] = useState({ totalUsers: 0, proUsers: 0, freeUsers: 0 });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: USERS_PER_PAGE,
    totalMatched: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [currentPage, setCurrentPage] = useState(1);
  // Input state vs committed query state (only queries when Enter is pressed)
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'pro' | 'free'>('ALL');

  const [loading, setLoading] = useState(true);
  const [servedFromCache, setServedFromCache] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inFlightKeyRef = useRef<string | null>(null);

  const loadUsersPage = useCallback(
    async (
      targetPage: number,
      query: string,
      plan: 'ALL' | 'pro' | 'free',
      options?: { forceRefresh?: boolean }
    ) => {
      const normalizedQuery = query.trim().toLowerCase();
      const cacheKey = `${targetPage}:${USERS_PER_PAGE}:${normalizedQuery}:${plan}`;

      // 1. Serve immediately from client cache if fresh and not force-refreshing
      if (!options?.forceRefresh) {
        const cached = clientUsersPageCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
          setUsers(cached.data.users || []);
          setSummary(cached.data.summary || { totalUsers: 0, proUsers: 0, freeUsers: 0 });
          if (cached.data.pagination) {
            setPagination(cached.data.pagination);
          }
          setServedFromCache(true);
          setLoading(false);
          return;
        }
      }

      // 2. Prevent duplicate concurrent requests for the same page/query
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
          summary: data.summary || { totalUsers: 0, proUsers: 0, freeUsers: 0 },
          fromCache: data.fromCache
        };

        clientUsersPageCache.set(cacheKey, {
          timestamp: Date.now(),
          data: normalizedData
        });

        setUsers(normalizedData.users);
        setSummary(normalizedData.summary);
        setPagination(safePagination);
        setServedFromCache(Boolean(data.fromCache));
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

  // Trigger search ONLY when Enter is pressed (or Search button clicked)
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

  const handlePlanFilterChange = (nextPlan: 'ALL' | 'pro' | 'free') => {
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
    plan: 'free' | 'pro',
    durationDays = 31,
    action?: 'set' | 'extend'
  ) => {
    const isExtend = plan === 'pro' && action === 'extend';
    const isProUpgrade = plan === 'pro' && action !== 'extend';

    const modalTitle = isExtend
      ? `Extend Pro Plan (+${durationDays} Days)?`
      : isProUpgrade
      ? `Upgrade @${targetUser.username} to Pro Plan?`
      : `Downgrade @${targetUser.username} to Free Plan?`;

    const modalMessage = isExtend
      ? `Are you sure you want to add +${durationDays} days to @${targetUser.username} (${targetUser.email})'s active Pro Plan subscription?`
      : isProUpgrade
      ? `Are you sure you want to upgrade @${targetUser.username} (${targetUser.email}) to the Pro Plan (0% platform fee, 500MB storage, removed watermark) for ${durationDays} days?`
      : `Are you sure you want to switch @${targetUser.username} (${targetUser.email}) back to the Free Plan (10% platform fee, 20MB storage)?`;

    showConfirm({
      title: modalTitle,
      message: modalMessage,
      type: plan === 'free' ? 'danger' : 'info',
      confirmText: isExtend
        ? `Extend +${durationDays}d`
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
          setTimeout(() => setToastMsg(null), 3500);

          // Invalidate client cache and reload current page
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

  const handleToggleVerified = (targetUser: AdminUserItem) => {
    const nextVerified = !targetUser.isVerified;
    const modalTitle = nextVerified
      ? `Verify Creator @${targetUser.username}?`
      : `Remove Verification from @${targetUser.username}?`;

    const modalMessage = nextVerified
      ? `Are you sure you want to grant the official Verified Creator Tick Badge to @${targetUser.username} (${targetUser.email})? This displays the verified tick label on their public donation page, profile, and receipts.`
      : `Are you sure you want to revoke the Verified Creator Tick Badge from @${targetUser.username} (${targetUser.email})?`;

    showConfirm({
      title: modalTitle,
      message: modalMessage,
      type: nextVerified ? 'info' : 'danger',
      confirmText: nextVerified ? 'Grant Verification' : 'Remove Verification',
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
          setTimeout(() => setToastMsg(null), 3500);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
              Users Management
            </h2>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
              Admin • hchenheng@gmail.com
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
              <Database size={10} className={servedFromCache ? 'text-emerald-400' : 'text-cyan-400'} />
              <span>{servedFromCache ? 'Cached • 20/page' : '20 users / page'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Displays 20 cached users per page to prevent server overload. Type a search and press <strong className="text-slate-200 font-mono">Enter</strong> to query.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : 'text-cyan-400'} />
          <span>Refresh Cache</span>
        </button>
      </div>

      {/* Toast / Error feedback */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">Total Users</div>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">{summary.totalUsers}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Users size={20} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#090D18] border border-purple-500/30 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-purple-300">Active Pro Plan (31d)</div>
            <div className="text-2xl font-extrabold text-purple-400 font-mono mt-1">{summary.proUsers}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Crown size={20} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">Free Starter Users</div>
            <div className="text-2xl font-extrabold text-slate-200 font-mono mt-1">{summary.freeUsers}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* Search (Enter Key to Query) & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#090D18] p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
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
              placeholder="Search by email, @username, or display name (Press Enter to search)..."
              className="w-full pl-9 pr-20 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={handleClearSearch}
                title="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-500 pointer-events-none">
                <CornerDownLeft size={10} />
                Enter
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleExecuteSearch}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
          >
            <Search size={13} />
            <span>Search</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {(['ALL', 'pro', 'free'] as const).map((f) => (
            <button
              key={f}
              onClick={() => handlePlanFilterChange(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-colors cursor-pointer ${
                planFilter === f
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f === 'ALL' ? 'All Plans' : f === 'pro' ? 'Pro (31d)' : 'Free'}
            </button>
          ))}
        </div>
      </div>

      {/* Active Search Badge */}
      {committedSearch && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs font-mono text-cyan-300">
          <span>
            Showing results for query: <strong className="text-white">&ldquo;{committedSearch}&rdquo;</strong> ({pagination.totalMatched} found)
          </span>
          <button
            type="button"
            onClick={handleClearSearch}
            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <X size={13} />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* Users Table (20 Users Per Page) */}
      <div className="rounded-2xl bg-[#090D18] border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-slate-950/60">
                <th className="py-3.5 px-4">Streamer / Account</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Verified Badge</th>
                <th className="py-3.5 px-4">Current Plan</th>
                <th className="py-3.5 px-4">Duration (31d Cycle)</th>
                <th className="py-3.5 px-4 text-right">Manage Plan (31 Days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {loading && users.length === 0 ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800/80" />
                        <div className="space-y-1.5">
                          <div className="w-28 h-3 rounded bg-slate-800/80" />
                          <div className="w-20 h-2.5 rounded bg-slate-800/50" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-40 h-3 rounded bg-slate-800/70" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-20 h-7 rounded-xl bg-slate-800/70" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-24 h-6 rounded-lg bg-slate-800/70" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-32 h-3 rounded bg-slate-800/60" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="w-24 h-7 rounded-xl bg-slate-800/70 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isUpdating = updatingId === u.id;
                  const isPro = u.plan === 'pro';

                  return (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Streamer Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                            alt={u.displayName}
                            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 object-cover flex-shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.displayName || u.username}</span>
                              {u.isVerified && (
                                <span title="Verified Creator" className="inline-flex items-center text-cyan-400 flex-shrink-0">
                                  <BadgeCheck size={14} className="text-cyan-400 fill-cyan-400/20" />
                                </span>
                              )}
                              {u.isAdmin && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono uppercase">
                                  <ShieldCheck size={10} />
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-cyan-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {u.email}
                      </td>

                      {/* Verified Creator Status & Action */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleVerified(u)}
                          disabled={isUpdating}
                          title={u.isVerified ? 'Click to revoke verification' : 'Click to grant Verified Creator badge'}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                            u.isVerified
                              ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/15'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <BadgeCheck
                            size={14}
                            className={u.isVerified ? 'text-cyan-400 fill-cyan-400/20' : 'text-slate-500'}
                          />
                          <span>{u.isVerified ? 'Verified' : 'Verify'}</span>
                        </button>
                      </td>

                      {/* Plan Badge */}
                      <td className="py-3.5 px-4">
                        {isPro ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono text-[11px] font-bold uppercase">
                            <Crown size={12} className="text-purple-400" />
                            <span>PRO PLAN (0% Fee)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px] font-semibold uppercase">
                            <span>FREE (10% Fee)</span>
                          </span>
                        )}
                      </td>

                      {/* Duration / Expiration */}
                      <td className="py-3.5 px-4">
                        {isPro ? (
                          <div className="space-y-0.5 font-mono">
                            <div className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                              <Clock size={12} />
                              <span>{u.remainingDays || 31}d remaining (31d/mo)</span>
                            </div>
                            {u.planExpiresAt && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Calendar size={10} />
                                <span>Expires: {formatDate(u.planExpiresAt)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">No active subscription</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {!isPro ? (
                            <button
                              onClick={() => handleUpdateUserPlan(u, 'pro', 31, 'set')}
                              disabled={isUpdating}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-slate-950 font-extrabold text-[11px] font-mono uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isUpdating ? 'Updating...' : 'Set Pro (31d)'}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUpdateUserPlan(u, 'pro', 31, 'extend')}
                                disabled={isUpdating}
                                title="Add +31 days to current expiration"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Plus size={12} />
                                <span>31d</span>
                              </button>
                              <button
                                onClick={() => handleUpdateUserPlan(u, 'free', 0, 'set')}
                                disabled={isUpdating}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/40 font-semibold text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Set Free
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

        {/* Pagination Footer (20 Users Per Page) */}
        <div className="px-4 py-3.5 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="text-slate-400">
            Showing <strong className="text-white">{startRow}</strong>–<strong className="text-white">{endRow}</strong> of{' '}
            <strong className="text-white">{pagination.totalMatched}</strong> users{' '}
            <span className="text-slate-500">({USERS_PER_PAGE} per page)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!pagination.hasPrevPage || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 transition-colors cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 font-bold">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={!pagination.hasNextPage || loading}
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-300 transition-colors cursor-pointer disabled:cursor-default"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
