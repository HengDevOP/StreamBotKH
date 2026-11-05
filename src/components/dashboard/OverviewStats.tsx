'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ChevronDown
} from 'lucide-react';
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

  // Number & currency locale formatters (e.g. 12,123.60, 4,000 ៛)
  const formatUSD = (val: number) =>
    (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatKHR = (val: number) =>
    Math.round(val || 0).toLocaleString('en-US');
  const formatCount = (val: number) =>
    (val || 0).toLocaleString('en-US');

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
      {/* Top Header Bar & Timeframe Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] tracking-wide">
            Performance &amp; Approximate Earnings
          </h2>
          <p className="text-xs text-slate-400">
            Real-time tip velocity and projected monthly run-rate for {currentTab.periodLabel.toLowerCase()}
          </p>
        </div>

        {/* Timeframe Filter Dropdown */}
        <div className="relative self-start sm:self-auto">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as TimeframeOption)}
            aria-label="Filter timeframe"
            className="appearance-none pl-3.5 pr-9 py-2 rounded-xl bg-[#090D18] border border-slate-800 text-xs font-mono font-bold text-white hover:border-slate-700 focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer shadow-sm"
          >
            {timeframeTabs.map((tab) => (
              <option key={tab.key} value={tab.key} className="bg-slate-950 text-white py-1">
                {tab.label} ({tab.periodLabel})
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* 4 Stat Cards Row (Primary Approximate Earnings: 2 cols, Others: 1 col each) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 items-stretch">
        {/* Primary: Approximate Earnings (spans 2 cols, bigger, monochrome clean design, no icon) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 rounded-2xl bg-[#090D18] border border-slate-800 p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-['Chakra_Petch']">
                Approximate Earnings ({currentTab.label})
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 whitespace-nowrap">
                Projected Monthly
              </span>
            </div>

            <div className="mt-3.5 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                ${formatUSD(activeMetrics.potentialMonthlyUsd)}
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">/mo</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
            {activeMetrics.potentialMonthlyKhr > 0 ? (
              <span className="text-slate-300 font-medium truncate">
                + {formatKHR(activeMetrics.potentialMonthlyKhr)} ៛/mo projected
              </span>
            ) : (
              <span className="text-slate-400 truncate">
                ${formatUSD(activeMetrics.avgPerDayUsd)}/day velocity
              </span>
            )}
            <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">Auto-projected</span>
          </div>
        </div>

        {/* Supporting Card 1: Tips USD */}
        <div className="col-span-1 rounded-2xl bg-[#090D18] border border-slate-800 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tips (USD)
          </span>
          <div className="my-2.5">
            <span className="text-2xl font-black tracking-tight text-white font-mono">
              ${formatUSD(activeMetrics.usd)}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/60 truncate">
            ${formatUSD(activeMetrics.avgPerDayUsd)}/day rate
          </div>
        </div>

        {/* Supporting Card 2: Tips KHR */}
        <div className="col-span-1 rounded-2xl bg-[#090D18] border border-slate-800 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tips (KHR)
          </span>
          <div className="my-2.5">
            <span className="text-2xl font-black tracking-tight text-white font-mono">
              {formatKHR(activeMetrics.khr)} <span className="text-xs font-bold text-slate-400">៛</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/60 truncate">
            ~{formatKHR(activeMetrics.avgPerDayKhr)} ៛/day rate
          </div>
        </div>

        {/* Supporting Card 3: Tips Count */}
        <div className="col-span-1 rounded-2xl bg-[#090D18] border border-slate-800 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Tips Count
          </span>
          <div className="my-2.5">
            <span className="text-2xl font-black tracking-tight text-white font-mono">
              {formatCount(activeMetrics.count)}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/60 truncate">
            {currentTab.periodLabel}
          </div>
        </div>
      </div>

      {/* Pending Session Management & Auto-Expiry Monitor Bar (Compact) */}
      <div className="px-4 py-2.5 rounded-xl bg-[#090D18] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-mono text-xs select-none shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldAlert size={15} className="text-cyan-400 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white uppercase tracking-wider font-['Chakra_Petch'] text-[11px]">
              Pending Sessions
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
            <span className="text-[11px] text-slate-400 hidden md:inline">
              • 5m auto-clear active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
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
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
              pendingCount > 0
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60'
            }`}
            title="Reset all pending sessions to cancelled to avoid unmatched GramJS alerts"
          >
            {isResetting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <RotateCcw size={12} />
                <span>Reset Pending</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
