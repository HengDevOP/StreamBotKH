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
  Activity,
  Compass,
  Coffee,
  Tv,
  Wand2,
  Swords,
  Snowflake,
  Skull,
  Ghost,
  Target,
  Layers
} from 'lucide-react';
import {
  EXTENDED_LEADERBOARD_TEMPLATES,
  renderExtendedLeaderboardTemplate
} from './leaderboardExtendedTemplates';

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
  overtakingDonorName?: string | null;
}

export const LEADERBOARD_TEMPLATES: LeaderboardTemplateMeta[] = [
  // ==========================================
  // 1-8: CYBER & SCI-FI (8 STYLES)
  // ==========================================
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
  {
    id: 'quantum-hologram',
    name: 'Quantum 3D Holographic Projector',
    category: 'Cyber',
    previewColor: '#38BDF8',
    description: 'Floating cyan hologram scanlines, particle grid lines, and futuristic HUD brackets.'
  },
  {
    id: 'cyber-glitch-anarchy',
    name: 'Cyber Anarchy Overdrive',
    category: 'Cyber',
    previewColor: '#F43F5E',
    description: 'Corrupted neon pink and yellow glitch hazard bars with chromatic scanline jitter.'
  },
  {
    id: 'cyber-samurai',
    name: 'Neo-Tokyo Cyber Samurai',
    category: 'Cyber',
    previewColor: '#EF4444',
    description: 'Crimson katana slash angle, samurai warrior crest, and glowing ember highlights.'
  },
  {
    id: 'carbon-tactical',
    name: 'Stealth Carbon Ghost Ops',
    category: 'Cyber',
    previewColor: '#84CC16',
    description: 'Matte carbon fiber weave with night-vision phosphor green crosshairs and military tags.'
  },

  // ==========================================
  // 9-16: GAMING & ESPORTS (8 STYLES)
  // ==========================================
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
  {
    id: 'infernal-demon',
    name: 'Infernal Nether Flame',
    category: 'Gaming',
    previewColor: '#EA580C',
    description: 'Roaring hellfire obsidian brimstone with burning magma aura and skull badges.'
  },
  {
    id: 'championship-podium',
    name: 'Olympic Championship Gold',
    category: 'Gaming',
    previewColor: '#EAB308',
    description: 'Stadium arena spotlights, golden laurel wreath crest, and metallic podium finish.'
  },
  {
    id: 'military-radar',
    name: 'Air Force Sonar Radar',
    category: 'Gaming',
    previewColor: '#10B981',
    description: 'Rotating circular green sonar sweep, tactical coordinates, and radar pulse ping.'
  },
  {
    id: 'ice-glacier',
    name: 'Sub-Zero Cryo Glacier',
    category: 'Gaming',
    previewColor: '#06B6D4',
    description: 'Frosty ice crystal shard borders, cryo steam vapor glow, and frozen cyan shimmer.'
  },

  // ==========================================
  // 17-24: RETRO & VINTAGE (8 STYLES)
  // ==========================================
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
  {
    id: 'steampunk-brass',
    name: 'Victorian Steampunk Clockwork',
    category: 'Retro',
    previewColor: '#B45309',
    description: 'Burnished brass plates, copper rivets, rotating clockwork gears, and antique glow.'
  },
  {
    id: 'pixel-rpg-quest',
    name: '16-Bit Fantasy Guild Quest',
    category: 'Retro',
    previewColor: '#854D0E',
    description: 'Wooden bounty board, parchment scroll banners, and pixel ruby sword badges.'
  },
  {
    id: 'vapor-grid-90s',
    name: '90s Windows Retro Desktop',
    category: 'Retro',
    previewColor: '#0E7490',
    description: 'Classic 1995 desktop OS window with blue titlebar, grey 3D bevels, and retro buttons.'
  },
  {
    id: 'lofi-chill',
    name: 'Lo-Fi Sunset Coffee Shop',
    category: 'Retro',
    previewColor: '#FB923C',
    description: 'Warm peach and lavender sunset gradient, cozy coffee cup badge, and vinyl warmth.'
  },

  // ==========================================
  // 25-32: AESTHETIC & CREATIVE (8 STYLES)
  // ==========================================
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
    id: 'graffiti-streetwear',
    name: 'Streetwear Urban Spray Tag',
    category: 'Aesthetic',
    previewColor: '#E11D48',
    description: 'Dark brick wall backdrop, neon spray-paint stencil tags, and urban grunge drip.'
  },
  {
    id: 'bubblegum-pop',
    name: 'Sweet Candy Bubblegum Pop',
    category: 'Aesthetic',
    previewColor: '#F43F5E',
    description: 'Vibrant cotton candy gradients, bouncy pop bubble badges, and glitter sparkles.'
  },
  {
    id: 'prismatic-aurora',
    name: 'Nordic Polar Aurora Borealis',
    category: 'Aesthetic',
    previewColor: '#14B8A6',
    description: 'Flowing emerald-to-violet aurora ribbons with glowing crystal frost aura.'
  },
  {
    id: 'mystic-arcane',
    name: 'Arcane Mage Spellbook',
    category: 'Aesthetic',
    previewColor: '#8B5CF6',
    description: 'Ancient magic rune circles, glowing amethyst glyphs, and levitating mana aura.'
  },
  {
    id: 'cosmic-nebula',
    name: 'Deep Space Supernova Nebula',
    category: 'Aesthetic',
    previewColor: '#7C3AED',
    description: 'Swirling violet galaxy dust vortex with radiant starlight halo and cosmic particles.'
  },

  // ==========================================
  // 33-36: MINIMAL & MODERN (4 STYLES)
  // ==========================================
  {
    id: 'glass-frost',
    name: 'Glassmorphism Frost Minimal',
    category: 'Minimal',
    previewColor: '#38BDF8',
    description: 'Apple frosted translucent glass with ultra backdrop blur and glossy silver borders.'
  },
  {
    id: 'minimal-clean',
    name: 'Swiss Ultra-Clean Monochrome',
    category: 'Minimal',
    previewColor: '#94A3B8',
    description: 'High-contrast typography with razor-sharp borders and zero visual distraction.'
  },
  {
    id: 'hyper-neon-synth',
    name: 'Hyperdrive Laser Synth Minimal',
    category: 'Minimal',
    previewColor: '#06B6D4',
    description: 'High-voltage electric neon tubes, laser grid lines, and ultra-sleek pill rows.'
  },
  {
    id: 'gothic-cathedral',
    name: 'Dark Obsidian & Rose Gold',
    category: 'Minimal',
    previewColor: '#FB7185',
    description: 'Black stained glass, ornate rose gold gothic arches, and delicate candle glow.'
  },

  // ==========================================
  // 37-40: SPECIAL & LUXURY (4 STYLES)
  // ==========================================
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
  },
  {
    id: 'diamond-prestige',
    name: 'Ultra Tier Diamond Prestige',
    category: 'Special',
    previewColor: '#E0E7FF',
    description: 'Faceted crystal diamond glass with rainbow prism refraction and sparkling stars.'
  },
  ...EXTENDED_LEADERBOARD_TEMPLATES
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
  className = '',
  overtakingDonorName = null
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

  // Custom Font styling applied uniformly
  const resolvedFontFamily = fontFamily ? `"${fontFamily}", sans-serif` : undefined;

  // Helper for rank icon/badge
  const renderRankBadge = (rank: number, styleColor: string, isOvertaker = false) => {
    if (isOvertaker) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 font-black text-[9px] animate-bounce shadow-md shadow-amber-400/50">
          ▲ #{rank}
        </span>
      );
    }
    if (!showRankBadges) {
      return <span className="font-mono font-bold text-xs opacity-75">#{rank}</span>;
    }
    if (rank === 1) {
      return <Crown size={15} className={showAnimation ? 'animate-pulse' : ''} style={{ color: styleColor }} />;
    }
    if (rank === 2) {
      return <Medal size={15} className="text-slate-300" />;
    }
    if (rank === 3) {
      return <Medal size={15} className="text-amber-600" />;
    }
    return <span className="font-mono font-bold text-xs opacity-70">#{rank}</span>;
  };

  // Check if requested template belongs to the 40 new extended styles
  if (EXTENDED_LEADERBOARD_TEMPLATES.some((t) => t.id === templateStyle)) {
    const extendedNode = renderExtendedLeaderboardTemplate({
      templateStyle,
      title,
      periodLabel,
      displayLimit,
      donorsToRender,
      accentColor,
      showBackground,
      showAnimation,
      showRankBadges,
      resolvedFontFamily,
      className,
      overtakingDonorName,
      renderRankBadge
    });
    if (extendedNode) return extendedNode;
  }

  // Helper style block for animations
  const animationStyles = (
    <style dangerouslySetInnerHTML={{
      __html: `
        @keyframes lb-rgb-flow {
          0% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(180deg); }
          100% { filter: hue-rotate(360deg); }
        }
        @keyframes lb-scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
        @keyframes lb-pulse-slow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        @keyframes lb-gear-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes lb-radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes lb-shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        @keyframes lb-flame-flow {
          0% { border-color: #EF4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.7), inset 0 0 10px rgba(249, 115, 22, 0.4); }
          25% { border-color: #F97316; box-shadow: 0 0 25px rgba(249, 115, 22, 0.85), inset 0 0 14px rgba(234, 179, 8, 0.5); }
          50% { border-color: #EAB308; box-shadow: 0 0 30px rgba(234, 179, 8, 0.95), inset 0 0 18px rgba(239, 68, 68, 0.55); }
          75% { border-color: #F43F5E; box-shadow: 0 0 22px rgba(244, 63, 94, 0.8), inset 0 0 12px rgba(249, 115, 22, 0.4); }
          100% { border-color: #EF4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.7), inset 0 0 10px rgba(249, 115, 22, 0.4); }
        }
        @keyframes lb-frost-flow {
          0% { border-color: #38BDF8; box-shadow: 0 0 15px rgba(56, 189, 248, 0.7), inset 0 0 10px rgba(186, 230, 253, 0.35); }
          50% { border-color: #E0F2FE; box-shadow: 0 0 26px rgba(224, 242, 254, 0.95), inset 0 0 18px rgba(56, 189, 248, 0.5); }
          100% { border-color: #38BDF8; box-shadow: 0 0 15px rgba(56, 189, 248, 0.7), inset 0 0 10px rgba(186, 230, 253, 0.35); }
        }
        @keyframes lb-electric-crackle {
          0%, 100% { border-color: #A855F7; box-shadow: 0 0 14px rgba(168, 85, 247, 0.7); }
          25% { border-color: #06B6D4; box-shadow: 0 0 25px rgba(6, 182, 212, 0.9); }
          50% { border-color: #3B82F6; box-shadow: 0 0 18px rgba(59, 130, 246, 0.75); }
          75% { border-color: #EC4899; box-shadow: 0 0 24px rgba(236, 72, 153, 0.85); }
        }
        @keyframes lb-overtake-pop {
          0% { transform: scale(0.9) translateY(10px); opacity: 0.5; filter: brightness(2.5) contrast(1.5); }
          35% { transform: scale(1.08) translateY(-5px); filter: brightness(1.7); }
          60% { transform: scale(1.02) translateY(-2px); }
          80% { transform: scale(1.05); }
          100% { transform: scale(1) translateY(0); filter: brightness(1); }
        }
        .lb-anim-overtake { animation: lb-overtake-pop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; position: relative; z-index: 10; }
        .lb-flame-card { animation: lb-flame-flow 2.4s ease-in-out infinite; }
        .lb-frost-card { animation: lb-frost-flow 3s ease-in-out infinite; }
        .lb-anim-electric { animation: lb-electric-crackle 1.8s ease-in-out infinite; }
        .lb-anim-rgb { animation: lb-rgb-flow 8s linear infinite; }
        .lb-anim-scanline { animation: lb-scanline 6s linear infinite; }
        .lb-anim-gear { animation: lb-gear-spin 12s linear infinite; }
        .lb-anim-radar { animation: lb-radar-sweep 4s linear infinite; transform-origin: center; }
        .lb-anim-pulse { animation: lb-pulse-slow 3s ease-in-out infinite; }
      `
    }} />
  );

  // ==============================================================
  // 1. CYBERPUNK ELECTRIC NEON
  // ==============================================================
  if (templateStyle === 'cyber-neon') {
    const col = accentColor || '#00F0FF';
    return (
      <div
        className={`w-full max-w-sm p-4 relative overflow-hidden ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Chakra Petch', sans-serif",
          background: showBackground ? 'rgba(6, 11, 25, 0.94)' : 'transparent',
          border: `2px solid ${col}`,
          boxShadow: showBackground ? `0 0 25px ${col}33, inset 0 0 15px ${col}15` : 'none',
          clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))'
        }}
      >
        {animationStyles}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: col }} className={showAnimation ? 'animate-pulse' : ''} />
            <div>
              <h4 className="text-sm font-extrabold tracking-wider uppercase text-white leading-tight">{title}</h4>
              <span className="text-[10px] font-mono tracking-widest text-cyan-300 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            TOP {displayLimit}
          </span>
        </div>

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
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'linear-gradient(145deg, #120D04 0%, #080602 100%)' : 'transparent',
          borderColor: `${gold}66`,
          boxShadow: showBackground ? `0 0 30px ${gold}25` : 'none'
        }}
      >
        {animationStyles}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <Crown size={18} style={{ color: gold }} className={showAnimation ? 'animate-bounce' : ''} />
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
        className={`w-full max-w-sm p-4 bg-black border-4 text-white ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Press Start 2P', monospace",
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
        className={`w-full max-w-sm p-4 relative border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Orbitron', sans-serif",
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
              className={`p-2 rounded flex items-center justify-between border ${
                d.rank === 1 ? 'bg-orange-500/20 border-orange-500 text-orange-200 font-bold' : 'bg-black/60 border-orange-500/20 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-orange-400 font-bold">0{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-orange-300 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 5. CHROMA RGB ESPORTS
  // ==============================================================
  if (templateStyle === 'chroma-rgb') {
    return (
      <div
        className={`w-full max-w-sm p-[2px] rounded-2xl relative overflow-hidden ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showAnimation
            ? 'linear-gradient(45deg, #ff0055, #7a00ff, #00f0ff, #00ff66, #ff0055)'
            : '#A855F7'
        }}
      >
        {animationStyles}
        <div
          className="p-4 rounded-2xl"
          style={{ background: showBackground ? '#070913' : 'transparent' }}
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400 animate-pulse" />
              <div>
                <h4 className="text-sm font-black tracking-wider uppercase text-white">{title}</h4>
                <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">{periodLabel}</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-purple-300">
              CHROMA {displayLimit}
            </span>
          </div>

          <div className="space-y-2">
            {donorsToRender.map((d, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl flex items-center justify-between border ${
                  d.rank === 1
                    ? 'bg-slate-900 border-cyan-400/60 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center font-bold">
                    {renderRankBadge(d.rank, '#00F0FF')}
                  </div>
                  <span className="text-xs font-bold text-white truncate">{d.name}</span>
                </div>
                <span className="text-xs font-black font-mono text-cyan-300 ml-2 flex-shrink-0">
                  ${Number(d.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // 6. SYNTHWAVE 1984 OUTRUN
  // ==============================================================
  if (templateStyle === 'synthwave-1984') {
    const col = accentColor || '#EC4899';
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'linear-gradient(180deg, #18092B 0%, #0A0314 100%)' : 'transparent',
          borderColor: col,
          boxShadow: showBackground ? `0 0 25px ${col}44` : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-pink-500/30">
          <div className="flex items-center gap-2">
            <Sun size={18} className="text-pink-400" />
            <div>
              <h4 className="text-sm font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-amber-300">{title}</h4>
              <span className="text-[10px] font-mono text-pink-300 uppercase tracking-widest">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-pink-950 border border-pink-500 text-pink-300">
            TOP {displayLimit}
          </span>
        </div>

        <div className="space-y-2">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-xl flex items-center justify-between border ${
                d.rank === 1
                  ? 'bg-pink-950/40 border-pink-400 text-pink-200'
                  : 'bg-purple-950/20 border-purple-900/50 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-xs text-pink-400">#{d.rank}</span>
                <span className="text-xs font-bold truncate">{d.name}</span>
              </div>
              <span className="text-xs font-mono font-black text-amber-300 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 7. GLASSMORHPISM FROST MINIMAL
  // ==============================================================
  if (templateStyle === 'glass-frost') {
    const col = accentColor || '#38BDF8';
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl backdrop-blur-xl border border-white/20 text-white ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          boxShadow: showBackground ? '0 10px 30px rgba(0, 0, 0, 0.4)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: col }} />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h4>
              <span className="text-[10px] text-slate-300 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-slate-200">
            TOP {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between backdrop-blur-md border ${
                d.rank === 1 ? 'bg-white/15 border-white/40 font-bold' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] opacity-70">#{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-mono font-bold ml-2 flex-shrink-0" style={{ color: col }}>
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 8. KAWAII PASTEL DREAM BUBBLE
  // ==============================================================
  if (templateStyle === 'kawaii-pastel') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-3xl border-2 border-pink-300 bg-pink-950/70 text-pink-100 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 25px rgba(244, 114, 182, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-pink-400/30">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-pink-400 fill-pink-400 animate-pulse" />
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-pink-200">{title}</h4>
              <span className="text-[10px] text-pink-300">♡ {periodLabel} ♡</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-400/40">
            ★ TOP {displayLimit} ★
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-2xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-pink-500/30 border-pink-400 text-white font-bold' : 'bg-black/30 border-pink-900/40 text-pink-100'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-pink-400 font-bold">♥ {d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-mono font-bold text-pink-300 ml-2 flex-shrink-0">
                ${Number(d.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 9. MATRIX CRT TERMINAL
  // ==============================================================
  if (templateStyle === 'matrix-terminal') {
    return (
      <div
        className={`w-full max-w-sm p-4 bg-black border-2 border-emerald-500 font-mono text-emerald-400 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'VT323', monospace",
          boxShadow: showBackground ? '0 0 25px rgba(16, 185, 129, 0.3)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/40">
          <div className="flex items-center gap-1.5">
            <Terminal size={14} className="text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">{title}</h4>
          </div>
          <span className="text-[10px] text-emerald-500 font-bold">[SYS_TOP_{displayLimit}]</span>
        </div>

        <div className="space-y-1 text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-1.5 border border-emerald-900 flex items-center justify-between ${
                d.rank === 1 ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200' : 'bg-black text-emerald-500'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-emerald-400 font-bold">&gt; {d.rank}.</span>
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
  // 10. TOXIC BIOHAZARD NUCLEAR
  // ==============================================================
  if (templateStyle === 'toxic-hazard') {
    return (
      <div
        className={`w-full max-w-sm p-4 bg-black border-2 border-lime-400 text-lime-300 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 25px rgba(132, 204, 22, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-lime-400/50">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-lime-400 animate-spin" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-lime-400 text-black font-black">
            HAZARD {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border flex items-center justify-between ${
                d.rank === 1 ? 'bg-lime-950/80 border-lime-400 text-lime-200 font-bold' : 'bg-black border-lime-900/60 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-lime-400 font-bold">☣ #{d.rank}</span>
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
  // 11. GOTHIC BLOOD MOON NOIR
  // ==============================================================
  if (templateStyle === 'blood-moon') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border border-red-600/70 bg-[#120406] text-red-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 30px rgba(220, 38, 38, 0.3)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-red-900/60">
          <div className="flex items-center gap-2 text-red-500">
            <Moon size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 border border-red-700 text-red-400">
            BLOOD {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg flex items-center justify-between border ${
                d.rank === 1 ? 'bg-red-950/60 border-red-500 text-white font-bold' : 'bg-black/50 border-red-950 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-red-500 font-bold">⚔ #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-red-400 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 12. SOLAR FLARE MOLTEN LAVA
  // ==============================================================
  if (templateStyle === 'solar-flare') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border-2 border-amber-500 bg-[#190902] text-amber-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 25px rgba(245, 158, 11, 0.4)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400">
            <Flame size={16} className="animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 border border-amber-500 text-amber-300">
            LAVA {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-amber-600/30 border-amber-400 text-white font-bold' : 'bg-black/50 border-amber-950 text-amber-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-amber-400 font-bold">🔥 #{d.rank}</span>
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
  // 13. BIOLUMINESCENT DEEP SEA
  // ==============================================================
  if (templateStyle === 'deep-sea') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border-2 border-teal-500/60 bg-[#031317] font-sans ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
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
  // 14. VHS GLITCH & VAPORWAVE
  // ==============================================================
  if (templateStyle === 'glitch-vaporwave') {
    return (
      <div
        className={`w-full max-w-sm p-4 bg-slate-950 border-2 border-cyan-400 relative text-cyan-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '4px 4px 0px #EC4899' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-400/40">
          <div className="flex items-center gap-2">
            <Tv size={16} className="text-pink-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-pink-300">{title}</h4>
          </div>
          <span className="text-[10px] font-mono bg-pink-500 text-black px-1.5 font-bold">VHS-REC</span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border border-cyan-900 flex items-center justify-between ${
                d.rank === 1 ? 'bg-cyan-950/60 border-cyan-400 text-white font-bold' : 'bg-slate-900/50 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
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
  // 15. VINTAGE PARCHMENT & WAX SEAL
  // ==============================================================
  if (templateStyle === 'vintage-classic') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border-2 border-amber-700/80 bg-[#1e1711] text-amber-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "Georgia, serif",
          boxShadow: showBackground ? '0 0 20px rgba(180, 83, 9, 0.3)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-800/60">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono text-amber-400 font-bold">HONOR {displayLimit}</span>
        </div>

        <div className="space-y-1.5 text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded border ${
                d.rank === 1 ? 'bg-amber-900/40 border-amber-600 text-amber-100 font-bold' : 'bg-black/30 border-amber-950 text-amber-300/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-amber-500 font-bold">№ {d.rank}</span>
                  <span className="truncate">{d.name}</span>
                </div>
                <span className="font-mono font-bold text-amber-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 16. MIDNIGHT CELESTIAL STARFIELD
  // ==============================================================
  if (templateStyle === 'celestial-star') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border border-indigo-500/50 bg-[#090b1c] text-indigo-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 25px rgba(99, 102, 241, 0.3)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-800/50">
          <div className="flex items-center gap-2 text-indigo-400">
            <Star size={16} className="fill-indigo-400 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700">
            COSMOS {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-indigo-950/80 border-indigo-400 text-white font-bold' : 'bg-black/40 border-indigo-950 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-indigo-400 font-bold">✦ {d.rank}</span>
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
  // 17. SHONEN ANIME MANGA SPEEDLINE
  // ==============================================================
  if (templateStyle === 'anime-manga') {
    return (
      <div
        className={`w-full max-w-sm p-4 bg-white text-black border-4 border-black ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Permanent Marker', sans-serif",
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

  // ==============================================================
  // 18. SWISS ULTRA-CLEAN MONOCHROME
  // ==============================================================
  if (templateStyle === 'minimal-clean') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border border-slate-700 bg-slate-950 text-white ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Inter', sans-serif",
          boxShadow: showBackground ? '0 10px 25px rgba(0,0,0,0.5)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</h4>
          <span className="text-[10px] font-mono text-slate-400">1 - {displayLimit}</span>
        </div>

        <div className="space-y-1.5 text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg flex items-center justify-between border ${
                d.rank === 1 ? 'border-slate-500 bg-slate-900 font-bold' : 'border-slate-800/80 bg-slate-950/40 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-slate-400">0{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-mono font-bold ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 19. IMPERIAL ROYAL VELVET CROWN
  // ==============================================================
  if (templateStyle === 'royal-crown') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border-2 border-purple-500/70 bg-[#160424] text-purple-100 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 30px rgba(147, 51, 234, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-purple-800/60">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-purple-300 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 border border-purple-600 text-purple-300 font-bold">
            ROYAL {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-purple-900/50 border-purple-400 text-white font-bold' : 'bg-black/40 border-purple-950 text-purple-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-purple-400 font-bold">♔ #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-mono font-bold text-amber-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 20. HIGH ROLLER VIP CASINO EMERALD
  // ==============================================================
  if (templateStyle === 'emerald-casino') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border-2 border-emerald-500 bg-[#041a12] text-emerald-100 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 30px rgba(16, 185, 129, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-emerald-600/40">
          <div className="flex items-center gap-2 text-emerald-400">
            <Coins size={16} className="text-emerald-300" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold">
            CASINO {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-emerald-900/60 border-emerald-400 text-white font-bold' : 'bg-black/50 border-emerald-950 text-emerald-300/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-emerald-400 font-bold">♦ #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-amber-400 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 21. VICTORIAN STEAMPUNK CLOCKWORK
  // ==============================================================
  if (templateStyle === 'steampunk-brass') {
    const col = accentColor || '#B45309';
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border-4 relative overflow-hidden text-amber-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Courier New', monospace",
          background: showBackground ? 'linear-gradient(145deg, #24160c 0%, #150b05 100%)' : 'transparent',
          borderColor: col,
          boxShadow: showBackground ? `0 0 25px ${col}40` : 'none'
        }}
      >
        {animationStyles}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b-2 border-amber-700/60">
          <div className="flex items-center gap-2">
            <Cpu size={16} className={showAnimation ? 'lb-anim-gear text-amber-400' : 'text-amber-400'} />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-100">{title}</h4>
              <span className="text-[9px] uppercase tracking-widest text-amber-400/70">GEAR RATIO: {periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-300 font-bold">
            MK-{displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded border flex items-center justify-between ${
                d.rank === 1 ? 'bg-amber-900/50 border-amber-500 text-amber-100 font-bold' : 'bg-black/50 border-amber-900/40 text-amber-300/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-amber-400 font-bold">⚙ #{d.rank}</span>
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
  // 22. CYBER ANARCHY OVERDRIVE
  // ==============================================================
  if (templateStyle === 'cyber-glitch-anarchy') {
    return (
      <div
        className={`w-full max-w-sm p-4 bg-black border-2 border-rose-500 relative text-rose-300 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Orbitron', sans-serif",
          boxShadow: showBackground ? '0 0 25px rgba(244, 63, 94, 0.4)' : 'none',
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-dashed border-rose-500">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-yellow-400 animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">// {title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-600 text-black font-black uppercase">
            OVERDRIVE
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border flex items-center justify-between ${
                d.rank === 1 ? 'bg-rose-950 border-rose-400 text-white font-bold' : 'bg-neutral-950 border-rose-950 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-yellow-400 font-bold">! {d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-rose-400 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 23. NORDIC POLAR AURORA BOREALIS
  // ==============================================================
  if (templateStyle === 'prismatic-aurora') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border border-teal-400/50 relative overflow-hidden text-teal-100 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground
            ? 'linear-gradient(135deg, rgba(13,148,136,0.3) 0%, rgba(124,58,237,0.3) 100%), #040914'
            : 'transparent',
          boxShadow: showBackground ? '0 0 30px rgba(20, 184, 166, 0.35)' : 'none'
        }}
      >
        {animationStyles}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-teal-500/30">
          <div className="flex items-center gap-2 text-teal-300">
            <Sparkles size={16} className={showAnimation ? 'animate-pulse' : ''} />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-950 border border-teal-500 text-teal-200">
            AURORA {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border backdrop-blur-sm ${
                d.rank === 1 ? 'bg-teal-950/70 border-teal-300 text-white font-bold' : 'bg-slate-950/40 border-teal-900/40 text-teal-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-teal-400 font-bold">✦ {d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-teal-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 24. 16-BIT FANTASY GUILD QUEST
  // ==============================================================
  if (templateStyle === 'pixel-rpg-quest') {
    return (
      <div
        className={`w-full max-w-sm p-4 bg-[#23150c] border-4 border-[#854d0e] text-amber-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Press Start 2P', monospace",
          boxShadow: showBackground ? '6px 6px 0px #3f2206' : 'none'
        }}
      >
        <div className="text-center pb-2 mb-2 border-b-2 border-amber-700">
          <h4 className="text-[10px] font-black uppercase text-amber-300">[ QUEST BOARD ]</h4>
          <span className="text-[8px] text-amber-400/80 uppercase">{title} - TOP {displayLimit}</span>
        </div>

        <div className="space-y-1.5 text-[9px]">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border-2 flex items-center justify-between ${
                d.rank === 1 ? 'border-amber-400 bg-amber-950 text-yellow-300' : 'border-amber-900 bg-black/60 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-yellow-400 font-bold">LV{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-amber-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(0)}G</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 25. NEO-TOKYO CYBER SAMURAI
  // ==============================================================
  if (templateStyle === 'cyber-samurai') {
    return (
      <div
        className={`w-full max-w-sm p-4 bg-[#0d0406] border-2 border-red-500 relative text-red-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Chakra Petch', sans-serif",
          boxShadow: showBackground ? '0 0 25px rgba(239, 68, 68, 0.35)' : 'none',
          clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-red-600/50">
          <div className="flex items-center gap-2">
            <Swords size={16} className="text-red-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">侍 // {title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-red-950 border border-red-500 text-red-300 font-bold">
            RANK {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border flex items-center justify-between ${
                d.rank === 1 ? 'bg-red-950/80 border-red-500 text-white font-bold' : 'bg-black/50 border-red-950 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-red-500 font-bold">壱 #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-red-400 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 26. HYPERDRIVE LASER SYNTHWAVE
  // ==============================================================
  if (templateStyle === 'hyper-neon-synth') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border-2 border-cyan-400 bg-slate-950 text-cyan-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Kanit', sans-serif",
          boxShadow: showBackground ? '0 0 25px rgba(6, 182, 212, 0.4)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/40">
          <div className="flex items-center gap-2 text-cyan-400">
            <Activity size={16} className="animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-300 font-bold">
            SYNTH {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg flex items-center justify-between border ${
                d.rank === 1 ? 'bg-cyan-950/60 border-cyan-400 text-white font-bold' : 'bg-black/50 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-cyan-400 font-bold font-mono">#{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-mono font-bold text-cyan-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 27. STEALTH CARBON GHOST OPS
  // ==============================================================
  if (templateStyle === 'carbon-tactical') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border border-slate-700 bg-[#0c0e12] text-slate-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Chakra Petch', sans-serif",
          boxShadow: showBackground ? '0 10px 25px rgba(0,0,0,0.6)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-lime-400">
            <Crosshair size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-lime-400 font-bold">
            GHOST-{displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg flex items-center justify-between border ${
                d.rank === 1 ? 'bg-slate-900 border-lime-500 text-white font-bold' : 'bg-black/40 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-lime-400 font-bold">[{d.rank}]</span>
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
  // 28. DEEP SPACE SUPERNOVA NEBULA
  // ==============================================================
  if (templateStyle === 'cosmic-nebula') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border border-purple-500/50 bg-[#0c0617] text-purple-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 30px rgba(124, 58, 237, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-900/60">
          <div className="flex items-center gap-2 text-purple-400">
            <Sparkles size={16} className="animate-spin" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 border border-purple-600 text-purple-300">
            NEBULA {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-purple-950/80 border-purple-400 text-white font-bold' : 'bg-black/40 border-purple-950 text-purple-300/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-purple-400 font-bold">✨ #{d.rank}</span>
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
  // 29. DARK OBSIDIAN & ROSE GOLD
  // ==============================================================
  if (templateStyle === 'gothic-cathedral') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border border-rose-400/50 bg-[#12070a] text-rose-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 25px rgba(251, 113, 133, 0.3)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-rose-900/50">
          <div className="flex items-center gap-2 text-rose-400">
            <Award size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300">
            ROSE {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg flex items-center justify-between border ${
                d.rank === 1 ? 'bg-rose-950/60 border-rose-400 text-white font-bold' : 'bg-black/40 border-rose-950 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-rose-400 font-bold">⚜ #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-rose-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 30. LO-FI SUNSET COFFEE SHOP
  // ==============================================================
  if (templateStyle === 'lofi-chill') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border border-orange-400/40 bg-[#180e0c] text-orange-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 25px rgba(251, 146, 60, 0.25)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-orange-800/40">
          <div className="flex items-center gap-2 text-orange-400">
            <Coffee size={16} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-950 border border-orange-600 text-orange-300">
            CHILL {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-orange-950/60 border-orange-400 text-white font-bold' : 'bg-black/30 border-orange-950 text-orange-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-orange-400 font-bold">☕ #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-mono font-bold text-orange-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 31. SUB-ZERO CRYO GLACIER
  // ==============================================================
  if (templateStyle === 'ice-glacier') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border-2 border-cyan-300 bg-[#041118] text-cyan-100 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 30px rgba(6, 182, 212, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/40">
          <div className="flex items-center gap-2 text-cyan-300">
            <Snowflake size={16} className="animate-spin" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-200 font-bold">
            FROST {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-cyan-950/70 border-cyan-300 text-white font-bold' : 'bg-black/40 border-cyan-950 text-cyan-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-cyan-300 font-bold">❄ #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-cyan-200 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 32. QUANTUM 3D HOLOGRAPHIC PROJECTOR
  // ==============================================================
  if (templateStyle === 'quantum-hologram') {
    return (
      <div
        className={`w-full max-w-sm p-4 border-2 border-sky-400 bg-[#030d17] text-sky-200 relative ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Orbitron', sans-serif",
          boxShadow: showBackground ? '0 0 25px rgba(56, 189, 248, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-sky-500/40">
          <div className="flex items-center gap-2 text-sky-400">
            <Radio size={16} className="animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-sky-950 border border-sky-400 text-sky-300 font-bold">
            HOLO-V{displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border flex items-center justify-between ${
                d.rank === 1 ? 'bg-sky-950/70 border-sky-300 text-white font-bold' : 'bg-black/50 border-sky-950 text-sky-300/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-sky-400 font-bold">&lt;{d.rank}&gt;</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-sky-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 33. OLYMPIC CHAMPIONSHIP GOLD
  // ==============================================================
  if (templateStyle === 'championship-podium') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border-2 border-yellow-400 bg-[#161204] text-yellow-100 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 30px rgba(234, 179, 8, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-yellow-600/40">
          <div className="flex items-center gap-2 text-yellow-400">
            <Trophy size={16} className="animate-bounce" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-950 border border-yellow-400 text-yellow-300 font-bold">
            CHAMPION
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-yellow-500/25 border-yellow-400 text-white font-bold' : 'bg-black/50 border-yellow-950 text-yellow-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-yellow-400 font-bold">🏆 #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-yellow-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 34. STREETWEAR URBAN SPRAY TAG
  // ==============================================================
  if (templateStyle === 'graffiti-streetwear') {
    return (
      <div
        className={`w-full max-w-sm p-4 bg-[#140608] border-2 border-rose-500 text-rose-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Permanent Marker', cursive",
          boxShadow: showBackground ? '5px 5px 0px #000' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-rose-600">
          <h4 className="text-sm font-black uppercase tracking-wider text-yellow-400">{title}</h4>
          <span className="text-[10px] font-mono bg-rose-600 text-black px-1.5 font-bold uppercase">STREET</span>
        </div>

        <div className="space-y-1.5 text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 border border-rose-900 flex items-center justify-between ${
                d.rank === 1 ? 'bg-rose-950 border-rose-400 text-yellow-300 font-bold' : 'bg-black/70 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 truncate font-bold">
                <span className="text-rose-400 font-mono">#{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-mono font-bold text-yellow-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 35. ARCANE MAGE SPELLBOOK
  // ==============================================================
  if (templateStyle === 'mystic-arcane') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border-2 border-violet-500 bg-[#100720] text-violet-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 30px rgba(139, 92, 246, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-violet-800/60">
          <div className="flex items-center gap-2 text-violet-400">
            <Wand2 size={16} className="animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-100">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950 border border-violet-600 text-violet-300">
            ARCANE {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg flex items-center justify-between border ${
                d.rank === 1 ? 'bg-violet-950/70 border-violet-400 text-white font-bold' : 'bg-black/40 border-violet-950 text-violet-300/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-violet-400 font-bold">🔮 #{d.rank}</span>
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
  // 36. 90s WINDOWS RETRO DESKTOP
  // ==============================================================
  if (templateStyle === 'vapor-grid-90s') {
    return (
      <div
        className={`w-full max-w-sm p-1.5 bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black text-black ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'VT323', monospace",
          boxShadow: showBackground ? '4px 4px 0px #000' : 'none'
        }}
      >
        <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase">{title}</span>
          </div>
          <div className="flex gap-1">
            <span className="w-3.5 h-3.5 bg-[#c0c0c0] border border-t-white border-l-white border-b-black border-r-black text-[9px] text-black font-bold flex items-center justify-center cursor-pointer">_</span>
            <span className="w-3.5 h-3.5 bg-[#c0c0c0] border border-t-white border-l-white border-b-black border-r-black text-[9px] text-black font-bold flex items-center justify-center cursor-pointer">✕</span>
          </div>
        </div>

        <div className="p-2 bg-white border-2 border-t-black border-l-black border-b-white border-r-white space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-1 flex items-center justify-between ${
                d.rank === 1 ? 'bg-[#000080] text-white font-bold' : 'text-black hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold">[{d.rank}]</span>
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
  // 37. INFERNAL NETHER FLAME
  // ==============================================================
  if (templateStyle === 'infernal-demon') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border-2 border-orange-600 bg-[#160603] text-orange-200 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 30px rgba(234, 88, 12, 0.4)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-orange-800/60">
          <div className="flex items-center gap-2 text-orange-500">
            <Skull size={16} className="animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950 border border-orange-600 text-orange-300 font-bold">
            NETHER {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg flex items-center justify-between border ${
                d.rank === 1 ? 'bg-orange-950/80 border-orange-500 text-white font-bold' : 'bg-black/60 border-orange-950 text-orange-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-orange-500 font-bold">☠ #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-yellow-400 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 38. SWEET CANDY BUBBLEGUM POP
  // ==============================================================
  if (templateStyle === 'bubblegum-pop') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-3xl border-2 border-rose-400 bg-[#200511] text-rose-100 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 25px rgba(244, 63, 94, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-400">
            <Heart size={16} className="fill-rose-400 animate-bounce" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 border border-rose-400 text-rose-300 font-bold">
            POP {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-2xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-rose-500/30 border-rose-400 text-white font-bold' : 'bg-black/40 border-rose-950 text-rose-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-rose-400 font-bold">🍬 #{d.rank}</span>
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
  // 39. AIR FORCE SONAR RADAR
  // ==============================================================
  if (templateStyle === 'military-radar') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-xl border-2 border-emerald-500 bg-[#02130b] text-emerald-300 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Orbitron', sans-serif",
          boxShadow: showBackground ? '0 0 25px rgba(16, 185, 129, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/40">
          <div className="flex items-center gap-2 text-emerald-400">
            <Radio size={16} className="animate-spin" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold">
            SONAR {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded border flex items-center justify-between ${
                d.rank === 1 ? 'bg-emerald-950/80 border-emerald-400 text-white font-bold' : 'bg-black/50 border-emerald-950 text-emerald-300/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-emerald-400 font-bold">📡 [{d.rank}]</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-emerald-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==============================================================
  // 40. ULTRA TIER DIAMOND PRESTIGE
  // ==============================================================
  if (templateStyle === 'diamond-prestige') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl border-2 border-indigo-200/80 bg-[#070b19] text-indigo-100 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          boxShadow: showBackground ? '0 0 35px rgba(224, 231, 255, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-indigo-300/30">
          <div className="flex items-center gap-2 text-indigo-200">
            <Gem size={16} className="animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-300 text-indigo-100 font-bold">
            DIAMOND {displayLimit}
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          {donorsToRender.map((d, i) => (
            <div
              key={i}
              className={`p-2 rounded-xl flex items-center justify-between border ${
                d.rank === 1 ? 'bg-indigo-950/80 border-indigo-200 text-white font-bold shadow-[0_0_15px_rgba(224,231,255,0.25)]' : 'bg-black/40 border-indigo-950 text-indigo-200/80'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-indigo-300 font-bold">💎 #{d.rank}</span>
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-bold text-amber-300 ml-2 flex-shrink-0">${Number(d.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default fallback if unknown template
  return (
    <div
      className={`p-4 bg-slate-900 border border-slate-800 rounded-xl text-white ${className}`}
      style={{ fontFamily: resolvedFontFamily }}
    >
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
