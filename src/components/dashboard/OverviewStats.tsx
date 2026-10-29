'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Flame,
  Users,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  Clock,
  CheckCircle2,
  Loader2,
  Calendar,
  Zap
} from 'lucide-react';
import { Card } from '../common/Card';
import { TimeframeMetrics } from '../../types/streamer';

export type TimeframeOption = 'today' | '1d' | '3d' | 'last_week' | 'last_month';

interface OverviewStatsProps {
  stats?: {
    totalRevenueUsd: number;
    totalRevenueKhr: number;
    totalDonationsCount: number;
    todayRevenueUsd: number;
    todayRevenueKhr: number;
    todayDonationsCount: number;
  };
  timeframeAnalytics?: {
    today: TimeframeMetrics;
    '1d': TimeframeMetrics;
    '3d': TimeframeMetrics;
    'last_week': TimeframeMetrics;
    'last_month': TimeframeMetrics;
  };
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({ stats, timeframeAnalytics }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('today');

  const totalUsd = stats?.totalRevenueUsd ?? 0;
  const totalKhr = stats?.totalRevenueKhr ?? 0;
  const totalCount = stats?.totalDonationsCount ?? 0;

  // Active metrics based on selected timeframe
  const activeMetrics: TimeframeMetrics = timeframeAnalytics?.[selectedTimeframe] || {
    usd: selectedTimeframe === 'today' ? (stats?.todayRevenueUsd ?? 0) : 0,
    khr: selectedTimeframe === 'today' ? (stats?.todayRevenueKhr ?? 0) : 0,
    count: selectedTimeframe === 'today' ? (stats?.todayDonationsCount ?? 0) : 0,
    avgPerDayUsd: selectedTimeframe === 'today' ? (stats?.todayRevenueUsd ?? 0) : 0,
    avgPerDayKhr: selectedTimeframe === 'today' ? (stats?.todayRevenueKhr ?? 0) : 0,
    potentialMonthlyUsd: (selectedTimeframe === 'today' ? (stats?.todayRevenueUsd ?? 0) : 0) * 30,
    potentialMonthlyKhr: (selectedTimeframe === 'today' ? (stats?.todayRevenueKhr ?? 0) : 0) * 30
  };

  const timeframeTabs: Array<{ key: TimeframeOption; label: string; periodLabel: string }> = [
    { key: 'today', label: 'Today', periodLabel: "Today's stream" },
    { key: '1d', label: '1d', periodLabel: 'Past 24 hours' },
    { key: '3d', label: '3d', periodLabel: 'Past 3 days' },
    { key: 'last_week', label: 'Last Week', periodLabel: 'Past 7 days' },
    { key: 'last_month', label: 'Last Month', periodLabel: 'Past 30 days' }
  ];

  const currentTab = timeframeTabs.find((t) => t.key === selectedTimeframe) || timeframeTabs[0];

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
      {/* Timeframe Analytics Filter Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#090D18] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Calendar size={16} />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
              Analytics &amp; Earning Potential
            </span>
            <p className="text-[11px] text-slate-400">
              Filter by timeframe to evaluate tips velocity and projected run-rate
            </p>
          </div>
        </div>

        {/* 5 Timeframe Buttons: Today, 1d, 3d, Last Week, Last Month */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 self-start md:self-auto overflow-x-auto max-w-full">
          {timeframeTabs.map((tab) => {
            const isActive = selectedTimeframe === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedTimeframe(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Timeframe Analytics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Period Revenue USD */}
        <Card glow="cyan" className="group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tips (USD) • {currentTab.label}
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl xs:text-3xl font-black tracking-tight text-white font-mono">
              ${activeMetrics.usd.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-400 font-mono">
            <span className="text-cyan-400 font-semibold mr-1.5 flex items-center gap-0.5">
              <TrendingUp size={12} /> ${activeMetrics.avgPerDayUsd.toFixed(2)}/day
            </span>
            velocity
          </div>
        </Card>

        {/* Period Revenue KHR */}
        <Card glow="pink" className="group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tips (KHR) • {currentTab.label}
            </span>
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl xs:text-3xl font-black tracking-tight text-white font-mono">
              {activeMetrics.khr.toLocaleString()} <span className="text-base sm:text-lg font-bold text-pink-400">៛</span>
            </span>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-400 font-mono">
            <span className="text-pink-400 font-semibold mr-1.5">
              ~{activeMetrics.avgPerDayKhr.toLocaleString()} ៛/day
            </span>
            daily rate
          </div>
        </Card>

        {/* Tips Activity */}
        <Card glow="purple" className="group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tips Received • {currentTab.label}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Flame size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl xs:text-3xl font-black tracking-tight text-white font-mono">
              {activeMetrics.count}
            </span>
            <span className="text-xs text-slate-400 font-mono">paid tips</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-400 font-mono">
            <span className="text-purple-300 font-semibold mr-1.5">{currentTab.periodLabel}</span>
          </div>
        </Card>

        {/* Earning Potential (Projected Monthly Run-Rate) */}
        <Card glow="cyan" className="group border-cyan-500/40 bg-gradient-to-br from-[#090D18] via-[#0D1527] to-[#090D18]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-cyan-400" />
              <span>Earning Potential</span>
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-400/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,240,255,0.2)]">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-2xl xs:text-3xl font-black tracking-tight text-white font-mono">
              ${activeMetrics.potentialMonthlyUsd.toFixed(2)}
            </span>
            <span className="text-[11px] font-mono text-cyan-400 font-bold">/mo</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-400 font-mono truncate">
            {activeMetrics.potentialMonthlyKhr > 0 ? (
              <span className="text-emerald-400 font-semibold">
                + {activeMetrics.potentialMonthlyKhr.toLocaleString()} ៛/mo projected
              </span>
            ) : (
              <span className="text-slate-400">Based on {currentTab.label} stream velocity</span>
            )}
          </div>
        </Card>
      </div>

      {/* All-Time Lifetime Summary Banner */}
      <div className="px-4 py-3 rounded-xl bg-[#090D18] border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <Users size={14} className="text-cyan-400 flex-shrink-0" />
          <span>Lifetime Community Total:</span>
          <span className="font-bold text-white">${totalUsd.toFixed(2)}</span>
          {totalKhr > 0 && (
            <>
              <span>+</span>
              <span className="font-bold text-pink-400">{totalKhr.toLocaleString()} ៛</span>
            </>
          )}
          <span className="text-slate-500">({totalCount} completed tips)</span>
        </div>
        <span className="text-[11px] text-slate-500">Auto-calculated from paid transactions</span>
      </div>

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
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 ${
                  pendingCount > 0
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 animate-pulse'
                    : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                }`}
              >
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
    </div>
  );
};
