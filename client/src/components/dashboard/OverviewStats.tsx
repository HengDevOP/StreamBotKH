import React from 'react';
import { DollarSign, Flame, Users, TrendingUp, Sparkles } from 'lucide-react';
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

  return (
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
          <span className="text-3xl font-black tracking-tight text-white font-mono">
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
          <span className="text-3xl font-black tracking-tight text-white font-mono">
            {totalKhr.toLocaleString()} <span className="text-lg font-bold text-pink-400">៛</span>
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
          <span className="text-3xl font-black tracking-tight text-white font-mono">
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
          <span className="text-3xl font-black tracking-tight text-white font-mono">
            {totalCount}
          </span>
        </div>
        <div className="mt-2 flex items-center text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
          Active community supporters
        </div>
      </Card>
    </div>
  );
};
