'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Flame, Users, TrendingUp, Sparkles, ShieldAlert, RotateCcw, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { Card } from '../common/Card';

interface OverviewStatsProps {
  stats?: {
    totalRevenueUsd: number;
    totalRevenueKhr: number;
    totalDonationsCount: number;
    todayRevenueUsd: number;
    todayRevenueKhr: number;
    todayDonationsCount: number;
  };
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({ stats }) => {
  const totalUsd = stats?.totalRevenueUsd ?? 0;
  const totalKhr = stats?.totalRevenueKhr ?? 0;
  const todayUsd = stats?.todayRevenueUsd ?? 0;
  const todayKhr = stats?.todayRevenueKhr ?? 0;
  const totalCount = stats?.totalDonationsCount ?? 0;
  const todayCount = stats?.todayDonationsCount ?? 0;

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      const res = await fetch('/api/streamer/donations/reset-pending');
      const data = await res.json();
      if (data.success && typeof data.pendingCount === 'number') {
        setPendingCount(data.pendingCount);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResetPending = async () => {
    setIsResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/streamer/donations/reset-pending', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setPendingCount(0);
        setResetMsg(`Cleared ${data.clearedDonations || 0} session(s)`);
        setTimeout(() => setResetMsg(null), 3500);
      }
    } catch (e) {
      console.error('Error resetting pending donations:', e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pending Session Management & Auto-Expiry Monitor Bar */}
      <div className="p-4 rounded-2xl bg-[#090D18] border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono select-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 flex-shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
                Active Pending Sessions Monitor
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 ${
                pendingCount > 0
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 animate-pulse'
                  : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pendingCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                {pendingCount} Pending
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock size={11} className="text-cyan-400 flex-shrink-0" />
              <span>5-minute cache timer active: Stale pending sessions auto-clear after 5 mins to prevent unknown alerts.</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {resetMsg && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
              <CheckCircle2 size={13} />
              <span>{resetMsg}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleResetPending}
            disabled={isResetting}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto border ${
              pendingCount > 0
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60'
            }`}
            title="Reset all pending sessions to cancelled to avoid unmatched GramJS alerts"
          >
            {isResetting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <RotateCcw size={13} />
                <span>Reset All Pending</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Revenue USD */}
      <Card glow="cyan" className="group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tips (USD)</span>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <DollarSign size={18} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl xs:text-3xl font-black tracking-tight text-white font-mono">
            ${totalUsd.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 flex items-center text-xs text-slate-400">
          <span className="text-cyan-400 font-semibold mr-1.5 flex items-center gap-0.5">
            <TrendingUp size={12} /> {totalCount}
          </span>
          all-time tips received
        </div>
      </Card>

      {/* Total Revenue KHR */}
      <Card glow="pink" className="group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tips (KHR)</span>
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
            <Sparkles size={18} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl xs:text-3xl font-black tracking-tight text-white font-mono">
            {totalKhr.toLocaleString()} <span className="text-base sm:text-lg font-bold text-pink-400">៛</span>
          </span>
        </div>
        <div className="mt-2 flex items-center text-xs text-slate-400">
          <span className="text-pink-400 font-semibold mr-1.5">Bakong & ABA</span>
          Khmer Riel payments
        </div>
      </Card>

      {/* Today's Earnings */}
      <Card glow="purple" className="group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Live Stream</span>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Flame size={18} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl xs:text-3xl font-black tracking-tight text-white font-mono">
            ${todayUsd.toFixed(2)}
          </span>
          {todayKhr > 0 && (
            <span className="text-xs text-purple-300 font-mono">
              + {todayKhr.toLocaleString()} ៛
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center text-xs text-slate-400">
          <span className="text-emerald-400 font-bold mr-1.5">+{todayCount} tips</span>
          during today's session
        </div>
      </Card>

      {/* Supporter Count */}
      <Card glow="none" className="group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Donors</span>
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform">
            <Users size={18} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl xs:text-3xl font-black tracking-tight text-white font-mono">
            {totalCount}
          </span>
        </div>
        <div className="mt-2 flex items-center text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
          Active community supporters
        </div>
      </Card>
      </div>
    </div>
  );
};
