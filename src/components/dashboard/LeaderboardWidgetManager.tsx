'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Copy,
  Check,
  ExternalLink,
  Crown,
  Medal,
  Flame,
  Sparkles,
  Sliders,
  Monitor,
  Palette,
  CheckCircle2,
  RefreshCw,
  Hash,
  Eye,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import {
  LEADERBOARD_TEMPLATES,
  LeaderboardTemplateMeta,
  LeaderboardTemplateRenderer,
  LeaderboardDonor
} from '../overlay/leaderboardTemplates';

interface LeaderboardWidgetManagerProps {
  streamerToken?: string;
  recentDonations?: any[];
}

export const LeaderboardWidgetManager: React.FC<LeaderboardWidgetManagerProps> = ({
  streamerToken,
  recentDonations = []
}) => {
  const effectiveToken = streamerToken || 'demo-token';

  // Core settings state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [title, setTitle] = useState<string>('TOP SUPPORTERS');
  const [period, setPeriod] = useState<'all' | 'month' | 'week' | 'today'>('all');
  const [maxRows, setMaxRows] = useState<number>(3); // User requirement: 1 to 10, default 3
  const [templateStyle, setTemplateStyle] = useState<string>('cyber-neon');
  const [accentColor, setAccentColor] = useState<string>('#F59E0B');
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [showAnimation, setShowAnimation] = useState<boolean>(true);
  const [showRankBadges, setShowRankBadges] = useState<boolean>(true);

  // UI helpers
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/widget/leaderboard/${effectiveToken}`;

  const copyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // 1. Fetch saved leaderboard settings from API
  useEffect(() => {
    fetch(`/api/widgets/leaderboard?token=${effectiveToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.leaderboard) {
          const lb = data.leaderboard;
          if (lb.title) setTitle(lb.title);
          if (lb.period) setPeriod(lb.period);
          if (lb.maxRows !== undefined) setMaxRows(Number(lb.maxRows) || 3);
          if (lb.templateStyle) setTemplateStyle(lb.templateStyle);
          if (lb.accentColor) setAccentColor(lb.accentColor);
          if (lb.showBackground !== undefined) setShowBackground(Boolean(lb.showBackground));
          if (lb.showAnimation !== undefined) setShowAnimation(Boolean(lb.showAnimation));
          if (lb.showRankBadges !== undefined) setShowRankBadges(Boolean(lb.showRankBadges));
        }
      })
      .catch((e) => console.error('Error fetching leaderboard settings:', e));
  }, [effectiveToken]);

  // 2. Build aggregated top donors from actual donations or demo data
  const topDonors: LeaderboardDonor[] = React.useMemo(() => {
    if (recentDonations && recentDonations.length > 0) {
      const map: Record<string, { name: string; amount: number; count: number; bank: string }> = {};
      recentDonations.forEach((d) => {
        const name = d.donor_name || 'Anonymous';
        if (!map[name]) {
          map[name] = { name, amount: 0, count: 0, bank: d.banking_name || 'Bakong KHQR' };
        }
        const amt = Number(d.amount) || 0;
        const inUsd = d.currency === 'KHR' ? amt / 4000 : amt;
        map[name].amount += inUsd;
        map[name].count += 1;
      });
      return Object.values(map)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, maxRows)
        .map((item, idx) => ({
          rank: idx + 1,
          name: item.name,
          amount: Math.round(item.amount * 100) / 100,
          count: item.count,
          bank: item.bank
        }));
    }

    // Default demo leaderboard with full 10 donors available
    const defaultList = [
      { name: 'Sokha Gaming Pro', amount: 85.0, count: 4, bank: 'ABA Bank' },
      { name: 'Vannak KH', amount: 50.0, count: 2, bank: 'Bakong App' },
      { name: 'Dara Cyber', amount: 32.5, count: 3, bank: 'Acleda' },
      { name: 'PhnomPenh_Ace', amount: 20.0, count: 1, bank: 'ABA Bank' },
      { name: 'NeonSamurai', amount: 15.0, count: 1, bank: 'Bakong App' },
      { name: 'KompongGamer', amount: 12.0, count: 2, bank: 'Wing Bank' },
      { name: 'PixelQueen', amount: 10.0, count: 1, bank: 'ABA Bank' },
      { name: 'KhmerWarrior', amount: 8.5, count: 1, bank: 'Bakong App' },
      { name: 'CyberSamurai', amount: 5.0, count: 1, bank: 'ABA Bank' },
      { name: 'SiemReapFan', amount: 3.0, count: 1, bank: 'Acleda' }
    ];

    return defaultList.slice(0, maxRows).map((d, i) => ({
      rank: i + 1,
      ...d
    }));
  }, [recentDonations, maxRows]);

  // 3. Save Settings to Database & Broadcast over Socket
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/widgets/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken,
          title,
          period,
          maxRows, // 1 to 10
          templateStyle,
          accentColor,
          showBackground,
          showAnimation,
          showRankBadges
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Error saving leaderboard settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter templates by category
  const categories = ['All', 'Cyber', 'Gaming', 'Retro', 'Aesthetic', 'Minimal', 'Special'];
  const filteredTemplates = categoryFilter === 'All'
    ? LEADERBOARD_TEMPLATES
    : LEADERBOARD_TEMPLATES.filter((t) => t.category === categoryFilter);

  const selectedTemplateMeta = LEADERBOARD_TEMPLATES.find((t) => t.id === templateStyle) || LEADERBOARD_TEMPLATES[0];

  return (
    <div className="space-y-6">
      {/* OBS Browser Source URL Card */}
      <Card className="p-5 sm:p-6 bg-[#090D18] border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                Top Donors Leaderboard OBS Widget
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Embed a live, automatically updated top supporters leaderboard directly into OBS Studio. Supports 20 custom styles and 1 to 10 donors.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyObsUrl}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(251,191,36,0.25)]"
            >
              {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedUrl ? 'Copied URL!' : 'Copy Leaderboard URL'}</span>
            </button>
            <a
              href={obsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Open Live Leaderboard Overlay"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        </div>

        <input
          type="text"
          readOnly
          value={obsUrl}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs select-all focus:outline-none"
        />
      </Card>

      {/* Main Settings & Live Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================== */}
        {/* LEFT COLUMN: SETTINGS PANEL                                   */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-5 bg-[#090D18] border border-slate-800 space-y-5">
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2 uppercase tracking-wider">
                <Sliders size={16} className="text-amber-400" />
                Leaderboard Configuration
              </h4>
              {saveSuccess && (
                <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 animate-fadeIn">
                  <CheckCircle2 size={13} />
                  <span>Saved!</span>
                </span>
              )}
            </div>

            {/* Setting 1: Top Donors Display Count (1 to 10, Default 3) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <Hash size={14} className="text-amber-400" />
                  <span className="text-slate-200 font-bold uppercase tracking-wider">Top Donors Count (1 to 10)</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Top {maxRows}
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Choose how many top supporters to display on your stream leaderboard (1 to 10 donors, default is 3).
              </p>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                {[
                  { count: 3, label: 'Top 3 (Default)' },
                  { count: 5, label: 'Top 5' },
                  { count: 10, label: 'Top 10' }
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setMaxRows(item.count)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                      maxRows === item.count
                        ? 'bg-amber-400 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-400/20'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Exact Stepper: 1 through 10 */}
              <div className="grid grid-cols-10 gap-1 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMaxRows(num)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      maxRows === num
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Widget Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-300 block">Leaderboard Header Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="TOP SUPPORTERS"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Timeframe */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-300 block">Ranking Time Period</label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                {(['all', 'month', 'week', 'today'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`py-2 rounded-lg text-[11px] font-mono font-bold capitalize transition-colors ${
                      period === p
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Accent Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-300 block">Theme Accent Color</label>
              <div className="flex items-center gap-2">
                {['#F59E0B', '#00F0FF', '#EC4899', '#10B981', '#A855F7', '#EF4444', '#38BDF8'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccentColor(c)}
                    className={`w-7 h-7 rounded-lg border-2 transition-transform ${
                      accentColor === c ? 'scale-110 border-white ring-2 ring-white/30' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono text-center ml-auto focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Display Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs font-mono">
              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-950 cursor-pointer">
                <span className="text-slate-300">Show Background Container</span>
                <input
                  type="checkbox"
                  checked={showBackground}
                  onChange={(e) => setShowBackground(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-950 cursor-pointer">
                <span className="text-slate-300">Show Rank Badges & Medals</span>
                <input
                  type="checkbox"
                  checked={showRankBadges}
                  onChange={(e) => setShowRankBadges(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 w-4 h-4"
                />
              </label>
            </div>

            {/* Save Button */}
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveSettings}
              loading={isSaving}
              className="w-full font-bold justify-center shadow-lg shadow-amber-400/20"
            >
              {saveSuccess ? 'Saved to OBS Live Overlay!' : 'Save & Update OBS Overlay'}
            </Button>
          </Card>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: 20 UNIQUE TEMPLATES & LIVE PREVIEW               */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Preview Screen */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Monitor size={14} className="text-amber-400" />
                Live OBS Overlay Preview ({selectedTemplateMeta.name} • Top {maxRows})
              </span>
              <span className="text-slate-500 text-[11px]">Exact OBS appearance</span>
            </div>

            <div className="w-full rounded-2xl bg-[#040711] border border-slate-800 p-6 flex items-center justify-center min-h-[380px] relative overflow-hidden">
              {/* Checkerboard transparency grid */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)`,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
              />

              {/* Real-time Rendered Template */}
              <div className="relative z-10 w-full flex justify-center">
                <LeaderboardTemplateRenderer
                  templateStyle={templateStyle}
                  title={title}
                  period={period}
                  topDonors={topDonors}
                  accentColor={accentColor}
                  showBackground={showBackground}
                  showAnimation={showAnimation}
                  showRankBadges={showRankBadges}
                  maxRows={maxRows}
                />
              </div>
            </div>
          </div>

          {/* 20 Unique Templates Gallery */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Palette size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                  Select From 20 Unique Template Styles
                </h4>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {LEADERBOARD_TEMPLATES.length} Styles Available
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors ${
                    categoryFilter === cat
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid of 20 Templates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {filteredTemplates.map((tmpl) => {
                const isSelected = templateStyle === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      setTemplateStyle(tmpl.id);
                      if (tmpl.previewColor) setAccentColor(tmpl.previewColor);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tmpl.previewColor }}
                        />
                        <h5 className="text-xs font-bold text-white leading-tight">
                          {tmpl.name}
                        </h5>
                      </div>
                      {isSelected ? (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          {tmpl.category}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
