'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  TrendingUp,
  PieChart as PieChartIcon,
  Calendar
} from 'lucide-react';
import { TimeframeMetrics } from '../../types/streamer';

export type TimeframeOption =
  | 'today'
  | 'yesterday'
  | '1d'
  | '3d'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | '3_months'
  | '6_months'
  | 'lifetime'
  | 'custom';

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}

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
    today?: TimeframeMetrics;
    yesterday?: TimeframeMetrics;
    '1d'?: TimeframeMetrics;
    '3d'?: TimeframeMetrics;
    this_week?: TimeframeMetrics;
    last_week?: TimeframeMetrics;
    this_month?: TimeframeMetrics;
    last_month?: TimeframeMetrics;
    '3_months'?: TimeframeMetrics;
    '6_months'?: TimeframeMetrics;
    lifetime?: TimeframeMetrics;
    [key: string]: TimeframeMetrics | undefined;
  };
  donations?: Array<{
    id: string;
    donor_name: string;
    amount: number;
    currency: 'USD' | 'KHR';
    banking_name?: string;
    payment_method: string;
    status: string;
    created_at: string;
    paid_at?: string;
  }>;
  trend?: Array<{
    date: string;
    amount_usd: number;
    count: number;
  }>;
  selectedTimeframe?: TimeframeOption;
  onTimeframeChange?: (timeframe: TimeframeOption) => void;
  customDateRange?: CustomDateRange;
  onCustomDateRangeChange?: (range: CustomDateRange) => void;
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  stats,
  timeframeAnalytics,
  donations = [],
  selectedTimeframe: controlledTimeframe,
  onTimeframeChange,
  customDateRange: controlledCustomRange,
  onCustomDateRangeChange
}) => {
  const [internalTimeframe, setInternalTimeframe] = useState<TimeframeOption>('today');
  const selectedTimeframe = controlledTimeframe ?? internalTimeframe;
  const setSelectedTimeframe = (next: TimeframeOption) => {
    setInternalTimeframe(next);
    onTimeframeChange?.(next);
  };
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);
  const weekAgoIso = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [internalCustomRange, setInternalCustomRange] = useState<CustomDateRange>({
    startDate: weekAgoIso,
    endDate: todayIso
  });

  const customRange = controlledCustomRange ?? internalCustomRange;
  const setCustomRange = (next: CustomDateRange) => {
    setInternalCustomRange(next);
    onCustomDateRangeChange?.(next);
  };

  // Number & currency locale formatters (e.g. 12,123.60, 4,000 ៛)
  const formatUSD = (val: number) =>
    (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatKHR = (val: number) =>
    Math.round(val || 0).toLocaleString('en-US');
  const formatCount = (val: number) =>
    (val || 0).toLocaleString('en-US');

  // Filter paid donations for the selected timeframe
  const filteredDonations = useMemo(() => {
    const nowDate = new Date();
    const now = nowDate.getTime();
    const todayStr = nowDate.toISOString().slice(0, 10);
    const todayLocalDate = nowDate.toDateString();

    const yesterdayDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
    const yesterdayLocalDate = yesterdayDate.toDateString();

    const startOfWeek = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const dayOfWeek = (startOfWeek.getDay() + 6) % 7; // Monday = 0
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekTime = startOfWeek.getTime();

    const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0, 0);
    const startOfMonthTime = startOfMonth.getTime();

    const ms1d = 24 * 60 * 60 * 1000;
    const ms90d = 90 * ms1d;
    const ms180d = 180 * ms1d;

    return (donations || []).filter((d) => {
      if ((d.status || '').toUpperCase() !== 'PAID') return false;
      const dt = new Date(d.paid_at || d.created_at || now);
      const t = dt.getTime();
      const age = now - t;

      switch (selectedTimeframe) {
        case 'today':
          return dt.toISOString().slice(0, 10) === todayStr || dt.toDateString() === todayLocalDate;
        case 'yesterday':
        case '1d':
          return dt.toISOString().slice(0, 10) === yesterdayStr || dt.toDateString() === yesterdayLocalDate;
        case 'this_week':
          return t >= startOfWeekTime && t <= now;
        case 'last_week':
          return age <= 7 * ms1d;
        case 'this_month':
          return t >= startOfMonthTime && t <= now;
        case 'last_month':
          return age <= 30 * ms1d;
        case '3_months':
          return age <= ms90d;
        case '6_months':
          return age <= ms180d;
        case 'custom': {
          const startT = new Date(`${customRange.startDate}T00:00:00`).getTime();
          const endT = new Date(`${customRange.endDate}T23:59:59.999`).getTime();
          return t >= startT && t <= endT;
        }
        case '3d':
          return age <= 3 * ms1d;
        case 'lifetime':
        default:
          return true;
      }
    });
  }, [donations, selectedTimeframe, customRange]);

  // Active metrics based on selected timeframe (merging server timeframeAnalytics with filteredDonations)
  const activeMetrics: TimeframeMetrics = useMemo(() => {
    let calcUsd = 0;
    let calcKhr = 0;
    for (const d of filteredDonations) {
      const amt = Number(d.amount) || 0;
      if (d.currency === 'KHR') calcKhr += amt;
      else calcUsd += amt;
    }
    const calcCount = filteredDonations.length;

    const nowDate = new Date();
    const dayOfWeek = (nowDate.getDay() + 6) % 7;
    const startT = new Date(`${customRange.startDate}T00:00:00`).getTime();
    const endT = new Date(`${customRange.endDate}T23:59:59.999`).getTime();
    const customDays = Math.max(1, Math.ceil((endT - startT) / (24 * 60 * 60 * 1000)));

    const daysFactor =
      selectedTimeframe === 'today' || selectedTimeframe === 'yesterday' || selectedTimeframe === '1d'
        ? 1
        : selectedTimeframe === '3d'
        ? 3
        : selectedTimeframe === 'this_week' || selectedTimeframe === 'last_week'
        ? Math.max(1, dayOfWeek + 1)
        : selectedTimeframe === 'this_month' || selectedTimeframe === 'last_month'
        ? Math.max(1, nowDate.getDate())
        : selectedTimeframe === '3_months'
        ? 90
        : selectedTimeframe === '6_months'
        ? 180
        : selectedTimeframe === 'custom'
        ? customDays
        : 30;

    const serverMetrics = timeframeAnalytics?.[selectedTimeframe] || (
      selectedTimeframe === 'yesterday' ? timeframeAnalytics?.['1d'] :
      selectedTimeframe === 'this_week' ? timeframeAnalytics?.last_week :
      selectedTimeframe === 'this_month' ? timeframeAnalytics?.last_month : undefined
    );
    const usd = Math.max(serverMetrics?.usd ?? 0, calcUsd);
    const khr = Math.max(serverMetrics?.khr ?? 0, calcKhr);
    const count = Math.max(serverMetrics?.count ?? 0, calcCount);

    return {
      usd,
      khr,
      count,
      avgPerDayUsd: serverMetrics?.avgPerDayUsd ?? Number((usd / daysFactor).toFixed(2)),
      avgPerDayKhr: serverMetrics?.avgPerDayKhr ?? Math.round(khr / daysFactor),
      potentialMonthlyUsd: serverMetrics?.potentialMonthlyUsd ?? Number(((usd / daysFactor) * 30).toFixed(2)),
      potentialMonthlyKhr: serverMetrics?.potentialMonthlyKhr ?? Math.round((khr / daysFactor) * 30)
    };
  }, [timeframeAnalytics, selectedTimeframe, filteredDonations, customRange]);

  const timeframeTabs: Array<{ key: TimeframeOption; label: string; periodLabel: string }> = [
    { key: 'today', label: 'Today', periodLabel: "Today's stream" },
    { key: 'yesterday', label: 'Yesterday', periodLabel: "Yesterday's stream" },
    { key: 'last_week', label: 'Last Week', periodLabel: 'Last 7 days' },
    { key: 'last_month', label: 'Last Month', periodLabel: 'Last 30 days' },
    { key: '3_months', label: '3 Months', periodLabel: 'Past 3 months' },
    { key: '6_months', label: '6 Months', periodLabel: 'Past 6 months' },
    { key: 'lifetime', label: 'Lifetime', periodLabel: 'All-time lifetime' },
    { key: 'custom', label: 'Custom', periodLabel: `${customRange.startDate} to ${customRange.endDate}` }
  ];

  const currentTab = timeframeTabs.find((t) => t.key === selectedTimeframe) || timeframeTabs[0];

  // Combined Earning Revenue for the selected filter: USD tips + (KHR tips / 4000)
  const khrConvertedToUsd = Number(activeMetrics.khr || 0) / 4000;
  const totalEarningRevenueUsd = Number(activeMetrics.usd || 0) + khrConvertedToUsd;

  // Build time-series buckets for the Analytics Graph
  const graphSeries = useMemo(() => {
    const now = new Date();
    const buckets: Array<{ label: string; usdEquiv: number; count: number }> = [];

    if (selectedTimeframe === 'today') {
      // 8 x 3-hour buckets over the last 24h
      for (let i = 7; i >= 0; i--) {
        const end = new Date(now.getTime() - i * 3 * 3600 * 1000);
        const start = new Date(end.getTime() - 3 * 3600 * 1000);
        const label = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        let usdEquiv = 0;
        let count = 0;
        for (const d of filteredDonations) {
          const t = new Date(d.paid_at || d.created_at).getTime();
          if (t > start.getTime() && t <= end.getTime()) {
            const amt = Number(d.amount) || 0;
            usdEquiv += d.currency === 'KHR' ? amt / 4000 : amt;
            count++;
          }
        }
        buckets.push({ label, usdEquiv: Number(usdEquiv.toFixed(2)), count });
      }
    } else if (selectedTimeframe === 'yesterday' || selectedTimeframe === '1d') {
      // 8 x 3-hour buckets across yesterday
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      for (let i = 0; i < 8; i++) {
        const start = new Date(startOfYesterday.getTime() + i * 3 * 3600 * 1000);
        const end = new Date(start.getTime() + 3 * 3600 * 1000);
        const label = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        let usdEquiv = 0;
        let count = 0;
        for (const d of filteredDonations) {
          const t = new Date(d.paid_at || d.created_at).getTime();
          if (t >= start.getTime() && t < end.getTime()) {
            const amt = Number(d.amount) || 0;
            usdEquiv += d.currency === 'KHR' ? amt / 4000 : amt;
            count++;
          }
        }
        buckets.push({ label, usdEquiv: Number(usdEquiv.toFixed(2)), count });
      }
    } else if (selectedTimeframe === 'this_week' || selectedTimeframe === 'last_week') {
      // 7 daily buckets for the week (Mon to Sun)
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOfWeek = (startOfWeek.getDay() + 6) % 7; // Monday = 0
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek.getTime() + i * 86400000);
        const dateStr = day.toISOString().slice(0, 10);
        const label = day.toLocaleDateString([], { weekday: 'short' });
        let usdEquiv = 0;
        let count = 0;
        for (const d of filteredDonations) {
          const dDate = new Date(d.paid_at || d.created_at);
          const dStr = dDate.toISOString().slice(0, 10);
          if (dStr === dateStr) {
            const amt = Number(d.amount) || 0;
            usdEquiv += d.currency === 'KHR' ? amt / 4000 : amt;
            count++;
          }
        }
        buckets.push({ label, usdEquiv: Number(usdEquiv.toFixed(2)), count });
      }
    } else if (selectedTimeframe === '3_months') {
      // 6 x 15-day buckets across past 90 days
      for (let i = 5; i >= 0; i--) {
        const end = new Date(now.getTime() - i * 15 * 86400000);
        const start = new Date(end.getTime() - 15 * 86400000);
        const label = end.toLocaleDateString([], { month: 'short', day: 'numeric' });
        let usdEquiv = 0;
        let count = 0;
        for (const d of filteredDonations) {
          const t = new Date(d.paid_at || d.created_at).getTime();
          if (t > start.getTime() && t <= end.getTime()) {
            const amt = Number(d.amount) || 0;
            usdEquiv += d.currency === 'KHR' ? amt / 4000 : amt;
            count++;
          }
        }
        buckets.push({ label, usdEquiv: Number(usdEquiv.toFixed(2)), count });
      }
    } else if (selectedTimeframe === '6_months') {
      // 6 monthly buckets (one per month)
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
        const label = monthDate.toLocaleDateString([], { month: 'short' });
        let usdEquiv = 0;
        let count = 0;
        for (const d of filteredDonations) {
          const t = new Date(d.paid_at || d.created_at).getTime();
          if (t >= start.getTime() && t <= end.getTime()) {
            const amt = Number(d.amount) || 0;
            usdEquiv += d.currency === 'KHR' ? amt / 4000 : amt;
            count++;
          }
        }
        buckets.push({ label, usdEquiv: Number(usdEquiv.toFixed(2)), count });
      }
    } else if (selectedTimeframe === '3d') {
      for (let i = 2; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 86400000);
        const dateStr = day.toISOString().slice(0, 10);
        const label = day.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        let usdEquiv = 0;
        let count = 0;
        for (const d of filteredDonations) {
          const dStr = new Date(d.paid_at || d.created_at).toISOString().slice(0, 10);
          if (dStr === dateStr) {
            const amt = Number(d.amount) || 0;
            usdEquiv += d.currency === 'KHR' ? amt / 4000 : amt;
            count++;
          }
        }
        buckets.push({ label, usdEquiv: Number(usdEquiv.toFixed(2)), count });
      }
    } else if (selectedTimeframe === 'custom') {
      const startT = new Date(`${customRange.startDate}T00:00:00`).getTime();
      const endT = new Date(`${customRange.endDate}T23:59:59.999`).getTime();
      const safeStart = Math.min(startT, endT);
      const safeEnd = Math.max(startT, endT);
      const diffMs = Math.max(86400000, safeEnd - safeStart);
      const totalDays = Math.max(1, Math.round(diffMs / 86400000));

      if (totalDays <= 1) {
        // 8 x 3-hour buckets across the single custom day
        for (let i = 0; i < 8; i++) {
          const bStart = safeStart + i * (diffMs / 8);
          const bEnd = safeStart + (i + 1) * (diffMs / 8);
          const label = new Date(bEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          let usdEquiv = 0;
          let count = 0;
          for (const d of filteredDonations) {
            const t = new Date(d.paid_at || d.created_at).getTime();
            if (t >= bStart && t <= bEnd) {
              const amt = Number(d.amount) || 0;
              usdEquiv += d.currency === 'KHR' ? amt / 4000 : amt;
              count++;
            }
          }
          buckets.push({ label, usdEquiv: Number(usdEquiv.toFixed(2)), count });
        }
      } else if (totalDays <= 8) {
        // 1 bucket per day
        for (let i = 0; i < totalDays; i++) {
          const dTime = safeStart + i * 86400000;
          const dayDate = new Date(dTime);
          const dateStr = dayDate.toISOString().slice(0, 10);
          const label = dayDate.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
          let usdEquiv = 0;
          let count = 0;
          for (const d of filteredDonations) {
            const dStr = new Date(d.paid_at || d.created_at).toISOString().slice(0, 10);
            if (dStr === dateStr) {
              const amt = Number(d.amount) || 0;
              usdEquiv += d.currency === 'KHR' ? amt / 4000 : amt;
              count++;
            }
          }
          buckets.push({ label, usdEquiv: Number(usdEquiv.toFixed(2)), count });
        }
      } else {
        // 6 evenly distributed intervals
        const numBuckets = 6;
        const bucketDuration = diffMs / numBuckets;
        for (let i = 0; i < numBuckets; i++) {
          const bStart = safeStart + i * bucketDuration;
          const bEnd = safeStart + (i + 1) * bucketDuration;
          const label = new Date(bEnd).toLocaleDateString([], { month: 'short', day: 'numeric' });
          let usdEquiv = 0;
          let count = 0;
          for (const d of filteredDonations) {
            const t = new Date(d.paid_at || d.created_at).getTime();
            if (t >= bStart && t <= bEnd) {
              const amt = Number(d.amount) || 0;
              usdEquiv += d.currency === 'KHR' ? amt / 4000 : amt;
              count++;
            }
          }
          buckets.push({ label, usdEquiv: Number(usdEquiv.toFixed(2)), count });
        }
      }
    } else {
      // this_month / last_month / lifetime: 6 buckets
      for (let i = 5; i >= 0; i--) {
        const end = new Date(now.getTime() - i * 5 * 86400000);
        const start = new Date(end.getTime() - 5 * 86400000);
        const label = end.toLocaleDateString([], { month: 'short', day: 'numeric' });
        let usdEquiv = 0;
        let count = 0;
        for (const d of filteredDonations) {
          const t = new Date(d.paid_at || d.created_at).getTime();
          if (t > start.getTime() && t <= end.getTime()) {
            const amt = Number(d.amount) || 0;
            usdEquiv += d.currency === 'KHR' ? amt / 4000 : amt;
            count++;
          }
        }
        buckets.push({ label, usdEquiv: Number(usdEquiv.toFixed(2)), count });
      }
    }

    return buckets;
  }, [filteredDonations, selectedTimeframe, customRange]);

  // Build Pie / Donut Chart slices
  const pieSlices = useMemo(() => {
    const usdVal = Number(activeMetrics.usd || 0);
    const khrEquivUsd = Number((activeMetrics.khr || 0) / 4000);
    const total = usdVal + khrEquivUsd;

    if (total <= 0) {
      return [
        { label: 'USD ($)', value: 0, displayAmount: '$0.00', percent: 50, color: '#00F0FF' },
        { label: 'KHR (៛)', value: 0, displayAmount: '0 ៛', percent: 50, color: '#EC4899' }
      ];
    }

    const usdPct = Math.round((usdVal / total) * 100);
    const khrPct = Math.max(0, 100 - usdPct);

    return [
      {
        label: 'USD ($)',
        value: usdVal,
        displayAmount: `$${formatUSD(usdVal)}`,
        percent: usdPct,
        color: '#00F0FF'
      },
      {
        label: 'KHR (៛)',
        value: khrEquivUsd,
        displayAmount: `${formatKHR(activeMetrics.khr)} ៛`,
        percent: khrPct,
        color: '#EC4899'
      }
    ];
  }, [activeMetrics]);

  return (
    <div className="space-y-4">
      {/* Top Header Bar & Timeframe Filter (Responsive in Single Row) */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pb-0.5 min-w-0">
        <h2 className="text-xs xs:text-sm sm:text-base md:text-lg font-bold text-white font-['Chakra_Petch'] tracking-wide truncate min-w-0 flex-1">
          Performance &amp; Earning Revenue
        </h2>

        {/* Timeframe Filter Dropdown & Custom Range Picker */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {selectedTimeframe === 'custom' && (
            <div className="hidden xs:flex items-center gap-1.5 bg-[#090D18] border border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm text-xs font-mono">
              <Calendar size={13} className="text-cyan-400 shrink-0" />
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) => setCustomRange({ ...customRange, startDate: e.target.value })}
                className="bg-transparent text-white border-0 p-0 text-[11px] sm:text-xs font-mono focus:outline-none [color-scheme:dark] cursor-pointer"
                title="Start Date"
                aria-label="Start Date"
              />
              <span className="text-slate-500 text-xs font-mono">→</span>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) => setCustomRange({ ...customRange, endDate: e.target.value })}
                className="bg-transparent text-white border-0 p-0 text-[11px] sm:text-xs font-mono focus:outline-none [color-scheme:dark] cursor-pointer"
                title="End Date"
                aria-label="End Date"
              />
            </div>
          )}

          <div className="relative shrink-0">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as TimeframeOption)}
              aria-label="Filter timeframe"
              className="appearance-none pl-2.5 sm:pl-3.5 pr-7 sm:pr-9 py-1.5 sm:py-2 rounded-xl bg-[#090D18] border border-slate-800 text-[11px] sm:text-xs font-mono font-bold text-white hover:border-slate-700 focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer shadow-sm"
            >
              {timeframeTabs.map((tab) => (
                <option key={tab.key} value={tab.key} className="bg-slate-950 text-white py-1">
                  {tab.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Primary Earning Revenue Big Card + 3 Child Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 sm:gap-4 items-stretch">
        {/* Primary Big Card: Earning Revenue */}
        <div className="lg:col-span-2 rounded-2xl bg-[#090D18] border border-slate-800 p-5 sm:p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider font-['Chakra_Petch']">
                Earning Revenue ({currentTab.label})
              </span>
            </div>

            <div className="mt-3.5 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                ${formatUSD(totalEarningRevenueUsd)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
            <span className="text-slate-300 font-medium truncate">
              ${formatUSD(activeMetrics.usd)} + {formatKHR(activeMetrics.khr)} ៛ (${formatUSD(khrConvertedToUsd)})
            </span>
            <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">4,000 ៛ = $1</span>
          </div>
        </div>

        {/* 3 Child Cards Displayed as a 3-Column Grid Across Device Screens */}
        <div className="lg:col-span-3 grid grid-cols-3 gap-2.5 sm:gap-4 items-stretch">
          {/* Child Card 1: Tips USD */}
          <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-3 sm:p-5 flex flex-col justify-between shadow-sm min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
              Tips (USD)
            </span>
            <div className="my-2 sm:my-2.5">
              <span className="text-base sm:text-2xl font-black tracking-tight text-white font-mono block truncate">
                ${formatUSD(activeMetrics.usd)}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/60 truncate">
              ${formatUSD(activeMetrics.avgPerDayUsd)}/day rate
            </div>
          </div>

          {/* Child Card 2: Tips KHR */}
          <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-3 sm:p-5 flex flex-col justify-between shadow-sm min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
              Tips (KHR)
            </span>
            <div className="my-2 sm:my-2.5">
              <span className="text-base sm:text-2xl font-black tracking-tight text-white font-mono block truncate">
                {formatKHR(activeMetrics.khr)} <span className="text-[10px] sm:text-xs font-bold text-slate-400">៛</span>
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/60 truncate">
              ~{formatKHR(activeMetrics.avgPerDayKhr)} ៛/day rate
            </div>
          </div>

          {/* Child Card 3: Tips Count */}
          <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-3 sm:p-5 flex flex-col justify-between shadow-sm min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
              Tips Count
            </span>
            <div className="my-2 sm:my-2.5">
              <span className="text-base sm:text-2xl font-black tracking-tight text-white font-mono block truncate">
                {formatCount(activeMetrics.count)}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/60 truncate">
              {currentTab.periodLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Next Section: Analytics Graph & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 sm:gap-4 items-stretch">
        {/* Left (3 cols): Revenue Analytics Graph */}
        <div className="lg:col-span-3 rounded-2xl bg-[#090D18] border border-slate-800 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <TrendingUp size={15} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
                Revenue Analytics Graph ({currentTab.label})
              </h3>
              <p className="text-[11px] text-slate-400">
                USD-equivalent tip trend across {currentTab.periodLabel.toLowerCase()}
              </p>
            </div>
          </div>

          {/* SVG Graph Canvas */}
          <div className="relative pt-4 pb-1 flex-1 flex flex-col justify-end min-h-[190px]">
            {(() => {
              const maxVal = Math.max(...graphSeries.map((b) => b.usdEquiv), 10);
              const width = 560;
              const height = 145;
              const padLeft = 36;
              const padRight = 16;
              const padTop = 14;
              const padBottom = 26;
              const plotW = width - padLeft - padRight;
              const plotH = height - padTop - padBottom;

              const points = graphSeries.map((b, i) => {
                const x =
                  graphSeries.length > 1
                    ? padLeft + (i / (graphSeries.length - 1)) * plotW
                    : padLeft + plotW / 2;
                const y = padTop + plotH - (b.usdEquiv / maxVal) * plotH;
                return { x, y, ...b };
              });

              const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
              const areaPath =
                points.length > 0
                  ? `M ${points[0].x},${padTop + plotH} L ${points
                      .map((p) => `${p.x},${p.y}`)
                      .join(' L ')} L ${points[points.length - 1].x},${padTop + plotH} Z`
                  : '';

              return (
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-44 overflow-visible select-none"
                >
                  <defs>
                    <linearGradient id="overviewAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {[0, 0.5, 1].map((ratio, idx) => {
                    const y = padTop + plotH * (1 - ratio);
                    const labelVal = Math.round(maxVal * ratio);
                    return (
                      <g key={idx}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={width - padRight}
                          y2={y}
                          stroke="#1E293B"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={padLeft - 6}
                          y={y + 3}
                          textAnchor="end"
                          className="fill-slate-500 text-[9px] font-mono"
                        >
                          ${labelVal}
                        </text>
                      </g>
                    );
                  })}

                  {areaPath && <path d={areaPath} fill="url(#overviewAreaGrad)" />}
                  {points.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#00F0FF"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylinePoints}
                    />
                  )}
                  {points.map((p, idx) => {
                    const isHovered = hoveredPointIdx === idx;
                    return (
                      <g
                        key={idx}
                        onMouseEnter={() => setHoveredPointIdx(idx)}
                        onMouseLeave={() => setHoveredPointIdx(null)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 5.5 : 3.5}
                          fill="#090D18"
                          stroke="#00F0FF"
                          strokeWidth={isHovered ? 3 : 2}
                        />
                        {isHovered && (
                          <g transform={`translate(${Math.min(Math.max(p.x, 60), width - 60)}, ${Math.max(p.y - 28, 12)})`}>
                            <rect
                              x="-48"
                              y="-14"
                              width="96"
                              height="20"
                              rx="5"
                              fill="#0F172A"
                              stroke="#00F0FF"
                              strokeWidth="1"
                            />
                            <text
                              x="0"
                              y="-1"
                              textAnchor="middle"
                              className="fill-cyan-300 text-[9px] font-mono font-bold"
                            >
                              ${formatUSD(p.usdEquiv)} ({p.count})
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* X-Axis Labels */}
                  {points.map((p, idx) => (
                    <text
                      key={idx}
                      x={p.x}
                      y={height - 6}
                      textAnchor="middle"
                      className="fill-slate-400 text-[9px] font-mono"
                    >
                      {p.label}
                    </text>
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>

        {/* Right (2 cols): Pie / Donut Breakdown Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-[#090D18] border border-slate-800 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
            <div className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <PieChartIcon size={15} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
                Revenue Pie Chart
              </h3>
              <p className="text-[11px] text-slate-400">
                Distribution by currency
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row lg:flex-col 2xl:flex-row items-center justify-center sm:justify-between lg:justify-center 2xl:justify-between gap-4 flex-1 min-w-0">
            {/* SVG Donut Pie Chart */}
            <div className="relative w-28 h-28 xs:w-32 xs:h-32 sm:w-36 sm:h-36 lg:w-32 lg:h-32 xl:w-36 xl:h-36 flex items-center justify-center shrink-0">
              {(() => {
                const size = 136;
                const strokeWidth = 18;
                const radius = (size - strokeWidth) / 2;
                const circumference = 2 * Math.PI * radius;
                let cumulativePercent = 0;

                const totalVal = pieSlices.reduce((acc, s) => acc + s.value, 0);

                return (
                  <>
                    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="#1E293B"
                        strokeWidth={strokeWidth}
                      />
                      {totalVal > 0 &&
                        pieSlices.map((slice, idx) => {
                          const strokeDasharray = `${(slice.percent / 100) * circumference} ${circumference}`;
                          const strokeDashoffset = -((cumulativePercent / 100) * circumference);
                          cumulativePercent += slice.percent;

                          return (
                            <circle
                              key={idx}
                              cx={size / 2}
                              cy={size / 2}
                              r={radius}
                              fill="transparent"
                              stroke={slice.color}
                              strokeWidth={strokeWidth}
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="butt"
                            />
                          );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Total</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-white truncate max-w-[85px] sm:max-w-[100px]">
                        ${formatUSD(activeMetrics.usd + (activeMetrics.khr || 0) / 4000)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Pie Legend List */}
            <div className="w-full flex-1 space-y-2.5 min-w-0">
              {pieSlices.map((slice, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-mono min-w-0 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 shrink">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color, boxShadow: `0 0 8px ${slice.color}66` }}
                    />
                    <span className="text-slate-200 font-bold text-xs truncate">{slice.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <span className="text-slate-300 font-mono font-medium text-xs whitespace-nowrap">
                      {slice.displayAmount}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-bold text-white min-w-[38px] text-center shrink-0"
                      style={{ borderColor: `${slice.color}40` }}
                    >
                      {slice.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
