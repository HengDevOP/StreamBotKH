'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Copy,
  Check,
  ExternalLink,
  Palette,
  CheckCircle2,
  Search,
  Save,
  Type,
  X,
  Sliders,
  Hash,
  Crown,
  Eye,
  RotateCcw
} from 'lucide-react';
import { Button } from '../common/Button';
import {
  LEADERBOARD_TEMPLATES,
  LeaderboardTemplateMeta,
  LeaderboardTemplateRenderer,
  LeaderboardDonor
} from '../overlay/leaderboardTemplates';

const LEADERBOARD_FONTS = [
  { id: 'Chakra Petch', name: 'Chakra Petch', category: 'Cyber / Futuristic' },
  { id: 'Orbitron', name: 'Orbitron', category: 'Sci-Fi Military HUD' },
  { id: 'Press Start 2P', name: 'Press Start 2P', category: 'Retro 8-Bit Pixel' },
  { id: 'VT323', name: 'VT323', category: 'Monospace Terminal' },
  { id: 'Bebas Neue', name: 'Bebas Neue', category: 'Bold Impact Esports' },
  { id: 'Kanit', name: 'Kanit', category: 'High-Energy Modern' },
  { id: 'Montserrat', name: 'Montserrat', category: 'Clean Geometric' },
  { id: 'Inter', name: 'Inter', category: 'Neutral Swiss Minimal' },
  { id: 'Permanent Marker', name: 'Permanent Marker', category: 'Urban Streetwear' },
  { id: 'Koulen', name: 'Koulen', category: 'Khmer Bold Display' },
  { id: 'Battambang', name: 'Battambang', category: 'Khmer Clean Modern' },
  { id: 'Moul', name: 'Moul', category: 'Khmer Royal Traditional' },
  { id: 'Bayon', name: 'Bayon', category: 'Khmer Stylized' }
];

const MODAL_CATEGORIES = ['All', 'Cyber', 'Gaming', 'Retro', 'Aesthetic', 'Minimal', 'Special'] as const;

interface LeaderboardWidgetManagerProps {
  streamerToken?: string;
  recentDonations?: any[];
}

export const LeaderboardWidgetManager: React.FC<LeaderboardWidgetManagerProps> = ({
  streamerToken,
  recentDonations = []
}) => {
  const effectiveToken = streamerToken || 'demo-token';

  // Saved active settings baseline
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [savedConfig, setSavedConfig] = useState({
    title: 'TOP SUPPORTERS',
    period: 'all' as 'all' | 'month' | 'week' | 'today',
    maxRows: 3,
    templateStyle: 'cyber-neon',
    accentColor: '#F59E0B',
    showBackground: true,
    showAnimation: true,
    showRankBadges: true,
    fontFamily: 'Chakra Petch'
  });

  const [title, setTitle] = useState<string>('TOP SUPPORTERS');
  const [period, setPeriod] = useState<'all' | 'month' | 'week' | 'today'>('all');
  const [maxRows, setMaxRows] = useState<number>(3); // 1 to 10, default 3
  const [templateStyle, setTemplateStyle] = useState<string>('cyber-neon');
  const [accentColor, setAccentColor] = useState<string>('#F59E0B');
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [showAnimation, setShowAnimation] = useState<boolean>(true);
  const [showRankBadges, setShowRankBadges] = useState<boolean>(true);
  const [fontFamily, setFontFamily] = useState<string>('Chakra Petch');

  // Modal State for 40 Styles Browser
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>('All');

  // UI state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Unsaved changes tracking
  const hasUnsavedChanges =
    title !== savedConfig.title ||
    period !== savedConfig.period ||
    maxRows !== savedConfig.maxRows ||
    templateStyle !== savedConfig.templateStyle ||
    accentColor !== savedConfig.accentColor ||
    showBackground !== savedConfig.showBackground ||
    showAnimation !== savedConfig.showAnimation ||
    showRankBadges !== savedConfig.showRankBadges ||
    fontFamily !== savedConfig.fontFamily;

  const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/overlay/leaderboard/${effectiveToken}`;

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
          const cfg = {
            title: lb.title || 'TOP SUPPORTERS',
            period: (lb.period as any) || 'all',
            maxRows: Number(lb.maxRows) || 3,
            templateStyle: lb.templateStyle || 'cyber-neon',
            accentColor: lb.accentColor || '#F59E0B',
            showBackground: lb.showBackground !== false,
            showAnimation: lb.showAnimation !== false,
            showRankBadges: lb.showRankBadges !== false,
            fontFamily: lb.fontFamily || 'Chakra Petch'
          };
          setSavedConfig(cfg);
          setTitle(cfg.title);
          setPeriod(cfg.period);
          setMaxRows(cfg.maxRows);
          setTemplateStyle(cfg.templateStyle);
          setAccentColor(cfg.accentColor);
          setShowBackground(cfg.showBackground);
          setShowAnimation(cfg.showAnimation);
          setShowRankBadges(cfg.showRankBadges);
          setFontFamily(cfg.fontFamily);
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
        .slice(0, 10)
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

    return defaultList.map((d, i) => ({
      rank: i + 1,
      ...d
    }));
  }, [recentDonations]);

  // Sample Donors used for rendering the 40 miniature visual templates
  const previewDonors: LeaderboardDonor[] = React.useMemo(
    () => [
      { rank: 1, name: 'Sokha Pro', amount: 50.0, bank: 'ABA Bank' },
      { rank: 2, name: 'Vannak KH', amount: 30.0, bank: 'Bakong' },
      { rank: 3, name: 'Dara Cyber', amount: 15.0, bank: 'Acleda' }
    ],
    []
  );

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
          maxRows,
          templateStyle,
          accentColor,
          showBackground,
          showAnimation,
          showRankBadges,
          fontFamily
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavedConfig({
          title,
          period,
          maxRows,
          templateStyle,
          accentColor,
          showBackground,
          showAnimation,
          showRankBadges,
          fontFamily
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Error saving leaderboard settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Reset Changes back to saved baseline
  const handleResetChanges = () => {
    setTitle(savedConfig.title);
    setPeriod(savedConfig.period);
    setMaxRows(savedConfig.maxRows);
    setTemplateStyle(savedConfig.templateStyle);
    setAccentColor(savedConfig.accentColor);
    setShowBackground(savedConfig.showBackground);
    setShowAnimation(savedConfig.showAnimation);
    setShowRankBadges(savedConfig.showRankBadges);
    setFontFamily(savedConfig.fontFamily);
  };

  // Filter templates for Modal Search & Category Filter
  const modalTemplates = LEADERBOARD_TEMPLATES.filter((t) => {
    const matchesCategory =
      modalCategoryFilter === 'All' || t.category === modalCategoryFilter;
    if (!matchesCategory) return false;
    if (!templateSearchQuery.trim()) return true;
    const q = templateSearchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

  const currentTemplate =
    LEADERBOARD_TEMPLATES.find((t) => t.id === templateStyle) || LEADERBOARD_TEMPLATES[0];

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. TOP LIVE PREVIEW SCREEN WITH OBS CONTROLS                   */}
      {/* ============================================================== */}
      <div className="w-full rounded-2xl bg-[#040711] border border-slate-800 p-6 sm:p-8 flex items-center justify-center min-h-[380px] relative overflow-hidden shadow-2xl">
        {/* Transparent Checkerboard Grid */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
          }}
        />

        {/* Top-Left OBS Action Controls (Positioned at top-left to avoid conflict with top-right navbar mailbox popover) */}
        <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 z-20 flex items-center gap-2">
          {/* Copy OBS Overlay URL */}
          <button
            type="button"
            onClick={copyObsUrl}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Copy OBS Studio Browser Source URL"
          >
            {copiedUrl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedUrl ? 'Copied' : 'Copy OBS URL'}</span>
          </button>

          {/* Open Standalone Overlay in New Tab */}
          <a
            href={obsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors flex items-center justify-center shadow-md"
            title="Open OBS Overlay in New Tab"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Real-time Rendered Leaderboard Template */}
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
            fontFamily={fontFamily}
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. LEADERBOARD EDIT & CONFIGURATION SECTION (WEB DESKTOP VIEW)  */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (lg:col-span-6): Style, Typography & Aesthetics */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2 uppercase tracking-wider">
                <Palette size={16} className="text-amber-400" />
                Display Style & Appearance
              </h4>
            </div>

            {/* Active Style Card & Browse All 40 Styles Trigger */}
            <div
              onClick={() => setIsTemplateModalOpen(true)}
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition-colors cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300">Active Theme Style</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 font-bold uppercase">
                  {currentTemplate.category}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10"
                    style={{ backgroundColor: `${currentTemplate.previewColor}25`, color: currentTemplate.previewColor }}
                  >
                    <Palette size={18} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                      {currentTemplate.name}
                    </h5>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{currentTemplate.description}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTemplateModalOpen(true);
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs flex-shrink-0 border-0 shadow-md"
                >
                  <Eye size={13} className="mr-1.5" />
                  Browse 40 Styles
                </Button>
              </div>
            </div>

            {/* Custom Typography / Font Family */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Type size={14} className="text-amber-400" />
                  <span>Typography / Font Family</span>
                </label>
                <span className="text-xs font-bold text-amber-300 font-mono" style={{ fontFamily }}>
                  {fontFamily}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {LEADERBOARD_FONTS.slice(0, 8).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontFamily(f.id)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      fontFamily === f.id
                        ? 'bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <div className="text-xs font-bold truncate" style={{ fontFamily: f.id }}>
                      {f.name}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono truncate">{f.category}</div>
                  </button>
                ))}
              </div>

              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
              >
                {LEADERBOARD_FONTS.map((f) => (
                  <option key={f.id} value={f.id} className="bg-slate-950 text-white">
                    {f.name} ({f.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Accent & Glow Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Theme Accent & Glow Color
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  '#F59E0B',
                  '#00F0FF',
                  '#EC4899',
                  '#10B981',
                  '#A855F7',
                  '#EF4444',
                  '#38BDF8',
                  '#FBBF24',
                  '#84CC16',
                  '#E0E7FF'
                ].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccentColor(c)}
                    className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer ${
                      accentColor.toUpperCase() === c.toUpperCase()
                        ? 'scale-110 border-white ring-2 ring-white/30'
                        : 'border-transparent hover:scale-105'
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
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:bg-slate-900 cursor-pointer">
                <span className="text-slate-300">Show Background Container</span>
                <input
                  type="checkbox"
                  checked={showBackground}
                  onChange={(e) => setShowBackground(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:bg-slate-900 cursor-pointer">
                <span className="text-slate-300">Show Rank Badges & Medals</span>
                <input
                  type="checkbox"
                  checked={showRankBadges}
                  onChange={(e) => setShowRankBadges(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:bg-slate-900 cursor-pointer">
                <span className="text-slate-300">Enable Live Animations (Pulsing Glow, Shimmer)</span>
                <input
                  type="checkbox"
                  checked={showAnimation}
                  onChange={(e) => setShowAnimation(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column (lg:col-span-6): Content, Rules & Actions */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2 uppercase tracking-wider">
                <Sliders size={16} className="text-amber-400" />
                Content & Ranking Rules
              </h4>
            </div>

            {/* Leaderboard Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Leaderboard Header Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="TOP SUPPORTERS"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Ranking Period */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Ranking Time Period
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                {(['all', 'month', 'week', 'today'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`py-2 rounded-lg text-[11px] font-mono font-bold capitalize transition-colors cursor-pointer ${
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

            {/* Top Donors Display Count (1 to 10) */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-200 font-bold flex items-center gap-1.5">
                  <Hash size={13} className="text-amber-400" />
                  Top Donors Display Count (1 to 10)
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono">
                  Top {maxRows}
                </span>
              </div>

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
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      maxRows === item.count
                        ? 'bg-amber-400 text-slate-950 border-amber-400 font-black shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-10 gap-1 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMaxRows(num)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
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
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. 40 UNIQUE STYLES SELECTION MODAL                            */}
      {/* ============================================================== */}
      {isTemplateModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9995] flex items-stretch md:items-center justify-center p-0 md:p-6 bg-[#080C16] md:bg-black/85 md:backdrop-blur-md overscroll-none animate-fadeIn">
            <div className="w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-3xl bg-[#0B101E] border-0 md:border md:border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-slate-100">
              {/* Pinned Modal Header */}
              <div className="p-4 sm:p-6 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-[#0B101E] flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Palette size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white font-['Chakra_Petch'] truncate">
                      Select From 40 Unique Leaderboard Displays
                    </h3>
                    <p className="text-xs text-slate-400 font-mono hidden sm:block truncate">
                      Click any style to apply. Each template features custom geometry, animated accents, and live visual rank styling.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      placeholder="Search 40 styles..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(false)}
                    aria-label="Close templates modal"
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="px-4 sm:px-6 py-2.5 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar bg-[#090D18] flex-shrink-0">
                {MODAL_CATEGORIES.map((cat) => {
                  const count =
                    cat === 'All'
                      ? LEADERBOARD_TEMPLATES.length
                      : LEADERBOARD_TEMPLATES.filter((t) => t.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setModalCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                        modalCategoryFilter === cat
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                          : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* 40 Visual Miniature Live Templates Grid */}
              <div className="p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain flex-1 min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {modalTemplates.map((tmpl) => {
                    const isSelected = templateStyle === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => {
                          setTemplateStyle(tmpl.id);
                          if (tmpl.previewColor) setAccentColor(tmpl.previewColor);
                          setIsTemplateModalOpen(false);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 relative group flex flex-col ${
                          isSelected
                            ? 'bg-amber-950/25 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50'
                            : 'bg-[#090D18] border-slate-800/90 hover:border-slate-700 hover:bg-[#0C1222]'
                        }`}
                      >
                        {/* Top Header Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: tmpl.previewColor }}
                            />
                            <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                              {tmpl.name}
                            </h4>
                            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 flex-shrink-0">
                              {tmpl.category}
                            </span>
                          </div>

                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex-shrink-0">
                              <Check size={11} className="stroke-[3]" />
                              Selected
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              Click to apply
                            </span>
                          )}
                        </div>

                        {/* Live Rendered Template Preview Box */}
                        <div className="w-full rounded-xl bg-[#030611] border border-slate-800/80 p-3 sm:p-4 flex items-center justify-center relative overflow-hidden pointer-events-none min-h-[220px]">
                          {/* Transparent Checkerboard */}
                          <div
                            className="absolute inset-0 opacity-12 pointer-events-none"
                            style={{
                              backgroundImage:
                                'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                              backgroundSize: '16px 16px',
                              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                            }}
                          />

                          <div className="w-full max-w-sm relative z-10 flex justify-center transform scale-[0.88] sm:scale-95 origin-center transition-transform group-hover:scale-100 duration-200">
                            <LeaderboardTemplateRenderer
                              templateStyle={tmpl.id}
                              title="TOP SUPPORTERS"
                              period={period}
                              topDonors={previewDonors}
                              accentColor={tmpl.previewColor}
                              showBackground={true}
                              showAnimation={true}
                              showRankBadges={true}
                              maxRows={3}
                              fontFamily={fontFamily}
                            />
                          </div>
                        </div>

                        {/* Description & Action Button Footer */}
                        <div className="flex items-center justify-between gap-3 pt-1 mt-auto">
                          <p className="text-[11px] text-slate-400 line-clamp-1">{tmpl.description}</p>
                          <button
                            type="button"
                            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                                : 'bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check size={12} className="stroke-[3]" />
                                <span>Active</span>
                              </>
                            ) : (
                              <span>Apply Style</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ============================================================== */}
      {/* 4. BOTTOM FLOATING UNSAVED CHANGES TOAST BAR                   */}
      {/* ============================================================== */}
      <div
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl transition-all duration-300 ease-in-out ${
          hasUnsavedChanges
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div className="rounded-2xl px-5 py-3.5 bg-[#0B101E]/95 backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="truncate">
            <span className="text-xs font-mono font-bold text-slate-100 truncate block">
              Careful — you have unsaved changes!
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleResetChanges}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer disabled:opacity-50"
            >
              Reset
            </button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              loading={isSaving}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs px-4 border-0"
            >
              {saveSuccess ? (
                <span className="flex items-center gap-1.5 font-black text-slate-950">
                  <CheckCircle2 size={13} />
                  <span>Saved!</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Save size={13} className="text-slate-950" />
                  <span>Save Changes</span>
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
