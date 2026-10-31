'use client';

import React from 'react';
import {
  Bell,
  CreditCard,
  Layers,
  Video,
  Trophy,
  Volume2,
  Disc,
  Target,
  Timer,
  Search,
  Monitor,
  User,
  Image as ImageIcon,
  Sparkles,
  Gamepad2,
  Plus,
  RefreshCw,
  Copy
} from 'lucide-react';

export type DashboardTab =
  | 'overview'
  | 'donations'
  | 'donation'
  | 'alerts'
  | 'media'
  | 'video-alerts'
  | 'leaderboard'
  | 'soundboard'
  | 'goal'
  | 'timer'
  | 'wheel'
  | 'pokemon'
  | 'payments'
  | 'telegram'
  | 'account'
  | 'settings'
  | 'security'
  | 'mailbox'
  | 'support'
  | 'report-issue'
  | 'admin-users'
  | 'admin-requests'
  | 'admin-promotion';

// ==============================================================
// 1. OVERVIEW SKELETON
// ==============================================================
export const OverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse w-full max-w-6xl mx-auto pb-12 select-none">
      {/* Top Banner Skeleton */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090D18] border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex-shrink-0" />
          <div className="space-y-2 flex-1 sm:flex-initial">
            <div className="h-4 w-44 bg-slate-800 rounded" />
            <div className="h-3 w-64 bg-slate-800/50 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="h-8 w-24 bg-slate-800/70 rounded-xl" />
          <div className="h-8 w-28 bg-slate-800/90 rounded-xl" />
        </div>
      </div>

      {/* 4 HUD Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-[#090D18] border border-slate-800/80 space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-slate-800/70 rounded" />
              <div className="w-7 h-7 rounded-lg bg-slate-800/80" />
            </div>
            <div className="h-8 w-36 bg-slate-800 rounded-lg pt-1" />
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/40">
              <div className="h-2.5 w-16 bg-slate-800/60 rounded" />
              <div className="h-2.5 w-10 bg-slate-800/40 rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* 3 Quick Action Streamer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-[#090D18] border border-slate-800/80 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-32 bg-slate-800/60 rounded" />
              <div className="w-5 h-5 rounded bg-slate-800/80" />
            </div>
            <div className="h-4 w-44 bg-slate-800 rounded" />
            <div className="space-y-1.5 pt-1">
              <div className="h-2.5 w-full bg-slate-800/40 rounded" />
              <div className="h-2.5 w-4/5 bg-slate-800/30 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Donations Table Skeleton */}
      <div className="rounded-2xl bg-[#090D18] border border-slate-800/80 overflow-hidden">
        <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-4 w-40 bg-slate-800 rounded" />
            <div className="h-2.5 w-56 bg-slate-800/40 rounded" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-8 w-28 bg-slate-800/60 rounded-xl" />
            <div className="h-8 w-24 bg-slate-800/40 rounded-xl" />
          </div>
        </div>

        <div className="divide-y divide-slate-800/40 p-2 sm:p-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="py-3.5 px-3 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex-shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <div className="h-3.5 w-28 bg-slate-800 rounded" />
                  <div className="h-2.5 w-48 sm:w-64 bg-slate-800/50 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 text-right">
                <div className="hidden sm:block h-6 w-20 bg-slate-800/50 rounded-lg" />
                <div className="space-y-1">
                  <div className="h-4 w-16 bg-slate-800 rounded ml-auto" />
                  <div className="h-2.5 w-12 bg-slate-800/40 rounded ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 2. PAYMENT GATEWAY SKELETON
// ==============================================================
export const PaymentGatewaySkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* 3-Step Animated Line Task Bar Skeleton */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090D18] border border-slate-800/90 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-28 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-96 h-28 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />

        <div className="relative flex items-center justify-between px-2 sm:px-8">
          <div className="absolute left-[16%] right-[50%] top-5 -translate-y-1/2 h-1 bg-slate-800/80 rounded-full" />
          <div className="absolute left-[50%] right-[16%] top-5 -translate-y-1/2 h-1 bg-slate-800/80 rounded-full" />

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 animate-pulse flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
            </div>
            <div className="w-14 h-3 rounded bg-slate-800 mt-2.5" />
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 animate-pulse flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
            </div>
            <div className="w-12 h-3 rounded bg-slate-800 mt-2.5" />
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 animate-pulse flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
            </div>
            <div className="w-14 h-3 rounded bg-slate-800 mt-2.5" />
          </div>
        </div>
      </div>

      {/* Main Card Skeleton */}
      <div className="rounded-2xl bg-[#090D18]/90 border border-slate-800/90 shadow-2xl p-5 sm:p-7 space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-800/80 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-24 h-5 rounded-full bg-cyan-950/40 border border-cyan-500/20" />
              <div className="w-48 h-5 rounded-lg bg-slate-800" />
            </div>
            <div className="w-64 sm:w-96 h-3.5 rounded bg-slate-800/60" />
          </div>
          <div className="w-28 h-8 rounded-xl bg-slate-800/60" />
        </div>

        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <div className="w-32 h-3 rounded bg-slate-800/60" />
            <div className="w-full h-12 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center px-4">
              <div className="w-10 h-5 rounded bg-slate-800" />
              <div className="w-px h-6 bg-slate-800 mx-3" />
              <div className="w-40 h-4 rounded bg-slate-800/60" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-800 shrink-0 mt-0.5" />
            <div className="space-y-2 w-full">
              <div className="w-48 h-3.5 rounded bg-slate-800" />
              <div className="w-full max-w-md h-2.5 rounded bg-slate-800/50" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <div className="w-28 h-10 rounded-xl bg-slate-900/80 border border-slate-800" />
            <div className="w-44 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 3. DONATION ALERTS SKELETON
// ==============================================================
export const DonationAlertsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-6 w-64 bg-slate-800 rounded-lg flex items-center gap-2" />
          <div className="h-3 w-96 bg-slate-800/50 rounded" />
        </div>
        <div className="h-9 w-40 bg-cyan-950/40 border border-cyan-500/30 rounded-xl" />
      </div>

      {/* Universal OBS URL Bar Skeleton */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-44 bg-slate-800 rounded" />
            <div className="h-2.5 w-72 bg-slate-800/40 rounded" />
          </div>
        </div>
        <div className="h-8 w-24 bg-slate-800 rounded-lg" />
      </div>

      {/* Alert Boxes Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-[#090D18] border border-slate-800/90 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 bg-slate-800 rounded-full" />
              <div className="h-5 w-12 bg-slate-800/60 rounded-full" />
            </div>

            {/* Media preview thumbnail */}
            <div className="w-full h-36 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-slate-800" />
            </div>

            <div className="space-y-1.5">
              <div className="h-4 w-40 bg-slate-800 rounded" />
              <div className="h-3 w-56 bg-slate-800/50 rounded" />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
              <div className="h-8 w-20 bg-slate-800/60 rounded-lg" />
              <div className="h-8 w-24 bg-slate-800 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================
// 4. MEDIA LIBRARY SKELETON
// ==============================================================
export const MediaLibrarySkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Header with quota bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#090D18] border border-slate-800">
        <div className="space-y-2 flex-1 max-w-md">
          <div className="h-5 w-40 bg-slate-800 rounded" />
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
            <div className="w-1/3 h-full bg-cyan-500/40 rounded-full" />
          </div>
          <div className="h-2.5 w-48 bg-slate-800/50 rounded" />
        </div>
        <div className="h-10 w-36 bg-cyan-950/40 border border-cyan-500/30 rounded-xl" />
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 bg-slate-900 border border-slate-800 rounded-xl flex-shrink-0" />
          ))}
        </div>
        <div className="h-9 w-60 bg-slate-950 border border-slate-800 rounded-xl" />
      </div>

      {/* Media Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <div key={i} className="rounded-xl bg-[#090D18] border border-slate-800 p-2.5 space-y-2">
            <div className="w-full aspect-square rounded-lg bg-slate-900" />
            <div className="h-3 w-3/4 bg-slate-800 rounded" />
            <div className="h-2 w-1/2 bg-slate-800/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================
// 5. VIDEO ALERTS SKELETON
// ==============================================================
export const VideoAlertsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* OBS URL Header */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-44 bg-slate-800 rounded" />
            <div className="h-2.5 w-64 bg-slate-800/40 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-slate-800 rounded-lg" />
          <div className="h-8 w-28 bg-red-950/40 border border-red-500/30 rounded-lg" />
        </div>
      </div>

      {/* Video Workbench Card */}
      <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-slate-800/60 rounded" />
          <div className="h-10 w-full rounded-xl bg-slate-950 border border-slate-800" />
        </div>

        {/* 16:9 Video Canvas Skeleton */}
        <div className="w-full aspect-video rounded-2xl bg-black border border-slate-800/80 flex items-center justify-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-950">
            <div className="h-full w-1/2 bg-red-600/40" />
          </div>
        </div>

        {/* Scrubber Line Skeleton */}
        <div className="space-y-2 py-2">
          <div className="w-full h-2.5 rounded-sm bg-slate-800 relative" />
          <div className="flex justify-between">
            <div className="h-3 w-10 bg-slate-800 rounded" />
            <div className="h-3 w-32 bg-slate-800/40 rounded" />
            <div className="h-3 w-10 bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 6. LEADERBOARD SKELETON
// ==============================================================
export const LeaderboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Header & Save Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-6 w-52 bg-slate-800 rounded-lg" />
          <div className="h-3 w-80 bg-slate-800/50 rounded" />
        </div>
        <div className="h-9 w-36 bg-amber-950/40 border border-amber-500/30 rounded-xl" />
      </div>

      {/* OBS URL Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-40 bg-slate-800 rounded" />
            <div className="h-2.5 w-60 bg-slate-800/40 rounded" />
          </div>
        </div>
        <div className="h-8 w-24 bg-slate-800 rounded-lg" />
      </div>

      {/* Two Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Styles */}
        <div className="lg:col-span-6 space-y-4">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-[#090D18] border border-slate-800 p-4 space-y-2">
                <div className="h-3.5 w-20 bg-slate-800 rounded" />
                <div className="h-2.5 w-full bg-slate-800/50 rounded" />
                <div className="h-12 w-full rounded-xl bg-slate-900 mt-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Preview & Options */}
        <div className="lg:col-span-6 space-y-4">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-6 space-y-5">
            {/* Podium Preview */}
            <div className="space-y-3">
              {[1, 2, 3].map((rank) => (
                <div key={rank} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-800" />
                    <div className="h-3.5 w-24 bg-slate-800 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-slate-800 rounded" />
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="h-8 w-full bg-slate-900 rounded-xl" />
              <div className="h-8 w-full bg-slate-900 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 7. SOUNDBOARD SKELETON
// ==============================================================
export const SoundboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-6 w-48 bg-slate-800 rounded-lg" />
          <div className="h-3 w-72 bg-slate-800/50 rounded" />
        </div>
        <div className="h-9 w-32 bg-emerald-950/40 border border-emerald-500/30 rounded-xl" />
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-40 bg-slate-800 rounded" />
            <div className="h-2.5 w-60 bg-slate-800/40 rounded" />
          </div>
        </div>
        <div className="h-8 w-24 bg-slate-800 rounded-lg" />
      </div>

      {/* Sound Tiles Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 space-y-3">
            <div className="flex justify-between">
              <div className="w-8 h-8 rounded-xl bg-slate-800" />
              <div className="w-8 h-6 rounded bg-slate-800/60" />
            </div>
            <div className="h-4 w-28 bg-slate-800 rounded" />
            <div className="h-2 w-full bg-slate-900 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================
// 8. GOAL WIDGET SKELETON
// ==============================================================
export const GoalSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-6 w-48 bg-slate-800 rounded-lg" />
          <div className="h-3 w-80 bg-slate-800/50 rounded" />
        </div>
        <div className="h-9 w-36 bg-cyan-950/40 border border-cyan-500/30 rounded-xl" />
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-36 bg-slate-800 rounded" />
            <div className="h-2.5 w-60 bg-slate-800/40 rounded" />
          </div>
        </div>
        <div className="h-8 w-24 bg-slate-800 rounded-lg" />
      </div>

      {/* Goal Bar Preview Card */}
      <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-6 space-y-6">
        <div className="h-4 w-28 bg-slate-800 rounded" />
        <div className="p-6 rounded-2xl bg-black border border-slate-800 space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-32 bg-slate-800 rounded" />
            <div className="h-4 w-24 bg-slate-800 rounded" />
          </div>
          <div className="w-full h-6 rounded-xl bg-slate-900 overflow-hidden">
            <div className="h-full w-2/3 bg-cyan-500/40" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="h-10 rounded-xl bg-slate-950 border border-slate-800" />
          <div className="h-10 rounded-xl bg-slate-950 border border-slate-800" />
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 9. TIMER SKELETON
// ==============================================================
export const TimerSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-6 w-52 bg-slate-800 rounded-lg" />
          <div className="h-3 w-80 bg-slate-800/50 rounded" />
        </div>
        <div className="h-9 w-32 bg-orange-950/40 border border-orange-500/30 rounded-xl" />
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-36 bg-slate-800 rounded" />
            <div className="h-2.5 w-60 bg-slate-800/40 rounded" />
          </div>
        </div>
        <div className="h-8 w-24 bg-slate-800 rounded-lg" />
      </div>

      {/* Big Digits Box */}
      <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-8 text-center space-y-6">
        <div className="h-20 w-80 bg-slate-900 border border-slate-800 rounded-2xl mx-auto" />
        <div className="flex justify-center gap-3">
          <div className="h-10 w-28 bg-slate-800 rounded-xl" />
          <div className="h-10 w-28 bg-slate-800 rounded-xl" />
          <div className="h-10 w-28 bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 10. WHEEL SKELETON
// ==============================================================
export const WheelSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-6 w-52 bg-slate-800 rounded-lg" />
          <div className="h-3 w-80 bg-slate-800/50 rounded" />
        </div>
        <div className="h-9 w-32 bg-purple-950/40 border border-purple-500/30 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="aspect-square max-w-md mx-auto w-full rounded-2xl bg-[#090D18] border border-slate-800 flex items-center justify-center p-8">
          <div className="w-64 h-64 rounded-full border-4 border-slate-800 bg-slate-900" />
        </div>
        <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-6 space-y-4">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-full rounded-xl bg-slate-900 border border-slate-800" />
          ))}
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 11. POKEMON SKELETON
// ==============================================================
export const PokemonSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      <div className="h-6 w-52 bg-slate-800 rounded-lg" />
      <div className="w-full h-72 rounded-2xl bg-[#090D18] border border-slate-800 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-slate-800" />
      </div>
    </div>
  );
};

// ==============================================================
// 12. DONATION LEDGER SKELETON
// ==============================================================
export const DonationLedgerSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-6 w-56 bg-slate-800 rounded-lg" />
          <div className="h-3 w-80 bg-slate-800/50 rounded" />
        </div>
        <div className="h-8 w-32 bg-slate-800 rounded-xl" />
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl bg-[#090D18] border border-slate-800 flex items-center justify-between gap-4">
        <div className="h-9 flex-1 max-w-sm rounded-xl bg-slate-950 border border-slate-800" />
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-slate-950 border border-slate-800" />
          <div className="h-9 w-36 rounded-xl bg-slate-950 border border-slate-800" />
        </div>
      </div>

      {/* Table rows */}
      <div className="rounded-2xl bg-[#090D18] border border-slate-800 divide-y divide-slate-800/40 p-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="py-3 px-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 bg-slate-800 rounded" />
                <div className="h-2.5 w-44 bg-slate-800/50 rounded" />
              </div>
            </div>
            <div className="h-4 w-16 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================
// 13. ACCOUNT SKELETON
// ==============================================================
export const AccountSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse select-none">
      <div className="space-y-1.5">
        <div className="h-6 w-36 bg-slate-800 rounded-lg" />
        <div className="h-3 w-80 bg-slate-800/50 rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-[#090D18] border border-slate-800 p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-800 rounded" />
              <div className="h-3 w-48 bg-slate-800/50 rounded" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <div className="h-10 rounded-xl bg-slate-950 border border-slate-800" />
            <div className="h-10 rounded-xl bg-slate-950 border border-slate-800" />
            <div className="h-24 rounded-xl bg-slate-950 border border-slate-800" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-6 space-y-4">
          <div className="w-full aspect-square rounded-xl bg-slate-900 border border-slate-800" />
          <div className="h-9 w-full bg-cyan-950/40 border border-cyan-500/30 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 14. SMART FEATURE TAB SKELETON DISPATCHER
// ==============================================================
export const FeatureTabSkeleton: React.FC<{ tab: DashboardTab | string }> = ({ tab }) => {
  switch (tab) {
    case 'payments':
    case 'telegram':
      return <PaymentGatewaySkeleton />;
    case 'donation':
    case 'alerts':
      return <DonationAlertsSkeleton />;
    case 'media':
      return <MediaLibrarySkeleton />;
    case 'video-alerts':
      return <VideoAlertsSkeleton />;
    case 'leaderboard':
      return <LeaderboardSkeleton />;
    case 'soundboard':
      return <SoundboardSkeleton />;
    case 'goal':
      return <GoalSkeleton />;
    case 'timer':
      return <TimerSkeleton />;
    case 'wheel':
      return <WheelSkeleton />;
    case 'pokemon':
      return <PokemonSkeleton />;
    case 'donations':
      return <DonationLedgerSkeleton />;
    case 'account':
      return <AccountSkeleton />;
    case 'overview':
    default:
      return <OverviewSkeleton />;
  }
};

// Legacy default export for backwards compatibility
export const DashboardSkeleton = OverviewSkeleton;
