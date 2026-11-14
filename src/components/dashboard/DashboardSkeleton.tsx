'use client';

import React from 'react';
import { DashboardTab } from './DashboardSidebar';

// ==============================================================
// 1. OVERVIEW TAB SKELETON (Matches Clean Studio Overview Layout)
// ==============================================================
export const OverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-pulse select-none">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex flex-col justify-between min-h-[112px]"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-slate-800 rounded" />
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800" />
            </div>
            <div className="space-y-2 mt-3">
              <div className="h-7 w-28 bg-slate-800 rounded" />
              <div className="h-2.5 w-36 bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Split: Revenue Chart + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-5">
          {/* Chart Card */}
          <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-slate-800 rounded" />
                <div className="h-2.5 w-56 bg-slate-800/60 rounded" />
              </div>
              <div className="flex gap-1.5">
                <div className="h-7 w-14 rounded-lg bg-slate-900 border border-slate-800" />
                <div className="h-7 w-14 rounded-lg bg-slate-900 border border-slate-800" />
              </div>
            </div>
            <div className="h-52 w-full rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-end gap-2 p-4">
              {[35, 55, 42, 70, 60, 85, 65].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-slate-800/80 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* Quick Links Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800/80 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800" />
                <div className="h-3.5 w-24 bg-slate-800 rounded" />
                <div className="h-2.5 w-32 bg-slate-800/50 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Feed */}
        <div className="lg:col-span-5 rounded-xl bg-[#0B0F19] border border-slate-800/80 overflow-hidden">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="h-4 w-32 bg-slate-800 rounded" />
            <div className="h-6 w-16 rounded-md bg-slate-900 border border-slate-800" />
          </div>
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 bg-slate-800 rounded" />
                    <div className="h-2.5 w-40 bg-slate-800/60 rounded" />
                  </div>
                </div>
                <div className="h-4 w-14 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 2. PAYMENT GATEWAY SKELETON (Matches 3-Step Compact List Layout)
// ==============================================================
export const PaymentGatewaySkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-pulse select-none">
      {/* 3-Step Progress Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 w-16 bg-slate-800/60 rounded" />
              <div className="h-3.5 w-32 bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Step Content Card (Compact List Rows) */}
      <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="space-y-1.5">
            <div className="h-4 w-48 bg-slate-800 rounded" />
            <div className="h-2.5 w-72 bg-slate-800/60 rounded" />
          </div>
          <div className="h-8 w-28 rounded-lg bg-slate-900 border border-slate-800" />
        </div>

        <div className="space-y-2.5">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex-shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 bg-slate-800 rounded" />
                  <div className="h-2.5 w-52 bg-slate-800/60 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-24 rounded-lg bg-slate-800" />
                <div className="h-8 w-20 rounded-lg bg-slate-900 border border-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 3. DONATION ALERTS SKELETON (Matches 2-Column Studio Layout)
// ==============================================================
export const DonationAlertsSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[540px] animate-pulse select-none">
      {/* Main Preview & Controls */}
      <div className="flex-1 rounded-xl bg-[#0B0F19] border border-slate-800/80 p-4 flex flex-col justify-between gap-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="h-4 w-36 bg-slate-800 rounded" />
          <div className="h-7 w-24 bg-slate-900 border border-slate-800 rounded-lg" />
        </div>
        <div className="flex-1 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-center p-6 min-h-[320px]">
          <div className="w-full max-w-sm p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-14 h-14 rounded-xl bg-slate-800 mx-auto" />
            <div className="h-4 w-44 bg-slate-800 rounded mx-auto" />
            <div className="h-3 w-56 bg-slate-800/60 rounded mx-auto" />
          </div>
        </div>
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <div className="h-9 flex-1 rounded-lg bg-slate-900 border border-slate-800" />
          <div className="h-9 w-28 rounded-lg bg-slate-800" />
          <div className="h-9 w-28 rounded-lg bg-slate-800" />
        </div>
      </div>

      {/* Rightbar Settings */}
      <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0 rounded-xl bg-[#0B0F19] border border-slate-800/80 p-4 space-y-4">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-900 border border-slate-800" />
          ))}
        </div>
        <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-slate-900 border border-slate-800" />
          ))}
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 4. MEDIA LIBRARY SKELETON
// ==============================================================
export const MediaLibrarySkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse select-none">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0B0F19] border border-slate-800/80 p-3.5 rounded-xl">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 bg-slate-900 border border-slate-800 rounded-lg" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-48 bg-slate-950 border border-slate-800 rounded-lg" />
          <div className="h-8 w-28 bg-slate-800 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <div key={i} className="rounded-xl bg-[#0B0F19] border border-slate-800/80 p-2.5 space-y-2">
            <div className="w-full aspect-square rounded-lg bg-slate-900" />
            <div className="h-3 w-3/4 bg-slate-800 rounded" />
            <div className="h-2.5 w-1/2 bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================
// 5. VIDEO ALERTS SKELETON (Matches 2-Column Workspace + Rightbar)
// ==============================================================
export const VideoAlertsSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 w-full h-full overflow-hidden animate-pulse select-none">
      {/* Left Main Video Share Preview + Bottom OBS Dock */}
      <div className="flex-1 min-w-0 bg-[#0B0F19] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden min-h-[480px]">
        <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded bg-slate-800" />
            <div className="h-3.5 w-36 bg-slate-800 rounded" />
            <div className="h-4 w-20 bg-slate-900 border border-slate-800 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-20 bg-slate-900 border border-slate-800 rounded-lg" />
            <div className="h-6 w-28 bg-slate-900 border border-slate-800 rounded-lg" />
          </div>
        </div>

        <div className="flex-1 bg-[#070A12] p-6 flex items-center justify-center">
          <div className="w-full max-w-xl aspect-video rounded-xl bg-slate-900/70 border border-slate-800" />
        </div>

        <div className="p-3.5 border-t border-slate-800/80 bg-[#090D16] flex items-center justify-between gap-2.5">
          <div className="h-8 flex-1 rounded-lg bg-slate-950 border border-slate-800" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-28 rounded-lg bg-slate-800" />
            <div className="h-8 w-32 rounded-lg bg-slate-900 border border-slate-800" />
            <div className="h-8 w-20 rounded-lg bg-slate-900 border border-slate-800" />
          </div>
        </div>
      </div>

      {/* Rightbar Video Share Config Skeleton */}
      <div className="hidden lg:flex w-[360px] xl:w-[400px] shrink-0 bg-[#0B0F19] border border-slate-800/80 rounded-xl flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] space-y-1.5">
          <div className="h-3.5 w-40 bg-slate-800 rounded" />
          <div className="h-2.5 w-52 bg-slate-800/60 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-1 p-2 bg-[#090D16] border-b border-slate-800/80">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 rounded-lg bg-slate-900 border border-slate-800" />
          ))}
        </div>
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 w-full rounded-xl bg-[#090D16] border border-slate-800" />
          ))}
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 6. LEADERBOARD SKELETON (Matches New 2-Column Big Preview + Bottom Bar + Rightbar)
// ==============================================================
export const LeaderboardSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[540px] w-full h-full animate-pulse select-none">
      {/* Left Main Column: Scaled Big Preview Canvas + Bottom OBS Source & Test Controls */}
      <div className="flex-1 bg-[#0B0F19] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden min-h-[460px]">
        {/* Top Preview Bar */}
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-32 bg-slate-800 rounded" />
            <div className="h-5 w-20 bg-slate-900 border border-slate-800 rounded" />
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 w-16 bg-slate-900 border border-slate-800 rounded-md" />
            ))}
          </div>
        </div>

        {/* Center Scaled Preview Canvas */}
        <div className="flex-1 bg-[#060911] flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl bg-[#0B0F19] border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="h-4 w-32 bg-slate-800 rounded" />
              <div className="h-4 w-14 bg-slate-800 rounded" />
            </div>
            {/* #1 Bigger Hero Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-20 bg-slate-800/80 rounded" />
                  <div className="h-4 w-36 bg-slate-700 rounded" />
                </div>
              </div>
              <div className="h-5 w-16 bg-slate-700 rounded" />
            </div>
            {/* #2 and #3 Compact Cards */}
            {[2, 3].map((r) => (
              <div
                key={r}
                className="px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-slate-800" />
                  <div className="h-3 w-28 bg-slate-800 rounded" />
                </div>
                <div className="h-3.5 w-14 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Dock: Dedicated Rank URLs + Copy OBS URL + Test Overtake + Popup */}
        <div className="p-3.5 border-t border-slate-800/80 bg-[#090D16] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-16 rounded-lg bg-slate-900 border border-slate-800" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-28 rounded-lg bg-slate-800" />
            <div className="h-8 w-28 rounded-lg bg-slate-900 border border-slate-800" />
            <div className="h-8 w-20 rounded-lg bg-slate-900 border border-slate-800" />
          </div>
        </div>
      </div>

      {/* Rightbar Config Settings */}
      <div className="w-full lg:w-[360px] xl:w-[390px] shrink-0 bg-[#0B0F19] border border-slate-800/80 rounded-xl flex flex-col justify-between overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="h-4 w-36 bg-slate-800 rounded" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-slate-900 border border-slate-800" />
            ))}
          </div>
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <div className="h-9 w-full rounded-lg bg-slate-900 border border-slate-800" />
            <div className="h-9 w-full rounded-lg bg-slate-900 border border-slate-800" />
            <div className="h-9 w-full rounded-lg bg-slate-900 border border-slate-800" />
          </div>
        </div>
        <div className="p-3.5 border-t border-slate-800/80 flex gap-2">
          <div className="h-9 w-20 rounded-lg bg-slate-900 border border-slate-800" />
          <div className="h-9 flex-1 rounded-lg bg-slate-800" />
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
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-140px)] bg-[#0B0F19] border border-slate-800/80 rounded-2xl overflow-hidden animate-pulse select-none">
      {/* Main Soundboard Deck Skeleton */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#090D16] relative overflow-hidden">
        {/* Top Toolbar */}
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-800/80 bg-[#0B0F19] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 bg-slate-800 rounded" />
              <div className="h-2.5 w-48 bg-slate-800/60 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-slate-900 border border-slate-800 rounded-lg" />
            <div className="h-8 w-28 bg-slate-800 rounded-lg" />
          </div>
        </div>

        {/* Sound Pad Grid */}
        <div className="flex-1 p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 content-start">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-28 bg-slate-800 rounded" />
                    <div className="h-2.5 w-16 bg-slate-900 rounded" />
                  </div>
                </div>
                <div className="w-12 h-5 rounded-md bg-slate-900 border border-slate-800" />
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-7 w-20 bg-slate-900 border border-slate-800 rounded-lg" />
                <div className="flex gap-1.5">
                  <div className="w-7 h-7 bg-slate-900 border border-slate-800 rounded-lg" />
                  <div className="w-7 h-7 bg-slate-900 border border-slate-800 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom OBS Dock */}
        <div className="shrink-0 px-5 py-3 border-t border-slate-800/80 bg-[#0B0F19] flex items-center justify-between gap-3">
          <div className="h-3 w-40 bg-slate-800 rounded" />
          <div className="h-8 w-56 bg-slate-900 border border-slate-800 rounded-lg" />
        </div>
      </div>

      {/* Rightbar Skeleton */}
      <div className="w-full lg:w-[390px] xl:w-[430px] shrink-0 bg-[#0B0F19] border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 bg-slate-800 rounded" />
            <div className="h-2.5 w-44 bg-slate-800/60 rounded" />
          </div>
          <div className="h-6 w-14 bg-slate-900 border border-slate-800 rounded" />
        </div>
        <div className="p-4 space-y-4">
          <div className="h-9 w-full bg-slate-900 border border-slate-800 rounded-lg" />
          <div className="h-24 w-full bg-slate-900/60 border border-slate-800 rounded-xl" />
          <div className="h-28 w-full bg-slate-900/60 border border-slate-800 rounded-xl" />
          <div className="h-20 w-full bg-slate-900/60 border border-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 8. GOAL WIDGET SKELETON (Clean Simple Studio Skeleton)
// ==============================================================
export const GoalSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse select-none">
      {/* Live Preview Box */}
      <div className="w-full rounded-xl bg-[#0B0F19] border border-slate-800/80 p-6 flex flex-col items-center justify-center min-h-[180px]">
        <div className="w-full max-w-lg p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-36 bg-slate-800 rounded" />
            <div className="h-3.5 w-20 bg-slate-800 rounded" />
          </div>
          <div className="w-full h-7 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden p-1">
            <div className="h-full w-2/3 bg-slate-800 rounded" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="h-5 w-36 bg-slate-800 rounded" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 rounded-lg bg-[#0B0F19] border border-slate-800" />
          <div className="h-8 w-28 rounded-lg bg-slate-800" />
        </div>
      </div>

      {/* Goal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800/80 space-y-3">
            <div className="w-full h-12 rounded-lg bg-slate-900 border border-slate-800" />
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div className="h-3.5 w-24 bg-slate-800 rounded" />
              <div className="flex gap-2">
                <div className="h-7 w-16 rounded-md bg-slate-900 border border-slate-800" />
                <div className="h-7 w-16 rounded-md bg-slate-900 border border-slate-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================
// 9. TIMER SKELETON
// ==============================================================
export const TimerSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse select-none">
      <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-4 w-44 bg-slate-800 rounded" />
          <div className="h-2.5 w-64 bg-slate-800/60 rounded" />
        </div>
        <div className="h-8 w-28 bg-slate-800 rounded-lg" />
      </div>

      <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 p-8 text-center space-y-5">
        <div className="h-16 w-72 bg-slate-900 border border-slate-800 rounded-xl mx-auto" />
        <div className="flex justify-center gap-2.5">
          <div className="h-9 w-24 bg-slate-800 rounded-lg" />
          <div className="h-9 w-24 bg-slate-900 border border-slate-800 rounded-lg" />
          <div className="h-9 w-24 bg-slate-900 border border-slate-800 rounded-lg" />
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
    <div className="space-y-4 animate-pulse select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex items-center justify-center p-8 min-h-[380px]">
          <div className="w-60 h-60 rounded-full border-4 border-slate-800 bg-slate-900" />
        </div>
        <div className="lg:col-span-5 rounded-xl bg-[#0B0F19] border border-slate-800/80 p-4 space-y-3">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-full rounded-lg bg-slate-900 border border-slate-800" />
          ))}
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 11. POKEMON / LIVE CHAT / CUSTOM OVERLAY / SUBSCRIBERS SKELETONS
// ==============================================================
export const PokemonSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse select-none">
      <div className="w-full h-64 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex items-center justify-center">
        <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-[#0B0F19] border border-slate-800/80" />
        ))}
      </div>
    </div>
  );
};

export const LiveChatSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[540px] w-full h-full animate-pulse select-none">
      <div className="flex-1 bg-[#0B0F19] border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="h-4 w-36 bg-slate-800 rounded" />
          <div className="h-7 w-24 bg-slate-900 border border-slate-800 rounded-lg" />
        </div>
        <div className="flex-1 rounded-lg bg-slate-950 border border-slate-800/80 p-4 space-y-2.5 flex flex-col justify-end min-h-[300px]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 w-3/4 space-y-1.5">
              <div className="h-2.5 w-20 bg-slate-800 rounded" />
              <div className="h-3 w-48 bg-slate-800/70 rounded" />
            </div>
          ))}
        </div>
        <div className="h-10 w-full rounded-lg bg-slate-900 border border-slate-800" />
      </div>
      <div className="w-full lg:w-[350px] xl:w-[380px] shrink-0 bg-[#0B0F19] border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-full rounded-lg bg-slate-900 border border-slate-800" />
        ))}
      </div>
    </div>
  );
};

export const SubscribersSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse select-none">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800/80 space-y-2">
            <div className="h-3 w-24 bg-slate-800/60 rounded" />
            <div className="h-6 w-20 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 p-4 space-y-3">
        <div className="h-9 w-full rounded-lg bg-slate-950 border border-slate-800" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 w-full rounded-lg bg-slate-900/60 border border-slate-800/70" />
        ))}
      </div>
    </div>
  );
};

export const CloneTtsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse select-none">
      <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-44 bg-slate-800 rounded" />
          <div className="h-2.5 w-64 bg-slate-800/60 rounded" />
        </div>
        <div className="h-8 w-28 bg-slate-800 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-[#0B0F19] border border-slate-800/80 space-y-3">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          <div className="h-32 w-full rounded-lg bg-slate-900 border border-slate-800" />
          <div className="h-9 w-full rounded-lg bg-slate-800" />
        </div>
        <div className="p-5 rounded-xl bg-[#0B0F19] border border-slate-800/80 space-y-3">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 w-full rounded-lg bg-slate-900 border border-slate-800" />
          ))}
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 12. DONATION LEDGER SKELETON
// ==============================================================
export const DonationLedgerSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse select-none">
      <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex items-center justify-between gap-3">
        <div className="h-9 flex-1 max-w-sm rounded-lg bg-slate-950 border border-slate-800" />
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-lg bg-slate-900 border border-slate-800" />
          <div className="h-9 w-28 rounded-lg bg-slate-900 border border-slate-800" />
        </div>
      </div>

      <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 divide-y divide-slate-800/60 p-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="py-3 px-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 bg-slate-800 rounded" />
                <div className="h-2.5 w-44 bg-slate-800/60 rounded" />
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
    <div className="space-y-4 animate-pulse select-none">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl bg-[#0B0F19] border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-xl bg-slate-800" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-slate-800 rounded" />
              <div className="h-3 w-48 bg-slate-800/60 rounded" />
            </div>
          </div>
          <div className="space-y-2.5 pt-2">
            <div className="h-9 rounded-lg bg-slate-950 border border-slate-800" />
            <div className="h-9 rounded-lg bg-slate-950 border border-slate-800" />
            <div className="h-20 rounded-lg bg-slate-950 border border-slate-800" />
          </div>
        </div>

        <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 p-5 space-y-3">
          <div className="w-full aspect-square rounded-lg bg-slate-900 border border-slate-800" />
          <div className="h-9 w-full bg-slate-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 14. BROADCAST STREAM SKELETON
// ==============================================================
export const BroadcastSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 w-full h-full overflow-hidden animate-pulse select-none">
      {/* Left Main Concurrent View Count Area */}
      <div className="flex-1 min-w-0 bg-[#0B0F19] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden min-h-[480px]">
        <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded bg-slate-800" />
            <div className="h-3.5 w-36 bg-slate-800 rounded" />
            <div className="h-4 w-24 bg-slate-900 border border-slate-800 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-36 bg-slate-900 border border-slate-800 rounded-lg" />
            <div className="h-7 w-20 bg-slate-900 border border-slate-800 rounded-lg" />
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5">
          <div className="flex-1 min-h-[220px] rounded-xl bg-[#070A12] border border-slate-800/80 p-5 flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="h-3 w-32 bg-slate-800 rounded" />
              <div className="h-3 w-24 bg-slate-800 rounded" />
            </div>
            <div className="my-auto flex justify-center">
              <div className="h-12 w-36 rounded-xl bg-slate-900 border border-slate-800" />
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-800/60">
              <div className="h-3 w-64 bg-slate-800/70 rounded" />
              <div className="h-3 w-24 bg-slate-800/70 rounded" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-4 w-48 bg-slate-800 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-slate-800 rounded" />
                      <div className="h-2.5 w-28 bg-slate-800/60 rounded" />
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3.5 border-t border-slate-800/80 bg-[#090D16] flex items-center justify-between gap-2.5">
          <div className="h-8 flex-1 rounded-lg bg-slate-950 border border-slate-800" />
          <div className="h-8 w-28 rounded-lg bg-slate-800" />
        </div>
      </div>

      {/* Rightbar Broadcast Channels Skeleton */}
      <div className="hidden lg:flex w-[360px] xl:w-[390px] shrink-0 bg-[#0B0F19] border border-slate-800/80 rounded-xl flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] space-y-1.5">
          <div className="h-3.5 w-36 bg-slate-800 rounded" />
          <div className="h-2.5 w-52 bg-slate-800/60 rounded" />
        </div>
        <div className="flex-1 p-3.5 space-y-2.5 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl bg-[#090D16] border border-slate-800 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800" />
                  <div className="space-y-1">
                    <div className="h-3 w-20 bg-slate-800 rounded" />
                    <div className="h-2.5 w-28 bg-slate-800/60 rounded" />
                  </div>
                </div>
                <div className="h-4 w-16 rounded bg-slate-900 border border-slate-800" />
              </div>
              <div className="h-7 w-full rounded-lg bg-slate-950 border border-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 15. SMART FEATURE TAB SKELETON DISPATCHER
// ==============================================================
export const FeatureTabSkeleton: React.FC<{ tab: DashboardTab | string }> = ({ tab }) => {
  switch (tab) {
    case 'payments':
    case 'telegram':
      return <PaymentGatewaySkeleton />;
    case 'donation':
    case 'alerts':
    case 'custom-overlay':
      return <DonationAlertsSkeleton />;
    case 'media':
      return <MediaLibrarySkeleton />;
    case 'broadcast':
      return <BroadcastSkeleton />;
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
    case 'chat':
      return <LiveChatSkeleton />;
    case 'subscribers':
      return <SubscribersSkeleton />;
    case 'clone-tts':
      return <CloneTtsSkeleton />;
    case 'donations':
    case 'mailbox':
    case 'support':
    case 'admin':
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
