'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Trophy,
  Copy,
  Check,
  Save,
  RotateCcw,
  ExternalLink,
  Crown,
  Search,
  Type,
  Sliders,
  Palette,
  LayoutGrid,
  Flame,
  X,
  PanelRight,
  ZoomIn
} from 'lucide-react';
import {
  LEADERBOARD_TEMPLATES,
  LeaderboardTemplateRenderer,
  LeaderboardDonor
} from '../overlay/leaderboardTemplates';
import { ALL_CLIENT_FONTS, ClientFontOption } from '../../data/leaderboardFonts';
import { LeaderboardSkeleton } from './DashboardSkeleton';
import { useSocket } from '../../context/SocketContext';

interface LeaderboardWidgetManagerProps {
  streamerToken?: string;
  overlayToken?: string;
  streamerId?: string;
  recentDonations?: any[];
  isRightbarOpen?: boolean;
  onToggleRightbar?: () => void;
  onCloseRightbar?: () => void;
}

type RightbarSection = 'templates' | 'fonts' | 'settings';
type RankSourceOption = 'all' | '1' | '2' | '3';

export const LeaderboardWidgetManager: React.FC<LeaderboardWidgetManagerProps> = ({
  streamerToken,
  overlayToken: overlayTokenProp,
  isRightbarOpen = true,
  onToggleRightbar,
  onCloseRightbar
}) => {
  const overlayToken = streamerToken || overlayTokenProp || 'demo-token';
  const { socket } = useSocket();

  // Strictly await backend data before displaying
  const [isLoading, setIsLoading] = useState(true);

  const [title, setTitle] = useState('TOP SUPPORTERS');
  const [period, setPeriod] = useState<'all' | 'month' | 'week' | 'today'>('all');
  const [maxRows, setMaxRows] = useState<number>(3);
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [templateStyle, setTemplateStyle] = useState('champion-spotlight');
  const [showBackground, setShowBackground] = useState(true);
  const [showAnimation, setShowAnimation] = useState(true);
  const [showRankBadges, setShowRankBadges] = useState(true);
  const [fontFamily, setFontFamily] = useState('Chakra Petch');
  const [rankFonts, setRankFonts] = useState<Record<string, string>>({});
  const [fontTarget, setFontTarget] = useState<RankSourceOption>('all');
  const [nameAmountGap, setNameAmountGap] = useState<number>(10);

  // UI state
  const [activeSection, setActiveSection] = useState<RightbarSection>('templates');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [templateSearch, setTemplateSearch] = useState('');
  const [fontCategory, setFontCategory] = useState<'All' | ClientFontOption['category']>('All');
  const [fontSearch, setFontSearch] = useState('');

  // Preview & Dedicated Rank Source URL state
  const [selectedSourceRank, setSelectedSourceRank] = useState<RankSourceOption>('all');
  const [removeRankCardBg, setRemoveRankCardBg] = useState<boolean>(false);
  const [previewScale, setPreviewScale] = useState<number>(1.25);

  const [topDonors, setTopDonors] = useState<LeaderboardDonor[]>([]);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [overtakingDonorName, setOvertakingDonorName] = useState<string | null>(null);
  const [savedConfig, setSavedConfig] = useState({
    title: 'TOP SUPPORTERS',
    period: 'all' as 'all' | 'month' | 'today',
    maxRows: 3,
    accentColor: '#F59E0B',
    templateStyle: 'champion-spotlight',
    showBackground: true,
    showAnimation: true,
    showRankBadges: true,
    fontFamily: 'Chakra Petch',
    rankFonts: '{}',
    nameAmountGap: 10,
    removeRankCardBg: false
  });
  const [isEarthquake, setIsEarthquake] = useState(false);

  const overtakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const baseObsUrl = `${origin}/overlay/leaderboard/${overlayToken}`;

  const getEffectiveRankFont = (rankOpt: RankSourceOption): string => {
    if (rankOpt === 'all') return fontFamily;
    return rankFonts[rankOpt] || fontFamily;
  };

  const getRankObsUrl = (rankOpt: RankSourceOption): string => {
    if (rankOpt === 'all') return baseObsUrl;
    const params = new URLSearchParams();
    params.set('rank', rankOpt);
    if (removeRankCardBg) params.set('bg', '0');
    const customRankFont = rankFonts[rankOpt];
    if (customRankFont) params.set('font', customRankFont);
    if (nameAmountGap !== 10) params.set('gap', String(nameAmountGap));
    return `${baseObsUrl}?${params.toString()}`;
  };

  const activeObsUrl = getRankObsUrl(selectedSourceRank);

  const handleSelectRankView = (rankOpt: RankSourceOption) => {
    setSelectedSourceRank(rankOpt);
    setFontTarget(rankOpt);
  };

  const handleSelectFontForTarget = (selectedFontName: string, target: RankSourceOption = fontTarget) => {
    if (target === 'all') {
      setFontFamily(selectedFontName);
    } else {
      setRankFonts((prev) => ({
        ...prev,
        [target]: selectedFontName
      }));
    }
  };

  // Fetch initial saved leaderboard config & live top donors
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/widgets/leaderboard?token=${overlayToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.leaderboard) {
          const lb = data.leaderboard;
          const loadedTitle = lb.title || 'TOP SUPPORTERS';
          const loadedPeriod = lb.period || 'all';
          const loadedMaxRows = lb.maxRows || 3;
          const loadedAccentColor = lb.accentColor || '#F59E0B';
          const loadedTemplateStyle = lb.templateStyle || 'champion-spotlight';
          const loadedShowBackground = lb.showBackground !== false;
          const loadedShowAnimation = lb.showAnimation !== false;
          const loadedShowRankBadges = lb.showRankBadges !== false;
          const loadedFontFamily = lb.fontFamily || 'Chakra Petch';
          const loadedRankFonts = lb.rankFonts && typeof lb.rankFonts === 'object' ? lb.rankFonts : {};
          const loadedNameAmountGap = typeof lb.nameAmountGap === 'number' ? lb.nameAmountGap : 10;
          const loadedRemoveRankCardBg = typeof lb.removeRankCardBg === 'boolean' ? lb.removeRankCardBg : false;

          setTitle(loadedTitle);
          setPeriod(loadedPeriod);
          setMaxRows(loadedMaxRows);
          setAccentColor(loadedAccentColor);
          setTemplateStyle(loadedTemplateStyle);
          setShowBackground(loadedShowBackground);
          setShowAnimation(loadedShowAnimation);
          setShowRankBadges(loadedShowRankBadges);
          setFontFamily(loadedFontFamily);
          setRankFonts(loadedRankFonts);
          setNameAmountGap(loadedNameAmountGap);
          setRemoveRankCardBg(loadedRemoveRankCardBg);

          setSavedConfig({
            title: loadedTitle,
            period: loadedPeriod,
            maxRows: loadedMaxRows,
            accentColor: loadedAccentColor,
            templateStyle: loadedTemplateStyle,
            showBackground: loadedShowBackground,
            showAnimation: loadedShowAnimation,
            showRankBadges: loadedShowRankBadges,
            fontFamily: loadedFontFamily,
            rankFonts: JSON.stringify(loadedRankFonts),
            nameAmountGap: loadedNameAmountGap,
            removeRankCardBg: loadedRemoveRankCardBg
          });
        }
        if (data.success && data.topDonors) {
          setTopDonors(data.topDonors);
        }
      })
      .catch((err) => console.error('Failed to load leaderboard config:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [overlayToken]);

  const handleCopyUrl = (rankOpt: RankSourceOption = selectedSourceRank) => {
    const urlToCopy = getRankObsUrl(rankOpt);
    navigator.clipboard.writeText(urlToCopy);
    setCopiedTarget(rankOpt);
    setTimeout(() => setCopiedTarget(null), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload = {
        token: overlayToken,
        title,
        period,
        maxRows,
        accentColor,
        templateStyle,
        showBackground,
        showAnimation,
        showRankBadges,
        fontFamily,
        rankFonts,
        nameAmountGap,
        removeRankCardBg
      };

      const res = await fetch('/api/widgets/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (data.topDonors) setTopDonors(data.topDonors);
        if (socket) {
          socket.emit('leaderboard:update', { token: overlayToken, ...payload });
        }
        setSavedConfig({
          title,
          period,
          maxRows,
          accentColor,
          templateStyle,
          showBackground,
          showAnimation,
          showRankBadges,
          fontFamily,
          rankFonts: JSON.stringify(rankFonts),
          nameAmountGap,
          removeRankCardBg
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Failed to save leaderboard widget:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTitle(savedConfig.title);
    setPeriod(savedConfig.period);
    setMaxRows(savedConfig.maxRows);
    setAccentColor(savedConfig.accentColor);
    setTemplateStyle(savedConfig.templateStyle);
    setShowBackground(savedConfig.showBackground);
    setShowAnimation(savedConfig.showAnimation);
    setShowRankBadges(savedConfig.showRankBadges);
    setFontFamily(savedConfig.fontFamily);
    try {
      setRankFonts(JSON.parse(savedConfig.rankFonts || '{}'));
    } catch {
      setRankFonts({});
    }
    setNameAmountGap(savedConfig.nameAmountGap);
    setRemoveRankCardBg(savedConfig.removeRankCardBg);
  };

  const hasUnsavedChanges =
    !isLoading &&
    (title !== savedConfig.title ||
      period !== savedConfig.period ||
      maxRows !== savedConfig.maxRows ||
      accentColor !== savedConfig.accentColor ||
      templateStyle !== savedConfig.templateStyle ||
      showBackground !== savedConfig.showBackground ||
      showAnimation !== savedConfig.showAnimation ||
      showRankBadges !== savedConfig.showRankBadges ||
      fontFamily !== savedConfig.fontFamily ||
      JSON.stringify(rankFonts) !== savedConfig.rankFonts ||
      nameAmountGap !== savedConfig.nameAmountGap ||
      removeRankCardBg !== savedConfig.removeRankCardBg);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('dashboard-unsaved-changes', {
        detail: { tab: 'leaderboard', hasUnsaved: hasUnsavedChanges }
      })
    );
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleEarthquake = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tab === 'leaderboard') {
        setIsEarthquake(true);
        setTimeout(() => setIsEarthquake(false), 700);
      }
    };
    window.addEventListener('dashboard-unsaved-earthquake', handleEarthquake);
    return () => window.removeEventListener('dashboard-unsaved-earthquake', handleEarthquake);
  }, []);

  const handleTestOvertake = () => {
    if (overtakeTimerRef.current) {
      clearTimeout(overtakeTimerRef.current);
    }

    const baseList: LeaderboardDonor[] =
      topDonors.length >= 2
        ? [...topDonors]
        : [
            { rank: 1, name: 'Sokha Gaming Pro', amount: 120, count: 5, bank: 'ABA Bank' },
            { rank: 2, name: 'Vannak KH', amount: 95, count: 3, bank: 'Bakong KHQR' },
            { rank: 3, name: 'Dara Cyber', amount: 60, count: 2, bank: 'ACLEDA Bank' }
          ];

    const challenger = baseList[1] || { rank: 2, name: 'Vannak KH', amount: 95, count: 3, bank: 'Bakong KHQR' };
    const leader = baseList[0];
    const newTopAmount = Number((leader.amount + 25).toFixed(2));

    const updatedDonors: LeaderboardDonor[] = [
      { ...challenger, rank: 1, amount: newTopAmount, count: (challenger.count || 1) + 1 },
      { ...leader, rank: 2 },
      ...baseList.slice(2).map((d, i) => ({ ...d, rank: i + 3 }))
    ];

    setTopDonors(updatedDonors);
    setOvertakingDonorName(challenger.name);

    if (socket) {
      socket.emit('leaderboard:overtake', {
        token: overlayToken,
        donorName: challenger.name,
        newRank: 1,
        amount: newTopAmount
      });
    }

    overtakeTimerRef.current = setTimeout(() => {
      setOvertakingDonorName(null);
    }, 4500);
  };

  const categories = ['All', 'Cyber', 'Gaming', 'Retro', 'Aesthetic', 'Minimal', 'Special'];

  const filteredTemplates = useMemo(() => {
    return LEADERBOARD_TEMPLATES.filter((t) => {
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      const matchesSearch =
        !templateSearch.trim() ||
        t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.id.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.category.toLowerCase().includes(templateSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, templateSearch]);

  const filteredFonts = useMemo(() => {
    return ALL_CLIENT_FONTS.filter((f) => {
      const matchesCat = fontCategory === 'All' || f.category === fontCategory;
      const matchesSearch =
        !fontSearch.trim() ||
        f.label.toLowerCase().includes(fontSearch.toLowerCase()) ||
        f.value.toLowerCase().includes(fontSearch.toLowerCase()) ||
        f.category.toLowerCase().includes(fontSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [fontCategory, fontSearch]);

  const activeTemplateMeta = useMemo(
    () => LEADERBOARD_TEMPLATES.find((t) => t.id === templateStyle) || LEADERBOARD_TEMPLATES[0],
    [templateStyle]
  );

  // Strictly wait until backend data is ready
  if (isLoading) {
    return <LeaderboardSkeleton />;
  }

  const activeSingleRankNumber = selectedSourceRank === 'all' ? null : Number(selectedSourceRank);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 w-full h-full overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT MAIN AREA: SCALED BIG PREVIEW SCREEN + BOTTOM DOCK BAR  */}
      {/* ============================================================ */}
      <div className="flex-1 min-w-0 bg-[#0B0F19] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden min-h-[480px]">
        {/* Top Bar: Active Template Info, Rank View Tabs & Scale Controls */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#090D16] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Trophy size={15} className="text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-white truncate">
              {activeTemplateMeta?.name || 'Leaderboard Preview'}
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveSection('fonts');
                setFontTarget(selectedSourceRank);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
              title="Click to change font for this view"
            >
              <Type size={11} className="text-amber-400" />
              <span>
                {selectedSourceRank === 'all'
                  ? `Font: ${fontFamily}`
                  : `#${selectedSourceRank} Font: ${getEffectiveRankFont(selectedSourceRank)}`}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Preview Mode Selector (Full vs 1st / 2nd / 3rd Name Card) */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              {(
                [
                  { id: 'all', label: 'All Ranks' },
                  { id: '1', label: '1st Card' },
                  { id: '2', label: '2nd Card' },
                  { id: '3', label: '3rd Card' }
                ] as { id: RankSourceOption; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectRankView(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    selectedSourceRank === tab.id
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scale Selector */}
            <div className="hidden md:flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <ZoomIn size={12} className="text-slate-400 ml-1.5 mr-0.5" />
              {[
                { label: '100%', value: 1 },
                { label: '125%', value: 1.25 },
                { label: '140%', value: 1.4 }
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setPreviewScale(s.value)}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                    previewScale === s.value
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {onToggleRightbar && !isRightbarOpen && (
              <button
                type="button"
                onClick={onToggleRightbar}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium flex items-center gap-1.5"
              >
                <PanelRight size={14} />
                <span>Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* Center Big Preview Stage */}
        <div
          className="obs-preview-stage flex-1 relative overflow-auto flex items-center justify-center p-6 sm:p-10 min-h-[340px]"
          style={{
            backgroundColor: '#060911',
            backgroundImage:
              'linear-gradient(45deg, #0b101d 25%, transparent 25%), linear-gradient(-45deg, #0b101d 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0b101d 75%), linear-gradient(-45deg, transparent 75%, #0b101d 75%)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px'
          }}
        >
          {/* Mode Indicator Pill */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300">
              {selectedSourceRank === 'all'
                ? `Full Leaderboard (Top ${maxRows})`
                : `Dedicated #${selectedSourceRank} Donor Name & Amount Only`}
            </span>
            {selectedSourceRank !== 'all' && (
              <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-amber-300">
                #{selectedSourceRank} Font: {getEffectiveRankFont(selectedSourceRank)}
              </span>
            )}
          </div>

          {/* Scaled Preview Wrapper */}
          <div
            className="w-full flex items-center justify-center transition-transform duration-200 origin-center my-auto"
            style={{
              transform: `scale(${previewScale})`
            }}
          >
            <div className="w-full flex justify-center">
              <LeaderboardTemplateRenderer
                templateStyle={templateStyle}
                title={title}
                period={period}
                topDonors={topDonors}
                accentColor={accentColor}
                showBackground={selectedSourceRank !== 'all' ? !removeRankCardBg && showBackground : showBackground}
                showAnimation={showAnimation}
                showRankBadges={showRankBadges}
                maxRows={maxRows}
                fontFamily={fontFamily}
                rankFonts={rankFonts}
                nameAmountGap={nameAmountGap}
                overtakingDonorName={overtakingDonorName}
                singleRank={activeSingleRankNumber}
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BOTTOM BAR: DEDICATED RANK SOURCE URLS + ACTIONS             */}
        {/* ============================================================ */}
        <div className="p-3.5 border-t border-slate-800/80 bg-[#090D16] flex flex-col gap-2.5 shrink-0">
          {/* Row 1: Dedicated Rank Source URL Switcher & Quick Copy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-400 mr-1">OBS Source URL:</span>
              {(
                [
                  { id: 'all', label: 'All Ranks' },
                  { id: '1', label: '1st Place Only' },
                  { id: '2', label: '2nd Place Only' },
                  { id: '3', label: '3rd Place Only' }
                ] as { id: RankSourceOption; label: string }[]
              ).map((item) => {
                const isSelected = selectedSourceRank === item.id;
                const isCopied = copiedTarget === item.id;
                return (
                  <div key={item.id} className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleSelectRankView(item.id)}
                      className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(item.id)}
                      title={`Copy ${item.label} OBS URL`}
                      className="px-2 py-1.5 border-l border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                );
              })}

              {/* Checkbox to remove background card in dedicated source URL */}
              <label className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={removeRankCardBg}
                  onChange={(e) => setRemoveRankCardBg(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                />
                <span>Remove Background Card</span>
              </label>

              {/* Compact Name & Amount Spacing Slider */}
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                <span className="text-slate-400">Spacing:</span>
                <input
                  type="range"
                  min={4}
                  max={40}
                  step={1}
                  value={nameAmountGap}
                  onChange={(e) => setNameAmountGap(Number(e.target.value))}
                  className="w-16 accent-amber-400 cursor-pointer"
                  title="Adjust spacing between donor name and amount"
                />
                <span className="font-mono text-[10px] text-amber-300 w-7 text-right">{nameAmountGap}px</span>
              </div>
            </div>

            {/* Active URL Readout */}
            <div className="hidden xl:flex items-center gap-2 min-w-0 max-w-xs">
              <code className="text-[11px] font-mono text-slate-400 bg-slate-950 border border-slate-800/80 px-2.5 py-1 rounded truncate">
                {activeObsUrl}
              </code>
            </div>
          </div>

          {/* Row 2: Bottom Action Controls (Copy OBS URL, Test Rank Overtake, Popup) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
              {selectedSourceRank === 'all' ? (
                <span>
                  Displays full leaderboard • Fonts: <strong className="text-slate-200">1st ({getEffectiveRankFont('1')})</strong>,{' '}
                  <strong className="text-slate-200">2nd ({getEffectiveRankFont('2')})</strong>,{' '}
                  <strong className="text-slate-200">3rd ({getEffectiveRankFont('3')})</strong>
                </span>
              ) : (
                <span>
                  Displays <strong className="text-white">only #{selectedSourceRank} donor name & amount</strong> • Font:{' '}
                  <strong className="text-amber-300">{getEffectiveRankFont(selectedSourceRank)}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleCopyUrl(selectedSourceRank)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                {copiedTarget === selectedSourceRank ? <Check size={14} /> : <Copy size={14} />}
                <span>
                  {copiedTarget === selectedSourceRank
                    ? 'Copied URL'
                    : selectedSourceRank === 'all'
                    ? 'Copy OBS URL'
                    : `Copy #${selectedSourceRank} Rank URL`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleTestOvertake}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Flame size={14} className={overtakingDonorName ? 'animate-bounce text-amber-400' : ''} />
                <span>Test Rank Overtake</span>
              </button>

              <a
                href={activeObsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Open OBS Overlay in New Tab"
              >
                <ExternalLink size={14} />
                <span>Popup</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHTBAR: ALL CONFIGURATION SETTINGS                         */}
      {/* ============================================================ */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ease-in-out ${
          isRightbarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseRightbar}
      />

      <div
        className={`fixed lg:static top-0 right-0 bottom-0 z-50 lg:z-0 w-full max-w-[380px] lg:max-w-none shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${
          isRightbarOpen
            ? 'translate-x-0 lg:w-[360px] xl:w-[400px] lg:opacity-100 pointer-events-auto'
            : 'translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:-ml-4 pointer-events-none'
        }`}
      >
        <aside className="w-full max-w-[380px] lg:max-w-none lg:w-[360px] xl:w-[400px] bg-[#0B0F19] border-l lg:border border-slate-800/80 lg:rounded-xl flex flex-col h-full overflow-hidden">
          {/* Rightbar Header */}
          <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sliders size={15} className="text-slate-300" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Leaderboard Configuration
              </h3>
            </div>
            {onCloseRightbar && (
              <button
                type="button"
                onClick={onCloseRightbar}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

            {/* Rightbar Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 p-2 bg-[#090D16] border-b border-slate-800/80 shrink-0">
              <button
                type="button"
                onClick={() => setActiveSection('templates')}
                className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  activeSection === 'templates'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid size={13} />
                <span>Templates ({LEADERBOARD_TEMPLATES.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('fonts')}
                className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  activeSection === 'fonts'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Type size={13} />
                <span>Fonts ({ALL_CLIENT_FONTS.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('settings')}
                className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  activeSection === 'settings'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Palette size={13} />
                <span>Display</span>
              </button>
            </div>

            {/* Rightbar Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* SECTION 1: TEMPLATE STYLES */}
              {activeSection === 'templates' && (
                <div className="space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      placeholder="Search template style..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
                    />
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                          selectedCategory === cat
                            ? 'bg-slate-200 text-slate-950 font-semibold'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Templates List */}
                  <div className="grid grid-cols-1 gap-2">
                    {filteredTemplates.map((tmpl) => {
                      const isSelected = templateStyle === tmpl.id;
                      const isHeroFlagship =
                        tmpl.id === 'champion-spotlight' ||
                        tmpl.id === 'cyber-mvp-showcase' ||
                        tmpl.id === 'royal-podium-crown';

                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => {
                            setTemplateStyle(tmpl.id);
                            setAccentColor(tmpl.previewColor);
                          }}
                          className={`p-3 rounded-lg border text-left transition-colors flex items-start justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-slate-800/90 border-slate-500 text-white'
                              : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: tmpl.previewColor }}
                              />
                              <span className="text-xs font-semibold text-white truncate">
                                {tmpl.name}
                              </span>
                              {isHeroFlagship && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-mono font-bold uppercase shrink-0">
                                  #1 Hero
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {tmpl.description}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0">
                            {tmpl.category}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: ALL AVAILABLE FONTS (GLOBAL & PER-DONOR RANK) */}
              {activeSection === 'fonts' && (
                <div className="space-y-3">
                  {/* Per-Donor Font Target Selector */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-200">
                        Select Font For Donor:
                      </span>
                      {Object.keys(rankFonts).length > 0 && (
                        <button
                          type="button"
                          onClick={() => setRankFonts({})}
                          className="text-[10px] font-mono text-amber-400 hover:text-amber-300"
                        >
                          Use Same Font For All
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'all', label: 'All Donors (Default)', font: fontFamily },
                          { id: '1', label: '1st Place Donor', font: getEffectiveRankFont('1') },
                          { id: '2', label: '2nd Place Donor', font: getEffectiveRankFont('2') },
                          { id: '3', label: '3rd Place Donor', font: getEffectiveRankFont('3') }
                        ] as { id: RankSourceOption; label: string; font: string }[]
                      ).map((target) => {
                        const isTargetActive = fontTarget === target.id;
                        const hasCustomOverride = target.id !== 'all' && Boolean(rankFonts[target.id]);
                        return (
                          <button
                            key={target.id}
                            type="button"
                            onClick={() => {
                              setFontTarget(target.id);
                              setSelectedSourceRank(target.id);
                            }}
                            className={`p-2 rounded-lg border text-left transition-colors ${
                              isTargetActive
                                ? 'bg-slate-800 border-amber-500/70 text-white'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-semibold truncate">{target.label}</span>
                              {hasCustomOverride && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              )}
                            </div>
                            <div
                              className="text-[10px] font-mono text-amber-300/90 truncate mt-0.5"
                              style={{ fontFamily: `"${target.font}", sans-serif` }}
                            >
                              {target.font}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search Fonts */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                      placeholder="Search 89 English & Khmer fonts..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
                    />
                  </div>

                  {/* Font Category Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {(['All', 'English & Gaming', 'Khmer Unicode', 'KhmerAng Studio', 'System & Web'] as const).map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFontCategory(cat)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                            fontCategory === cat
                              ? 'bg-slate-200 text-slate-950 font-semibold'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    )}
                  </div>

                  {/* Font List */}
                  <div className="space-y-1.5">
                    {filteredFonts.map((f) => {
                      const activeFontForTarget = getEffectiveRankFont(fontTarget);
                      const isSelected = activeFontForTarget === f.value;
                      const usedByRanks = (['1', '2', '3'] as const).filter(
                        (r) => getEffectiveRankFont(r) === f.value
                      );

                      return (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => handleSelectFontForTarget(f.value, fontTarget)}
                          className={`w-full px-3 py-2.5 rounded-lg border text-left transition-colors flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-slate-800 border-amber-500/70 text-white'
                              : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-white truncate">
                                {f.label}
                              </span>
                              {usedByRanks.map((r) => (
                                <span
                                  key={r}
                                  className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-mono font-bold"
                                >
                                  #{r}
                                </span>
                              ))}
                            </div>
                            <div
                              className="text-xs text-slate-400 truncate mt-0.5"
                              style={{ fontFamily: `"${f.value}", sans-serif` }}
                            >
                              {fontTarget === '2'
                                ? 'Vannak KH  $50.00 • អ្នកឧបត្ថម្ភលេខ ២'
                                : fontTarget === '3'
                                ? 'Dara Cyber  $32.50 • អ្នកឧបត្ថម្ភលេខ ៣'
                                : 'Sokha Gaming Pro  $85.00 • កំពូលអ្នកឧបត្ថម្ភ'}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0">
                            {f.category === 'KhmerAng Studio'
                              ? 'KhmerAng'
                              : f.category === 'Khmer Unicode'
                              ? 'Khmer'
                              : f.category === 'English & Gaming'
                              ? 'Gaming'
                              : 'System'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: DISPLAY & GENERAL SETTINGS */}
              {activeSection === 'settings' && (
                <div className="space-y-4">
                  {/* Name & Amount Spacing Control */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-200">
                        Name & Amount Spacing
                      </label>
                      <span className="text-xs font-mono font-semibold text-amber-300">
                        {nameAmountGap}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={40}
                      step={1}
                      value={nameAmountGap}
                      onChange={(e) => setNameAmountGap(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: 'Tight (6px)', val: 6 },
                        { label: 'Compact (10px)', val: 10 },
                        { label: 'Medium (16px)', val: 16 },
                        { label: 'Wide (24px)', val: 24 }
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setNameAmountGap(preset.val)}
                          className={`py-1 px-1.5 rounded text-[10px] font-mono border transition-colors ${
                            nameAmountGap === preset.val
                              ? 'bg-slate-800 border-slate-500 text-white font-semibold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Leaderboard Title */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Header Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="TOP SUPPORTERS"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-600"
                    />
                  </div>

                  {/* Time Period */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Ranking Period
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'all', label: 'All-Time' },
                        { id: 'month', label: 'This Month' },
                        { id: 'week', label: 'This Week' },
                        { id: 'today', label: 'Today' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPeriod(p.id as any)}
                          className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                            period === p.id
                              ? 'bg-slate-800 border-slate-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Max Donor Rows */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Displayed Ranks
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[3, 5, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setMaxRows(num)}
                          className={`py-2 px-2.5 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                            maxRows === num
                              ? 'bg-slate-800 border-slate-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Top {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {['#F59E0B', '#00F0FF', '#EAB308', '#10B981', '#EC4899', '#A855F7', '#EF4444', '#3B82F6'].map(
                        (hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setAccentColor(hex)}
                            className={`w-6 h-6 rounded-md border ${
                              accentColor.toLowerCase() === hex.toLowerCase()
                                ? 'border-white scale-110'
                                : 'border-slate-700'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* Visual Toggles */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <span className="text-xs text-slate-200">Show Card Background</span>
                      <input
                        type="checkbox"
                        checked={showBackground}
                        onChange={(e) => setShowBackground(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <span className="text-xs text-slate-200 flex items-center gap-1.5">
                        <Crown size={13} className="text-amber-400" />
                        <span>Show Rank Crown & Medals</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={showRankBadges}
                        onChange={(e) => setShowRankBadges(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <span className="text-xs text-slate-200">Enable Live Animations</span>
                      <input
                        type="checkbox"
                        checked={showAnimation}
                        onChange={(e) => setShowAnimation(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                      />
                    </label>
                  </div>

                  {/* Dedicated Rank Source URLs & Per-Donor Font Picker */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="text-xs font-medium text-slate-300">
                      Dedicated Top Donor Rank URLs & Fonts
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Place 1st, 2nd, or 3rd donor name & amount individually in OBS with its own dedicated font.
                    </p>
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <span className="text-xs text-slate-200">Remove Background Card in Rank URL</span>
                      <input
                        type="checkbox"
                        checked={removeRankCardBg}
                        onChange={(e) => setRemoveRankCardBg(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                      />
                    </label>
                    {(
                      [
                        { id: '1', title: '1st Place Donor' },
                        { id: '2', title: '2nd Place Donor' },
                        { id: '3', title: '3rd Place Donor' }
                      ] as { id: RankSourceOption; title: string }[]
                    ).map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-white">{r.title}</div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              {getRankObsUrl(r.id)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(r.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium flex items-center gap-1 shrink-0"
                          >
                            {copiedTarget === r.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            <span>{copiedTarget === r.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>

                        {/* Per-Donor Font Dropdown */}
                        <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800/70">
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            #{r.id} Font:
                          </span>
                          <select
                            value={getEffectiveRankFont(r.id)}
                            onChange={(e) => handleSelectFontForTarget(e.target.value, r.id)}
                            className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-slate-600"
                          >
                            {ALL_CLIENT_FONTS.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label} ({f.category})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </aside>
      </div>

      {/* Floating Unsaved Changes Toast Bar */}
      {hasUnsavedChanges && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${
            isEarthquake ? 'animate-shake' : ''
          }`}
        >
          <div className="bg-[#0B0F19] border border-slate-700 rounded-lg px-4 py-2.5 shadow-2xl flex items-center gap-4">
            <span className="text-xs font-medium text-slate-300">
              {isEarthquake ? 'Unsaved changes — please save or reset first' : 'Careful — you have unsaved changes'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-3.5 py-1.5 rounded bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
