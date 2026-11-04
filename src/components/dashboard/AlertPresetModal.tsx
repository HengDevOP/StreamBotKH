'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Sparkles,
  RotateCcw,
  Check,
  Clapperboard,
  Crown,
  Flame,
  Zap,
  Target,
  Trophy,
  Heart,
  Smile,
  Gamepad2,
  Tv,
  Eye,
  Disc,
  Rocket,
  Shield,
  Layers,
  Sun,
  Lock,
  Anchor,
  Activity,
  Ghost,
  CreditCard,
  Plane,
  AlertTriangle,
  Moon,
  Palette,
  Gift,
  Play
} from 'lucide-react';
import {
  ALERT_PRESETS_100,
  ALERT_PRESET_CATEGORIES,
  AlertPreset
} from '../../data/donationAlertPresets';
import { getGradientOrColorStyle } from '../overlay/NeonAlertCard';

interface AlertPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: AlertPreset | null) => void;
  selectedPresetId?: string | null;
}

export const AlertPresetModal: React.FC<AlertPresetModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  selectedPresetId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [highlightedPreset, setHighlightedPreset] = useState<AlertPreset | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync initial selection
  useEffect(() => {
    if (isOpen) {
      if (selectedPresetId) {
        const found = ALERT_PRESETS_100.find((p) => p.id === selectedPresetId);
        setHighlightedPreset(found || null);
      } else {
        setHighlightedPreset(null);
      }
    }
  }, [isOpen, selectedPresetId]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Stop any playing audio when closing
  useEffect(() => {
    if (!isOpen && activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
  }, [isOpen]);

  // Filter presets
  const filteredPresets = useMemo(() => {
    return ALERT_PRESETS_100.filter((p) => {
      const matchesCat = activeCategory === 'All' || p.category === activeCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.capcutLabel.toLowerCase().includes(q) ||
        p.capcutAnimation.toLowerCase().includes(q) ||
        p.popupAnimationName.toLowerCase().includes(q) ||
        p.fontFamily.toLowerCase().includes(q) ||
        p.badge.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [searchTerm, activeCategory]);

  const handleReplay = (id: string, soundUrl?: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAnimatingId(id);

    if (soundUrl && typeof window !== 'undefined') {
      try {
        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
        }
        const audio = new Audio(soundUrl);
        audio.volume = 0.55;
        activeAudioRef.current = audio;
        audio.play().catch(() => {});
      } catch (_) {}
    }

    setTimeout(() => {
      setAnimatingId((prev) => (prev === id ? null : prev));
    }, 1250);
  };

  const handleHoverPreview = (id: string) => {
    // Light visual preview on mouse enter without playing audio
    if (animatingId !== id) {
      setAnimatingId(id);
      setTimeout(() => {
        setAnimatingId((prev) => (prev === id ? null : prev));
      }, 1100);
    }
  };

  const getAccentIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Trophy': return <Trophy size={12} />;
      case 'Zap': return <Zap size={12} />;
      case 'Crown': return <Crown size={12} />;
      case 'Target': return <Target size={12} />;
      case 'Flame': return <Flame size={12} />;
      case 'Heart': return <Heart size={12} />;
      case 'Smile': return <Smile size={12} />;
      case 'Gamepad2': return <Gamepad2 size={12} />;
      case 'Tv': return <Tv size={12} />;
      case 'Ghost': return <Ghost size={12} />;
      case 'Shield': return <Shield size={12} />;
      case 'CreditCard': return <CreditCard size={12} />;
      case 'Anchor': return <Anchor size={12} />;
      case 'Sun': return <Sun size={12} />;
      case 'Activity': return <Activity size={12} />;
      case 'Plane': return <Plane size={12} />;
      case 'AlertTriangle': return <AlertTriangle size={12} />;
      case 'Moon': return <Moon size={12} />;
      case 'Palette': return <Palette size={12} />;
      case 'Disc': return <Disc size={12} />;
      case 'Rocket': return <Rocket size={12} />;
      case 'Gift': return <Gift size={12} />;
      case 'Eye': return <Eye size={12} />;
      default: return <Sparkles size={12} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Responsive Modal Window - simple, perfectly fits screen */}
      <div className="relative w-full max-w-5xl h-[92dvh] sm:h-[86vh] max-h-[850px] bg-[#0A0D18] border border-cyan-500/30 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Compact Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-amber-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-md shadow-cyan-500/10 shrink-0">
              <Clapperboard size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white font-['Chakra_Petch'] tracking-wide truncate">
                  Alert Style Presets
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-mono text-[10px] font-bold shrink-0">
                  100 CapCut FX
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate hidden sm:block">
                Choose any preset with CapCut animation, sound &amp; styling, or leave blank for default.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onSelectPreset(null);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer whitespace-nowrap"
            >
              Leave Blank
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close presets modal"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Compact Search & Category Filter Navigation */}
        <div className="px-3 py-2.5 sm:px-6 sm:py-3 border-b border-slate-800/80 bg-slate-950/70 space-y-2.5 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search 100 styles (e.g. Apex, Shake, Flip, Glitch, Anime, 24K Gold, Rebound)..."
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-white font-mono text-xs placeholder:text-slate-500 focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Swipeable Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none no-scrollbar">
            {ALERT_PRESET_CATEGORIES.map((cat) => {
              const count =
                cat === 'All'
                  ? ALERT_PRESETS_100.length
                  : ALERT_PRESETS_100.filter((p) => p.category === cat).length;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-xl font-mono text-[11px] whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400 text-cyan-200 font-bold shadow-sm shadow-cyan-500/10'
                      : 'bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`px-1 rounded-full text-[9px] ${
                      isActive ? 'bg-cyan-400/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Presets Grid - Simple 2-column on desktop, 1-column on mobile */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-5 space-y-3.5 overscroll-contain">
          {filteredPresets.length === 0 ? (
            <div className="py-16 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                <Search size={18} />
              </div>
              <h3 className="text-sm font-bold text-white font-['Chakra_Petch']">
                No styles found matching "{searchTerm}"
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try searching for another keyword or switch category filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setActiveCategory('All');
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredPresets.map((preset) => {
                const isSelected = highlightedPreset?.id === preset.id;
                const isReplaying = animatingId === preset.id;

                return (
                  <div
                    key={preset.id}
                    onMouseEnter={() => handleHoverPreview(preset.id)}
                    onClick={() => {
                      setHighlightedPreset(preset);
                      handleReplay(preset.id, preset.soundUrl);
                    }}
                    onDoubleClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-slate-900/90 shadow-xl shadow-cyan-500/15 ring-2 ring-cyan-400/30'
                        : 'border-slate-800/80 bg-slate-900/40 hover:border-cyan-500/50 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-cyan-500/5'
                    }`}
                  >
                    {/* Card Top Header: Title, Category Badge & CapCut Animation Tag */}
                    <div className="px-3.5 py-2.5 border-b border-slate-800/70 bg-slate-950/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 flex items-center gap-1"
                          style={{
                            backgroundColor: `${preset.badgeColor}20`,
                            color: preset.badgeColor,
                            border: `1px solid ${preset.badgeColor}40`
                          }}
                        >
                          {getAccentIconComponent(preset.accentIcon)}
                          <span>{preset.badge}</span>
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                          {preset.name}
                        </h4>
                      </div>

                      {/* CapCut Animation Tag */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border border-purple-400/40 shrink-0 flex items-center gap-1 shadow-sm">
                        <Clapperboard size={11} className="text-cyan-400" />
                        <span>{preset.capcutLabel}</span>
                      </span>
                    </div>

                    {/* LIVE ACTUAL ALERT PREVIEW CANVAS */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setHighlightedPreset(preset);
                        handleReplay(preset.id, preset.soundUrl, e);
                      }}
                      title="Click canvas to replay CapCut animation and sound"
                      className="p-3.5 sm:p-5 bg-[#050711] relative flex items-center justify-center min-h-[165px] overflow-hidden select-none group/canvas"
                    >
                      {/* Simulated dark stream scene grid */}
                      <div
                        className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{
                          backgroundImage:
                            'radial-gradient(#38BDF8 1px, transparent 1px), radial-gradient(#38BDF8 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0, 10px 10px'
                        }}
                      />

                      {/* Replay Pill in Top-Right of Canvas */}
                      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover/canvas:opacity-100 transition-opacity hidden sm:inline bg-black/60 px-2 py-0.5 rounded-md border border-slate-800">
                          Replay FX
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleReplay(preset.id, preset.soundUrl, e)}
                          title="Replay CapCut Animation & Audio"
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer shadow-md"
                        >
                          <RotateCcw size={12} className={isReplaying ? 'animate-spin text-cyan-400' : ''} />
                        </button>
                      </div>

                      {/* THE ACTUAL ANIMATED DONATION ALERT CARD PREVIEW */}
                      <div
                        className={`relative z-10 w-full max-w-sm p-3.5 sm:p-4 rounded-xl transition-all duration-300 ${
                          preset.cardBorder
                        } ${
                          isReplaying
                            ? `animate-${preset.capcutAnimation}`
                            : 'animate-capcut-idle'
                        }`}
                        style={{
                          background: preset.cardBg,
                          boxShadow: preset.boxShadow,
                          fontFamily: `"${preset.fontFamily}", sans-serif`
                        }}
                      >
                        <div
                          className={`flex ${
                            preset.layoutMode === 'left'
                              ? 'flex-row items-center gap-3 text-left'
                              : preset.layoutMode === 'right'
                              ? 'flex-row-reverse items-center gap-3 text-left'
                              : 'flex-col items-center text-center space-y-1.5'
                          }`}
                        >
                          {/* Animated Reaction GIF */}
                          <div className="relative shrink-0">
                            <img
                              src={preset.mediaUrl}
                              alt={preset.name}
                              className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg drop-shadow-[0_0_10px_rgba(0,240,255,0.25)]"
                              loading="lazy"
                            />
                          </div>

                          {/* Text & Amounts */}
                          <div className="space-y-1 min-w-0">
                            <div className="text-xs sm:text-sm font-bold leading-tight">
                              <span
                                className="font-extrabold mr-1.5"
                                style={getGradientOrColorStyle(preset.donorColor)}
                              >
                                {preset.previewDonor}
                              </span>
                              <span style={getGradientOrColorStyle(preset.textColor)}>
                                tipped
                              </span>
                              <span
                                className="font-black ml-1.5 px-1.5 py-0.5 rounded"
                                style={getGradientOrColorStyle(preset.amountColor)}
                              >
                                {preset.previewAmount}
                              </span>
                            </div>

                            {/* Message Bubble */}
                            <div
                              className="text-[11px] italic text-slate-200 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10"
                              style={{ color: preset.textColor }}
                            >
                              "{preset.previewMessage}"
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Metadata & Select Button */}
                    <div className="px-3.5 py-2.5 bg-slate-950/80 border-t border-slate-800/70 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          Font: <strong className="text-slate-300">{preset.fontFamily}</strong> • Layout: <strong className="text-cyan-400">{preset.layoutMode}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPreset(preset);
                          onClose();
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? 'bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-400/20'
                            : 'bg-cyan-500/15 hover:bg-cyan-400 hover:text-slate-950 border border-cyan-400/40 text-cyan-300'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check size={13} />
                            <span>Select Style</span>
                          </>
                        ) : (
                          <span>Select</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-slate-800/80 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            {highlightedPreset ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  Chosen:
                </span>
                <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate">
                  {highlightedPreset.name}
                </span>
                <span className="text-[10px] font-mono text-purple-300 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-400/30 shrink-0 flex items-center gap-1">
                  <Clapperboard size={10} className="text-cyan-400" />
                  <span>{highlightedPreset.capcutLabel}</span>
                </span>
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-400">
                Showing <strong className="text-cyan-400">{filteredPresets.length}</strong> of 100 styles
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onSelectPreset(null);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Clear (Leave Blank)
            </button>
            {highlightedPreset ? (
              <button
                type="button"
                onClick={() => {
                  onSelectPreset(highlightedPreset);
                  onClose();
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-mono font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all cursor-pointer shadow-md shadow-cyan-400/20"
              >
                Apply Style
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-mono font-extrabold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all cursor-pointer shadow-md shadow-cyan-400/20"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
