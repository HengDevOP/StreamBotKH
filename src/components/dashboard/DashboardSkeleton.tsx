'use client';

import React from 'react';

export const DashboardSkeleton: React.FC = () => {
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
        {/* Table Header toolbar skeleton */}
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

        {/* Shimmering Table Rows */}
        <div className="divide-y divide-slate-800/40 p-2 sm:p-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="py-3.5 px-3 flex items-center justify-between gap-4"
            >
              {/* Donor avatar + name + message */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex-shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <div className="h-3.5 w-28 bg-slate-800 rounded" />
                  <div className="h-2.5 w-48 sm:w-64 bg-slate-800/50 rounded" />
                </div>
              </div>

              {/* Bank badge & amount */}
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
