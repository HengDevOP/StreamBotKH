'use client';

import React from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Flame,
  Zap,
  Terminal,
  Gamepad2,
  Heart,
  Star,
  Cpu,
  Sun,
  Moon,
  Coins,
  Shield,
  Crosshair,
  Radio,
  Eye,
  Award,
  Gem,
  Activity
} from 'lucide-react';

export interface LeaderboardTemplateMeta {
  id: string;
  name: string;
  category: 'Cyber' | 'Gaming' | 'Retro' | 'Aesthetic' | 'Minimal' | 'Special';
  previewColor: string;
  description: string;
}

export interface LeaderboardDonor {
  rank: number;
  name: string;
  amount: number;
  count?: number;
  bank?: string;
  currency?: string;
}

export interface LeaderboardTemplateRendererProps {
  templateStyle: string;
  title?: string;
  period?: 'all' | 'month' | 'week' | 'today';
  topDonors: LeaderboardDonor[];
  accentColor?: string;
  showBackground?: boolean;
  showAnimation?: boolean;
  showRankBadges?: boolean;
  maxRows?: number; // 1 to 10, default 3
  fontFamily?: string;
  className?: string;
}

export const LEADERBOARD_TEMPLATES: LeaderboardTemplateMeta[] = [
  // 1-4: Cyber & Sci-Fi
  {
    id: 'cyber-neon',
    name: 'Cyberpunk Electric Neon',
    category: 'Cyber',
    previewColor: '#00F0FF',
    description: 'Electric cyan cut-corner frame, hazard lines, and glowing neon rank cards.'
  },
  {
    id: 'mecha-hud',
    name: 'Mecha Tactical Telemetry HUD',
    category: 'Cyber',
    previewColor: '#F97316',
    description: 'Sci-fi military orange HUD with target crosshairs, telemetry bevels, and radar scanlines.'
  },
  {
    id: 'matrix-terminal',
    name: 'Matrix CRT Terminal',
    category: 'Cyber',
    previewColor: '#10B981',
    description: 'Phosphor green CRT terminal with scanline raster sweep and monospace command prompt.'
  },
  {
    id: 'toxic-hazard',
    name: 'Toxic Biohazard Nuclear',
    category: 'Cyber',
    previewColor: '#22C55E',
    description: 'Radioactive neon lime green with industrial caution stripes and radiation glow.'
  },

  // 5-8: Gaming & Esports
  {
    id: 'chroma-rgb',
    name: 'Chroma RGB Esports',
    category: 'Gaming',
    previewColor: '#A855F7',
    description: '360-degree flowing rainbow spectrum border with carbon fiber esports interior.'
  },
  {
    id: 'blood-moon',
    name: 'Gothic Blood Moon Noir',
    category: 'Gaming',
    previewColor: '#DC2626',
    description: 'Dark soulslike boss defeat aesthetic with deep crimson aura and blood-red medals.'
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare Molten Lava',
    category: 'Gaming',
    previewColor: '#F59E0B',
    description: 'Blazing molten amber and volcanic magma with blazing flame badges.'
  },
  {
    id: 'deep-sea',
    name: 'Bioluminescent Abyssal Deep Sea',
    category: 'Gaming',
    previewColor: '#0D9488',
    description: 'Bioluminescent deep ocean teal with submerged sonar radar rings and aquatic glass.'
  },

  // 9-12: Retro & Vintage
  {
    id: 'retro-arcade',
    name: 'Retro 8-Bit Arcade High Scores',
    category: 'Retro',
    previewColor: '#EF4444',
    description: 'Chunky 4px pixel borders, retro arcade high-score board, and flashing 8-bit stars.'
  },
  {
    id: 'synthwave-1984',
    name: 'Synthwave 1984 Outrun',
    category: 'Retro',
    previewColor: '#EC4899',
    description: 'Hot magenta to electric violet sunset gradient with neon wireframe grid.'
  },
  {
    id: 'glitch-vaporwave',
    name: 'VHS Glitch & Vaporwave',
    category: 'Retro',
    previewColor: '#06B6D4',
    description: '90s VHS tracking scanlines with chromatic aberration glitch split and pastel cyan.'
  },
  {
    id: 'vintage-classic',
    name: 'Vintage Parchment & Wax Seal',
    category: 'Retro',
    previewColor: '#D97706',
    description: 'Aged antique sepia parchment with gold filigree and embossed wax seal stamps.'
  },

  // 13-16: Aesthetic & Playful
  {
    id: 'kawaii-pastel',
    name: 'Kawaii Pastel Dream Bubble',
    category: 'Aesthetic',
    previewColor: '#F472B6',
    description: 'Soft candy pastel pink and lavender bubble card with beating hearts and cute stars.'
  },
  {
    id: 'celestial-star',
    name: 'Midnight Celestial Starfield',
    category: 'Aesthetic',
    previewColor: '#6366F1',
    description: 'Cosmic deep navy space with twinkling starlight and golden supernova badges.'
  },
  {
    id: 'anime-manga',
    name: 'Shonen Anime Manga Speedline',
    category: 'Aesthetic',
    previewColor: '#FFFFFF',
    description: 'Dynamic comic halftone speedlines with bold black-and-white ink explosions.'
  },
  {
    id: 'glass-frost',
    name: 'Glassmorphism Frost Minimal',
    category: 'Minimal',
    previewColor: '#38BDF8',
    description: 'Apple frosted translucent glass with ultra backdrop blur and glossy silver borders.'
  },

  // 17-20: Minimal & Luxury Special
  {
    id: 'minimal-clean',
    name: 'Swiss Ultra-Clean Monochrome',
    category: 'Minimal',
    previewColor: '#94A3B8',
    description: 'High-contrast typography with razor-sharp borders and zero visual distraction.'
  },
  {
    id: 'golden-luxury',
    name: '24K Golden Luxury VIP',
    category: 'Special',
    previewColor: '#EAB308',
    description: 'Royal obsidian black glass with metallic 24K gold foil borders and royal crown crests.'
  },
  {
    id: 'royal-crown',
    name: 'Imperial Royal Velvet Crown',
    category: 'Special',
    previewColor: '#9333EA',
    description: 'Regal imperial purple velvet card with platinum filigree and velvet glow.'
  },
  {
    id: 'emerald-casino',
    name: 'High Roller VIP Casino Emerald',
    category: 'Special',
    previewColor: '#10B981',
    description: 'Las Vegas VIP poker lounge with rich emerald felt and gold poker chips.'
  }
];

export const LeaderboardTemplateRenderer: React.FC<LeaderboardTemplateRendererProps> = ({
  templateStyle = 'cyber-neon',
  title = 'TOP SUPPORTERS',
  period = 'all',
  topDonors = [],
  accentColor = '#F59E0B',
  showBackground = true,
  showAnimation = true,
  showRankBadges = true,
  maxRows = 3,
  fontFamily = 'Chakra Petch',
  className = ''
}) => {
  // Ensure we display between 1 to 10 rows (default 3)
  const displayLimit = Math.min(10, Math.max(1, maxRows || 3));
  const effectiveDonors = topDonors.slice(0, displayLimit);

  // If no donors provided, generate placeholder slots matching displayLimit
  const donorsToRender: LeaderboardDonor[] = effectiveDonors.length > 0
    ? effectiveDonors
    : Array.from({ length: displayLimit }, (_, i) => ({
        rank: i + 1,
        name: i === 0 ? 'Sokha Gaming Pro' : i === 1 ? 'Vannak KH' : i === 2 ? 'Dara Cyber' : `Supporter #${i + 1}`,
        amount: Math.max(5, Math.round((100 / (i + 1)) * 10) / 10),
        count: Math.max(1, 4 - i),
        bank: i % 2 === 0 ? 'ABA Bank' : 'Bakong KHQR'
      }));

  const periodLabel = period === 'today' ? "Today's Top" : period === 'week' ? 'Weekly Top' : period === 'month' ? 'Monthly Top' : 'All-Time Top';

  // Helper for rank icon/badge
  const renderRankBadge = (rank: number, styleColor: string) => {
    if (!showRankBadges) {
      return <span className="font-mono font-bold text-xs opacity-75">#{rank}</span>;
    }
    if (rank === 1) {
      return <Crown size={15} className="animate-pulse" style={{ color: styleColor }} />;
    }
    if (rank === 2) {
      return <Medal size={15} className="text-slate-300" />;
    }
    if (rank === 3) {
      return <Medal size={15} className="text-amber-600" />;
    }
    return <span className="font-mono font-bold text-xs opacity-70">#{rank}</span>;
  };

  // ==============================================================
  // 1. CYBERPUNK ELECTRIC NEON
  // ==============================================================
  if (templateStyle === 'cyber-neon') {
    const col = accentColor || '#00F0FF';
    return (
      <div
        className={`w-full max-w-sm p-4 relative overflow-hidden font-['Chakra_Petch',sans-serif] ${className}`}
        style={{
          background: showBackground ? 'rgba(6, 11, 25, 0.92)' : 'transparent',
          border: `2px solid ${col}`,
          boxShadow: showBackground ? `0 0 25px ${col}33, inset 0 0 15px ${col}15` : 'none',
          clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: col }} />
            <div>
              <h4 className="text-sm font-extrabold tracking-wider uppercase text-white leading-tight">{title}</h4>
              <span className="text-[10px] font-mono tracking-widest text-cyan-300 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            TOP {displayLimit}
          </span>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2.5 flex items-center justify-between border transition-all ${
                d.rank === 1
                  ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'bg-slate-900/40 border-slate-800'
              }`}
              style={{
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 flex items-center justify-center font-bold">
                  {renderRankBadge(d.rank, col)}
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-white block truncate">{d.name}</span>
                  {d.bank && <span className="text-[9px] font-mono text-cyan-400/80 block">{d.bank}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-black font-mono block" style={{ color: col }}>
                  ${Number(d.amount).toFixed(2)}
                </span>
                {d.count && <span className="text-[9px] font-mono text-slate-400">{d.count} tips</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 2. 24K GOLDEN LUXURY VIP
  // ==============================================================
  if (templateStyle === 'golden-luxury') {
    const gold = accentColor || '#F59E0B';
    return (
      <div
        className={`w-full max-w-sm p-5 rounded-2xl relative overflow-hidden border ${className}`}
        style={{
          background: showBackground ? 'linear-gradient(145deg, #120D04 0%, #080602 100%)' : 'transparent',
          borderColor: `${gold}66`,
          boxShadow: showBackground ? `0 0 30px ${gold}25` : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <Crown size={18} style={{ color: gold }} />
            <div>
              <h4 className="text-sm font-bold tracking-wide uppercase text-amber-200">{title}</h4>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/70">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
            VIP {displayLimit}
          </span>
        </div>

        <div className="space-y-2">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-xl flex items-center justify-between border ${
                d.rank === 1
                  ? 'bg-amber-500/15 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-black/40 border-amber-500/10'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 flex items-center justify-center font-bold">
                  {renderRankBadge(d.rank, gold)}
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-white block truncate">{d.name}</span>
                  {d.bank && <span className="text-[9px] font-mono text-amber-300/70 block">{d.bank}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-black font-mono block text-amber-300">
                  ${Number(d.amount).toFixed(2)}
                </span>
                {d.count && <span className="text-[9px] font-mono text-amber-500/80">{d.count} tips</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 3. RETRO 8-BIT ARCADE
  // ==============================================================
  if (templateStyle === 'retro-arcade') {
    const col = accentColor || '#EF4444';
    return (
      <div
        className={`w-full max-w-sm p-4 bg-black border-4 font-['Press_Start_2P',monospace] text-white ${className}`}
        style={{
          borderColor: col,
          boxShadow: showBackground ? `6px 6px 0px ${col}88` : 'none'
        }}
      >
        <div className="text-center pb-2 mb-3 border-b-2 border-dashed border-red-500">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-yellow-300 mb-1">
            * {title} *
          </h4>
          <span className="text-[8px] text-red-400 uppercase tracking-widest">{periodLabel} - TOP {displayLimit}</span>
        </div>

        <div className="space-y-2 text-[9px]">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 flex items-center justify-between border-2 ${
                d.rank === 1 ? 'border-yellow-400 bg-yellow-950/40 text-yellow-200' : 'border-slate-800 bg-slate-950 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className="font-bold text-yellow-400">#{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-yellow-400 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 4. MECHA SCI-FI HUD
  // ==============================================================
  if (templateStyle === 'mecha-hud') {
    const col = accentColor || '#F97316';
    return (
      <div
        className={`w-full max-w-sm p-4 relative font-['Orbitron',sans-serif] border-2 ${className}`}
        style={{
          background: showBackground ? 'rgba(15, 8, 3, 0.95)' : 'transparent',
          borderColor: col,
          boxShadow: showBackground ? `0 0 25px ${col}30` : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-orange-500/30">
          <div className="flex items-center gap-2">
            <Crosshair size={16} style={{ color: col }} />
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white">{title}</h4>
              <span className="text-[9px] font-mono text-orange-400/80">TAC-TELEMETRY: {periodLabel}</span>
            </div>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 bg-orange-950 border border-orange-500/40 text-orange-400 font-bold">
            R-CAP [{displayLimit}]
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border flex items-center justify-between ${
                d.rank === 1 ? 'border-orange-500 bg-orange-950/40' : 'border-slate-800/80 bg-slate-950/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-orange-400">[{d.rank.toString().padStart(2, '0')}]</span>
                <span className="font-bold text-white truncate text-xs">{d.name}</span>
              </div>
              <span className="text-xs font-bold text-orange-300 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 5. MATRIX CRT TERMINAL
  // ==============================================================
  if (templateStyle === 'matrix-terminal') {
    const col = accentColor || '#10B981';
    return (
      <div
        className={`w-full max-w-sm p-4 bg-black border border-emerald-500/60 font-mono text-xs ${className}`}
        style={{
          boxShadow: showBackground ? `0 0 20px ${col}25, inset 0 0 15px ${col}10` : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/40 text-emerald-400">
          <div className="flex items-center gap-1.5">
            <Terminal size={14} />
            <span className="font-bold uppercase tracking-wider">{title}</span>
          </div>
          <span className="text-[10px] opacity-75">{periodLabel}</span>
        </div>

        <div className="space-y-1">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`px-2 py-1.5 flex items-center justify-between ${
                d.rank === 1 ? 'bg-emerald-950/50 text-emerald-300 font-bold border border-emerald-500/30' : 'text-emerald-400/80'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-emerald-500">&gt; #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 6. GLASSMORHPISM FROST
  // ==============================================================
  if (templateStyle === 'glass-frost') {
    const col = accentColor || '#38BDF8';
    return (
      <div
        className={`w-full max-w-sm p-5 rounded-3xl border border-white/20 backdrop-blur-2xl shadow-2xl font-sans ${className}`}
        style={{
          background: showBackground ? 'rgba(15, 23, 42, 0.65)' : 'transparent',
          boxShadow: showBackground ? `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px ${col}20` : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: col }} />
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
              <span className="text-[10px] text-slate-400 font-mono">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/10">
            Top {displayLimit}
          </span>
        </div>

        <div className="space-y-2">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-2xl flex items-center justify-between transition-all ${
                d.rank === 1 ? 'bg-white/15 border border-white/30 text-white' : 'bg-white/5 border border-white/5 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px]">
                  {d.rank}
                </div>
                <span className="text-xs font-semibold truncate">{d.name}</span>
              </div>
              <span className="text-xs font-bold font-mono ml-2 flex-shrink-0" style={{ color: col }}>
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 7. KAWAII PASTEL DREAM
  // ==============================================================
  if (templateStyle === 'kawaii-pastel') {
    const col = accentColor || '#F472B6';
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-3xl border-2 border-pink-400/60 shadow-xl font-['Kanit',sans-serif] ${className}`}
        style={{
          background: showBackground ? 'rgba(30, 10, 25, 0.92)' : 'transparent',
          boxShadow: showBackground ? `0 0 25px ${col}33` : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-pink-400/20">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-pink-400 animate-pulse fill-pink-400" />
            <div>
              <h4 className="text-sm font-extrabold text-pink-200">{title}</h4>
              <span className="text-[10px] font-mono text-pink-300/80">{periodLabel} ✨</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
            Top {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-2xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-pink-500/20 border-pink-400/60 text-white' : 'bg-slate-900/40 border-pink-500/10 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-pink-400">♥ #{d.rank}</span>
                <span className="text-xs font-bold truncate">{d.name}</span>
              </div>
              <span className="text-xs font-bold font-mono text-pink-300 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 8. SYNTHWAVE 1984
  // ==============================================================
  if (templateStyle === 'synthwave-1984') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl relative overflow-hidden border-2 border-fuchsia-500 font-mono ${className}`}
        style={{
          background: showBackground ? 'linear-gradient(180deg, #18052e 0%, #080112 100%)' : 'transparent',
          boxShadow: showBackground ? '0 0 30px rgba(236,72,153,0.3)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-fuchsia-500/40">
          <div className="flex items-center gap-2">
            <Sun size={16} className="text-yellow-400 animate-spin" />
            <h4 className="text-xs font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">
              {title}
            </h4>
          </div>
          <span className="text-[10px] text-fuchsia-400 font-bold">1984_TOP_{displayLimit}</span>
        </div>

        <div className="space-y-1.5">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg flex items-center justify-between border ${
                d.rank === 1
                  ? 'bg-fuchsia-950/60 border-yellow-400/70 text-yellow-300'
                  : 'bg-black/50 border-fuchsia-500/20 text-fuchsia-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black text-pink-400">#{d.rank}</span>
                <span className="text-xs font-bold truncate">{d.name}</span>
              </div>
              <span className="text-xs font-black text-cyan-300 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 9. GOTHIC BLOOD MOON
  // ==============================================================
  if (templateStyle === 'blood-moon') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border-2 border-red-600 bg-[#0c0202] font-['Bebas_Neue',sans-serif] ${className}`}
        style={{
          boxShadow: showBackground ? '0 0 30px rgba(220,38,38,0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-red-800/80">
          <div className="flex items-center gap-2 text-red-500">
            <Moon size={18} className="fill-red-500" />
            <h4 className="text-base tracking-widest uppercase text-red-100">{title}</h4>
          </div>
          <span className="text-xs font-mono text-red-400 font-bold uppercase">TOP {displayLimit}</span>
        </div>

        <div className="space-y-1.5 font-sans">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg flex items-center justify-between border ${
                d.rank === 1 ? 'bg-red-950/60 border-red-600/70 text-red-100' : 'bg-black/60 border-red-950 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black text-red-500 font-mono">#{d.rank}</span>
                <span className="text-xs font-bold truncate">{d.name}</span>
              </div>
              <span className="text-xs font-black font-mono text-red-400 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 10. CHROMA RGB GAMING
  // ==============================================================
  if (templateStyle === 'chroma-rgb') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl relative overflow-hidden bg-slate-950 border-2 font-['Orbitron',sans-serif] ${className}`}
        style={{
          borderColor: 'transparent',
          backgroundImage: 'linear-gradient(#050811, #050811), linear-gradient(90deg, #FF0055, #00F0FF, #00FF66, #FFCC00, #FF0055)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: showBackground ? '0 0 30px rgba(0,240,255,0.25)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400">
            <Gamepad2 size={16} />
            <h4 className="text-xs font-black tracking-widest uppercase text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
            CHROMA {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-cyan-950/40 border-cyan-400/60 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-cyan-400">#{d.rank}</span>
                <span className="font-bold truncate text-xs">{d.name}</span>
              </div>
              <span className="font-bold text-emerald-400 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 11. SWISS MINIMAL CLEAN
  // ==============================================================
  if (templateStyle === 'minimal-clean') {
    return (
      <div
        className={`w-full max-w-sm p-4 bg-slate-950/95 border border-slate-800 rounded-xl font-sans ${className}`}
        style={{
          boxShadow: showBackground ? '0 4px 20px rgba(0,0,0,0.6)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h4>
          <span className="text-[10px] text-slate-500 font-mono">TOP {displayLimit}</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {donorsToRender.map((d, i) => (
            <div key={i} className="py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-slate-500 font-mono text-[11px] w-4">{d.rank}.</span>
                <span className="font-medium text-slate-200 truncate">{d.name}</span>
              </div>
              <span className="font-semibold font-mono text-white ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 12. IMPERIAL ROYAL CROWN
  // ==============================================================
  if (templateStyle === 'royal-crown') {
    const col = accentColor || '#9333EA';
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border-2 border-purple-500/60 bg-[#0f041a] font-['Montserrat',sans-serif] ${className}`}
        style={{
          boxShadow: showBackground ? `0 0 25px ${col}30` : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-purple-500/30">
          <div className="flex items-center gap-2 text-purple-400">
            <Crown size={18} />
            <h4 className="text-xs font-black uppercase tracking-widest text-purple-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300">
            ROYAL {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-purple-950/60 border-purple-400/70 text-purple-200' : 'bg-black/40 border-purple-950 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-purple-400 font-bold">#{d.rank}</span>
                <span className="font-bold truncate text-xs">{d.name}</span>
              </div>
              <span className="font-bold text-amber-300 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 13. SOLAR FLARE MOLTEN LAVA
  // ==============================================================
  if (templateStyle === 'solar-flare') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border-2 border-amber-500 bg-[#140802] font-['Bebas_Neue',sans-serif] ${className}`}
        style={{
          boxShadow: showBackground ? '0 0 30px rgba(245,158,11,0.3)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-600/60">
          <div className="flex items-center gap-2 text-amber-400">
            <Flame size={18} className="animate-bounce" />
            <h4 className="text-base tracking-wider uppercase text-amber-100">{title}</h4>
          </div>
          <span className="text-xs font-mono text-amber-400 font-bold">TOP {displayLimit}</span>
        </div>

        <div className="space-y-1.5 font-sans">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg flex items-center justify-between border ${
                d.rank === 1 ? 'bg-amber-950/60 border-amber-500/70 text-amber-100' : 'bg-black/50 border-amber-950 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black text-amber-400 font-mono">#{d.rank}</span>
                <span className="text-xs font-bold truncate">{d.name}</span>
              </div>
              <span className="text-xs font-black font-mono text-amber-300 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 14. TOXIC BIOHAZARD
  // ==============================================================
  if (templateStyle === 'toxic-hazard') {
    return (
      <div
        className={`w-full max-w-sm p-4 border-2 border-lime-400 bg-black font-mono text-xs ${className}`}
        style={{
          boxShadow: showBackground ? '0 0 25px rgba(163,230,53,0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-dashed border-lime-400 text-lime-400">
          <div className="flex items-center gap-1.5 font-black uppercase">
            <Activity size={15} />
            <span>{title}</span>
          </div>
          <span className="text-[10px] font-bold">BIO_LEVEL_{displayLimit}</span>
        </div>

        <div className="space-y-1.5">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border flex items-center justify-between ${
                d.rank === 1 ? 'bg-lime-950/50 border-lime-400 text-lime-300 font-bold' : 'bg-slate-950 border-lime-900/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lime-400 font-bold">#{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-lime-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 15. CELESTIAL STARFIELD
  // ==============================================================
  if (templateStyle === 'celestial-star') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border border-indigo-500/40 bg-[#060817] font-['Chakra_Petch',sans-serif] ${className}`}
        style={{
          boxShadow: showBackground ? '0 0 30px rgba(99,102,241,0.25)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-indigo-500/30">
          <div className="flex items-center gap-2 text-indigo-400">
            <Star size={16} className="fill-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono text-indigo-300">STARFIELD {displayLimit}</span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-indigo-950/60 border-indigo-400/60 text-white' : 'bg-slate-950 border-indigo-950 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-indigo-400 font-bold">★ #{d.rank}</span>
                <span className="font-bold truncate text-xs">{d.name}</span>
              </div>
              <span className="font-bold text-indigo-200 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 16. VINTAGE PARCHMENT & WAX SEAL
  // ==============================================================
  if (templateStyle === 'vintage-classic') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-lg border-2 border-amber-800 bg-[#1c130b] font-serif ${className}`}
        style={{
          boxShadow: showBackground ? '0 4px 20px rgba(0,0,0,0.8)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-800/80 text-amber-200">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs">
            <Award size={15} />
            <span>{title}</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400">CHAMPIONS</span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border flex items-center justify-between ${
                d.rank === 1 ? 'bg-amber-950/60 border-amber-600 text-amber-100 font-bold' : 'bg-black/40 border-amber-900/60 text-amber-200/80'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-amber-500 font-bold">§{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-amber-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 17. HIGH ROLLER VIP CASINO EMERALD
  // ==============================================================
  if (templateStyle === 'emerald-casino') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border-2 border-emerald-500 bg-[#04160d] font-sans ${className}`}
        style={{
          boxShadow: showBackground ? '0 0 30px rgba(16,185,129,0.3)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-emerald-500/40">
          <div className="flex items-center gap-2 text-emerald-400">
            <Coins size={16} />
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
            HIGH ROLLER {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-emerald-950/60 border-emerald-400 text-white font-bold' : 'bg-black/50 border-emerald-950 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-emerald-400 font-bold">♠ #{d.rank}</span>
                <span className="truncate text-xs">{d.name}</span>
              </div>
              <span className="font-bold text-emerald-300 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 18. VHS GLITCH VAPORWAVE
  // ==============================================================
  if (templateStyle === 'glitch-vaporwave') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border-2 border-cyan-400 bg-[#0d091a] font-mono text-xs ${className}`}
        style={{
          boxShadow: showBackground ? '3px 3px 0px #EC4899, -3px -3px 0px #06B6D4' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/40 text-cyan-300">
          <div className="flex items-center gap-1.5 font-bold uppercase">
            <Radio size={14} className="animate-pulse" />
            <span>{title}</span>
          </div>
          <span className="text-[10px] text-pink-400 font-bold">VAPOR_TOP_{displayLimit}</span>
        </div>

        <div className="space-y-1.5">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border flex items-center justify-between ${
                d.rank === 1 ? 'bg-cyan-950/40 border-pink-400 text-pink-300 font-bold' : 'bg-slate-950 border-slate-800 text-cyan-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-pink-400 font-bold">#{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-cyan-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 19. BIOLUMINESCENT DEEP SEA
  // ==============================================================
  if (templateStyle === 'deep-sea') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border-2 border-teal-500/60 bg-[#031317] font-sans ${className}`}
        style={{
          boxShadow: showBackground ? '0 0 25px rgba(13,148,136,0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-teal-500/30">
          <div className="flex items-center gap-2 text-teal-400">
            <Eye size={16} />
            <h4 className="text-xs font-black uppercase tracking-wider text-teal-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono text-teal-300 font-bold">ABYSS {displayLimit}</span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-teal-950/60 border-teal-400 text-teal-200 font-bold' : 'bg-black/50 border-teal-950 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-teal-400 font-bold">≈ #{d.rank}</span>
                <span className="truncate text-xs">{d.name}</span>
              </div>
              <span className="font-bold text-teal-300 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 20. SHONEN ANIME MANGA SPEEDLINE
  // ==============================================================
  if (templateStyle === 'anime-manga') {
    return (
      <div
        className={`w-full max-w-sm p-4 bg-white text-black border-4 border-black font-['Permanent_Marker',sans-serif] ${className}`}
        style={{
          boxShadow: showBackground ? '8px 8px 0px #000000' : 'none'
        }}
      >
        <div className="text-center pb-2 mb-2 border-b-2 border-black">
          <h4 className="text-base font-black uppercase tracking-wider">{title}</h4>
          <span className="text-[10px] font-mono text-slate-700 uppercase font-bold tracking-widest">{periodLabel} - TOP {displayLimit}</span>
        </div>

        <div className="space-y-1.5 font-sans font-bold text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border-2 border-black flex items-center justify-between ${
                d.rank === 1 ? 'bg-yellow-300 text-black shadow-[3px_3px_0px_#000]' : 'bg-slate-100 text-black'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-black text-xs font-mono">#{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-black font-mono ml-2 flex-shrink-0">${Number(d.amount).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default fallback if unknown template
  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-white">
      <h4 className="font-bold text-sm mb-2">{title}</h4>
      <div className="space-y-1 text-xs">
        {donorsToRender.map((d, i) => (
          <div key={i} className="flex justify-between py-1 border-b border-slate-800">
            <span>#{d.rank} {d.name}</span>
            <span className="font-bold font-mono">${Number(d.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
