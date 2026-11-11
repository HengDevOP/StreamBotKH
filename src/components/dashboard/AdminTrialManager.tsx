'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Gift,
  CheckCircle2,
  Clock,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Zap,
  Check,
  X,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { request } from '../../services/api';
import { Button } from '../common/Button';
import { useModal } from '../../context/ModalContext';

export interface AdminTrialSummary {
  totalUsers: number;
  activeTrials: number;
  usedTrials: number;
  eligibleUsers: number;
}

export interface AdminTrialSettings {
  isEnabled: boolean;
  durationDays: number;
  trialName: string;
  updatedAt?: string;
  updatedBy?: string;
  summary: AdminTrialSummary;
}

interface StreamerTrialItem {
  id: string;
  username: string;
  email: string;
  displayName: string;
  plan: string;
  trialActive?: boolean;
  hasUsedTrial?: boolean;
  trialRemainingDays?: number;
  trialEndDate?: string;
}

export const AdminTrialManager: React.FC = () => {
  const { showConfirm } = useModal();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Settings State
  const [isEnabled, setIsEnabled] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [summary, setSummary] = useState<AdminTrialSummary>({
    totalUsers: 0,
    activeTrials: 0,
    usedTrials: 0,
    eligibleUsers: 0
  });

  // User search & quick action state
  const [streamers, setStreamers] = useState<StreamerTrialItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load Trial Settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<any>('/admin/trial');
      setIsEnabled(Boolean(data.isEnabled));
      setDurationDays(Number(data.durationDays || 7));
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading trial settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Users for trial overview
  const fetchStreamers = useCallback(async (query: string = '') => {
    setSearching(true);
    try {
      const data = await request<any>(`/admin/users?search=${encodeURIComponent(query)}&limit=15`);
      if (data.users) {
        setStreamers(data.users);
      }
    } catch (e) {
      console.warn('Failed to search streamers:', e);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchStreamers();
  }, [fetchSettings, fetchStreamers]);

  // Toggle Trial Switch
  const handleToggle = async (nextState: boolean) => {
    setToggling(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await request<any>('/admin/trial', {
        method: 'POST',
        body: JSON.stringify({
          isEnabled: nextState,
          durationDays
        })
      });

      setIsEnabled(nextState);
      setSuccessMsg(data.message || (nextState ? 'Trial feature enabled!' : 'Trial feature disabled!'));
      fetchSettings();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update trial status');
    } finally {
      setToggling(false);
    }
  };

  // Save Duration Days
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await request<any>('/admin/trial', {
        method: 'POST',
        body: JSON.stringify({
          isEnabled,
          durationDays: Number(durationDays)
        })
      });

      setSuccessMsg(`Saved! Trial duration is set to ${durationDays} days.`);
      fetchSettings();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Reset trial eligibility for a streamer
  const handleResetTrial = async (user: StreamerTrialItem) => {
    showConfirm({
      title: 'Reset Trial Eligibility',
      message: `Are you sure you want to reset trial eligibility for "${user.username || user.email}"? This will allow them to claim a new 7-day free trial.`,
      confirmText: 'Reset Trial',
      variant: 'info',
      onConfirm: async () => {
        setActionLoadingId(user.id);
        try {
          const data = await request<any>('/admin/trial', {
            method: 'POST',
            body: JSON.stringify({
              action: 'reset_user_trial',
              userId: user.id
            })
          });

          setSuccessMsg(data.message || 'Trial eligibility reset.');
          fetchStreamers(searchQuery);
          fetchSettings();
          setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err: any) {
          setError(err.message || 'Failed to reset trial');
        } finally {
          setActionLoadingId(null);
        }
      }
    });
  };

  // Manually Grant 7-Day Trial to a streamer
  const handleGrantTrial = async (user: StreamerTrialItem) => {
    showConfirm({
      title: 'Grant 7-Day Pro Trial',
      message: `Instantly grant a 7-day Pro trial to "${user.username || user.email}"? All Pro overlays and features will be unlocked immediately.`,
      confirmText: 'Grant Pro Trial',
      variant: 'primary',
      onConfirm: async () => {
        setActionLoadingId(user.id);
        try {
          const data = await request<any>('/admin/trial', {
            method: 'POST',
            body: JSON.stringify({
              action: 'grant_user_trial',
              userId: user.id,
              days: durationDays || 7
            })
          });

          setSuccessMsg(data.message || `Granted ${durationDays}-day Pro trial!`);
          fetchStreamers(searchQuery);
          fetchSettings();
          setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err: any) {
          setError(err.message || 'Failed to grant trial');
        } finally {
          setActionLoadingId(null);
        }
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900 border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-lg shadow-amber-500/10 shrink-0">
            <Gift size={24} className="animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                7-Day Free Pro Trial Configuration
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  isEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isEnabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              When enabled, all new streamers and existing users who haven&apos;t used the trial yet can experience 7 days of full Pro access. Once the trial expires, the user is automatically marked as trial completed and Pro features are locked.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          className="self-start md:self-auto px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Quick Stat Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#090D18] border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Zap size={12} className="text-amber-400" />
            Active 7-Day Trials
          </span>
          <p className="text-2xl font-bold font-mono text-amber-300">
            {summary.activeTrials.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Streamers currently in trial</span>
        </div>

        <div className="p-4 rounded-xl bg-[#090D18] border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Sparkles size={12} className="text-cyan-400" />
            Eligible Streamers
          </span>
          <p className="text-2xl font-bold font-mono text-cyan-300">
            {summary.eligibleUsers.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Can claim free 7-day trial</span>
        </div>

        <div className="p-4 rounded-xl bg-[#090D18] border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-purple-400" />
            Trials Completed
          </span>
          <p className="text-2xl font-bold font-mono text-purple-300">
            {summary.usedTrials.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Streamers who used trial</span>
        </div>

        <div className="p-4 rounded-xl bg-[#090D18] border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Users size={12} className="text-slate-400" />
            Total Registered
          </span>
          <p className="text-2xl font-bold font-mono text-white">
            {summary.totalUsers.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">Platform accounts</span>
        </div>
      </div>

      {/* 3. Global Trial Controls Form */}
      <div className="p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
              <span>Trial Feature Master Switch</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly toggle the 7-day trial availability across the entire platform.
            </p>
          </div>

          {/* Master Toggle Button */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-400">
              {isEnabled ? 'TRIAL OFFER ON' : 'TRIAL OFFER OFF'}
            </span>
            <button
              type="button"
              disabled={toggling}
              onClick={() => handleToggle(!isEnabled)}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? 'bg-emerald-500' : 'bg-slate-800'
              } ${toggling ? 'opacity-50' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Duration configuration form */}
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 font-bold uppercase">
              Trial Duration (Days)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="30"
                value={durationDays}
                onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-500">Days</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Standard default is 7 days</span>
          </div>

          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-mono text-slate-300 font-bold uppercase">
              Feature Scope
            </label>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              <span>Full Pro Access (20MB, Overlays, Chat)</span>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Save Trial Settings</span>
            </Button>
          </div>
        </form>
      </div>

      {/* 4. Streamer Trial Management Table */}
      <div className="p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
              Streamer Trial Status &amp; Direct Actions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Search streamers to view their trial status, reset eligibility, or manually grant a 7-day trial.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search username or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchStreamers(e.target.value);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="py-3 px-4">Streamer</th>
                <th className="py-3 px-4">Plan Status</th>
                <th className="py-3 px-4">Trial Status</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {searching ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    <RefreshCw size={18} className="animate-spin inline mr-2 text-cyan-400" />
                    Loading streamers...
                  </td>
                </tr>
              ) : streamers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No streamers found matching &ldquo;{searchQuery}&rdquo;
                  </td>
                </tr>
              ) : (
                streamers.map((u) => {
                  const isTrialActive = Boolean(u.trialActive);
                  const hasUsed = Boolean(u.hasUsedTrial);

                  return (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white font-sans">{u.displayName || u.username}</div>
                        <div className="text-[10px] text-slate-500">@{u.username} • {u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.plan === 'pro'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : isTrialActive
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isTrialActive ? 'Trial (Pro)' : u.plan.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isTrialActive ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>ACTIVE ({u.trialRemainingDays || 7}d left)</span>
                          </div>
                        ) : hasUsed ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                            TRIAL USED (FINISHED)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px]">
                            ELIGIBLE (NOT USED)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Reset Trial button */}
                          {hasUsed && (
                            <button
                              type="button"
                              disabled={actionLoadingId === u.id}
                              onClick={() => handleResetTrial(u)}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                              title="Reset trial eligibility so user can try again"
                            >
                              <RotateCcw size={11} className="text-cyan-400" />
                              <span>Reset Trial</span>
                            </button>
                          )}

                          {/* Grant Trial button */}
                          {!isTrialActive && (
                            <button
                              type="button"
                              disabled={actionLoadingId === u.id}
                              onClick={() => handleGrantTrial(u)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                              title="Instantly grant 7 days of Pro access"
                            >
                              <Sparkles size={11} className="text-amber-400" />
                              <span>Grant 7d Trial</span>
                            </button>
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
