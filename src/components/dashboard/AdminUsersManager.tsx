'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Crown,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Plus
} from 'lucide-react';
import { request } from '../../services/api';

interface AdminUserItem {
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
  isAdmin: boolean;
  createdAt?: string;
}

interface AdminUsersManagerProps {
  onCurrentUserPlanUpdated?: () => void;
}

export const AdminUsersManager: React.FC<AdminUsersManagerProps> = ({ onCurrentUserPlanUpdated }) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [summary, setSummary] = useState({ totalUsers: 0, proUsers: 0, freeUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'pro' | 'free'>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await request<{
        users: AdminUserItem[];
        summary: { totalUsers: number; proUsers: number; freeUsers: number };
      }>('/admin/users');
      setUsers(data.users || []);
      setSummary(data.summary || { totalUsers: 0, proUsers: 0, freeUsers: 0 });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateUserPlan = async (
    userId: string,
    plan: 'free' | 'pro',
    durationDays = 31,
    action?: 'set' | 'extend'
  ) => {
    try {
      setUpdatingId(userId);
      setErrorMsg(null);
      const res = await request<{ success: boolean; message: string; user: AdminUserItem }>(
        '/admin/users',
        {
          method: 'PUT',
          body: JSON.stringify({ userId, plan, durationDays, action })
        }
      );

      setToastMsg(res.message);
      setTimeout(() => setToastMsg(null), 3500);
      await loadUsers();
      if (onCurrentUserPlanUpdated) {
        onCurrentUserPlanUpdated();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user plan');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));
      const matchesPlan = planFilter === 'ALL' || u.plan === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [users, searchQuery, planFilter]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
              Users Management
            </h2>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
              Admin • hchenheng@gmail.com
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage registered streamers, upgrade user plans, and set 31-day (1 month) Pro subscriptions.
          </p>
        </div>

        <button
          onClick={loadUsers}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : 'text-cyan-400'} />
          <span>Refresh Users</span>
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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#090D18] p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email, @username, or display name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['ALL', 'pro', 'free'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPlanFilter(f)}
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

      {/* Users Table */}
      <div className="rounded-2xl bg-[#090D18] border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-slate-950/60">
                <th className="py-3.5 px-4">Streamer / Account</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Current Plan</th>
                <th className="py-3.5 px-4">Duration (31d Cycle)</th>
                <th className="py-3.5 px-4 text-right">Manage Plan (31 Days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
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
                              onClick={() => handleUpdateUserPlan(u.id, 'pro', 31, 'set')}
                              disabled={isUpdating}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-slate-950 font-extrabold text-[11px] font-mono uppercase tracking-wide transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isUpdating ? 'Updating...' : 'Set Pro (31d)'}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUpdateUserPlan(u.id, 'pro', 31, 'extend')}
                                disabled={isUpdating}
                                title="Add +31 days to current expiration"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Plus size={12} />
                                <span>31d</span>
                              </button>
                              <button
                                onClick={() => handleUpdateUserPlan(u.id, 'free', 0, 'set')}
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
      </div>
    </div>
  );
};
