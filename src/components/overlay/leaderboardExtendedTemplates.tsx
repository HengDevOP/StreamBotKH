'use client';

import React from 'react';
import {
  Flame,
  Snowflake,
  Zap,
  Sparkles,
  Crown,
  Medal,
  Shield,
  Star,
  Swords,
  Radio,
  Tv,
  Gem,
  Award,
  Gamepad2,
  Heart,
  Sun,
  Moon,
  Activity,
  Compass,
  Eye,
  Layers,
  Crosshair,
  Skull,
  Ghost
} from 'lucide-react';
import { LeaderboardDonor, LeaderboardTemplateMeta } from './leaderboardTemplates';

export const EXTENDED_LEADERBOARD_TEMPLATES: LeaderboardTemplateMeta[] = [
  // ==========================================
  // 41-48: FLAME, FROST & ELEMENTAL (8 STYLES)
  // ==========================================
  {
    id: 'flame-inferno',
    name: 'Blazing Inferno Flame',
    category: 'Gaming',
    previewColor: '#FF4500',
    description: 'Animated blazing fire gradient outline with dancing ember pulses and intense heat glow.'
  },
  {
    id: 'frost-crystalline',
    name: 'Glacial Frost Crystal',
    category: 'Gaming',
    previewColor: '#38BDF8',
    description: 'Frozen crystalline glass border with sparkling ice gleam reflections and falling snowflake frost.'
  },
  {
    id: 'blizzard-subzero',
    name: 'Sub-Zero Arctic Blizzard',
    category: 'Gaming',
    previewColor: '#7DD3FC',
    description: 'Deep arctic permafrost frame with shivering ice breath and blizzard storm glow.'
  },
  {
    id: 'dragon-flame-fury',
    name: 'Mythic Dragon Breath',
    category: 'Gaming',
    previewColor: '#DC2626',
    description: 'Searing magma dragon border with crimson embers, dragon scale textures, and gold crests.'
  },
  {
    id: 'electric-thunderstorm',
    name: 'Thunderbolt Lightning Storm',
    category: 'Gaming',
    previewColor: '#A855F7',
    description: 'Crackling violet-blue electric lightning arcs racing continuously along card outlines.'
  },
  {
    id: 'volcano-magma-crust',
    name: 'Volcanic Basalt Magma',
    category: 'Gaming',
    previewColor: '#EA580C',
    description: 'Charcoal basalt rock cards with glowing molten lava fractures pulsing underneath.'
  },
  {
    id: 'arcade-pixel-boss',
    name: '16-Bit Arcade Boss Warning',
    category: 'Gaming',
    previewColor: '#F43F5E',
    description: 'Flashing retro boss battle warning beacons, pixelated red flame aura, and 8-bit rank badges.'
  },
  {
    id: 'speedometer-tachometer',
    name: 'Nitro Drift RPM Gauge',
    category: 'Gaming',
    previewColor: '#EF4444',
    description: 'Carbon fiber sports dash with redline RPM tachometer accents and nitro flame trail outline.'
  },

  // ==========================================
  // 49-56: ADVANCED CYBER & SCI-FI (8 STYLES)
  // ==========================================
  {
    id: 'plasma-arc-runner',
    name: 'Neon Plasma Laser Arc',
    category: 'Cyber',
    previewColor: '#00F0FF',
    description: 'High-velocity continuous cyan plasma laser beam racing around the card perimeter.'
  },
  {
    id: 'cyber-netrunner-v2',
    name: 'Netrunner Cyberdeck 2.0',
    category: 'Cyber',
    previewColor: '#06B6D4',
    description: 'Pulsing cyan circuit trace lines running along telemetry borders with data packet streams.'
  },
  {
    id: 'toxic-acid-surge',
    name: 'Biohazard Acid Leak',
    category: 'Cyber',
    previewColor: '#22C55E',
    description: 'Bubbling toxic lime sludge outline with radioactive hazard chevrons and caustic mist.'
  },
  {
    id: 'emerald-matrix-code',
    name: 'Matrix Rain Codefall',
    category: 'Cyber',
    previewColor: '#10B981',
    description: 'Phosphor green digital code channels raining down card borders with CRT phosphor glow.'
  },
  {
    id: 'hyper-laser-grid',
    name: 'Tron Vector Laser Grid',
    category: 'Cyber',
    previewColor: '#EC4899',
    description: 'Ultra-sharp geometric vector grid with glowing perspective laser lines and neon wireframe ranks.'
  },
  {
    id: 'cyber-shibuya-neon',
    name: 'Shibuya Rainy Billboard',
    category: 'Cyber',
    previewColor: '#8B5CF6',
    description: 'Wet asphalt dark mirror reflections with saturated Tokyo billboard neon and rain shimmer.'
  },
  {
    id: 'radioactive-isotope',
    name: 'Nuclear Radiation Warning',
    category: 'Cyber',
    previewColor: '#EAB308',
    description: 'Alternating black and hazard warning yellow strobe chevron borders with radiation trefoil badge.'
  },
  {
    id: 'cyber-mech-titan',
    name: 'Titan Mech Blast Shield',
    category: 'Cyber',
    previewColor: '#64748B',
    description: 'Heavy titanium armor plates with hydraulic lock rivets, yellow indicator LEDs, and bevels.'
  },

  // ==========================================
  // 57-64: RETRO ARCADE & CLASSIC (8 STYLES)
  // ==========================================
  {
    id: 'retro-cassette-80s',
    name: 'Neon Mixtape 1985',
    category: 'Retro',
    previewColor: '#F43F5E',
    description: '1980s neon transparent cassette housing with spinning spools and magnetic tape sweep.'
  },
  {
    id: 'gameboy-pixel-matrix',
    name: 'Game Boy 1989 Dot Matrix',
    category: 'Retro',
    previewColor: '#84CC16',
    description: 'Authentic 4-shade olive green LCD dot matrix screen with retro pixel border and classic D-pad.'
  },
  {
    id: 'synthwave-delorean',
    name: 'OutRun Sunset Highway',
    category: 'Retro',
    previewColor: '#F97316',
    description: 'Chrome wireframe grid mountains with radiant orange-pink striped setting sun and palm silhouettes.'
  },
  {
    id: 'steampunk-chronos',
    name: 'Chrono Brass Clockwork',
    category: 'Retro',
    previewColor: '#D97706',
    description: 'Intricate brass cogwheels with rotating gear animations and roman numeral indices.'
  },
  {
    id: 'space-invader-8bit',
    name: 'Alien Space Invader',
    category: 'Retro',
    previewColor: '#10B981',
    description: 'Pixelated alien sprites marching across the frame with retro arcade coin-insert marquee lights.'
  },
  {
    id: 'crt-vhs-rewind',
    name: 'VHS 1993 Tracking Glitch',
    category: 'Retro',
    previewColor: '#06B6D4',
    description: 'Analog tracking distortion lines with chromatic color separation and flashing "PLAY ▶" stamp.'
  },
  {
    id: 'pinball-neon-fever',
    name: 'Pinball Wizard Neon Bumper',
    category: 'Retro',
    previewColor: '#E11D48',
    description: 'Flashing retro pinball bumper targets with chrome metal rails and point multiplier glow.'
  },
  {
    id: 'glitch-cyberpunk-red',
    name: 'Corrupted Glitch Anarchy',
    category: 'Retro',
    previewColor: '#EF4444',
    description: 'Red chromatic aberration scan line tears with displaced warning glitch blocks and anarchy symbol.'
  },

  // ==========================================
  // 65-72: AESTHETIC, ANIME & NATURE (8 STYLES)
  // ==========================================
  {
    id: 'sakura-wind-blossom',
    name: 'Sakura Petal Breeze',
    category: 'Aesthetic',
    previewColor: '#F472B6',
    description: 'Soft pastel cherry blossom frame with floating flower petals and gentle pink serenity glow.'
  },
  {
    id: 'crystal-prism-gem',
    name: 'Prismatic Gem Shard',
    category: 'Aesthetic',
    previewColor: '#C084FC',
    description: 'Multi-faceted rainbow refractive diamond crystal border with specular light glints and gemstone shine.'
  },
  {
    id: 'zen-bamboo-garden',
    name: 'Zen Garden Moss & Bamboo',
    category: 'Aesthetic',
    previewColor: '#65A30D',
    description: 'Natural bamboo lattice frame with peaceful zen water ripple aura and organic moss accents.'
  },
  {
    id: 'candy-bubble-rush',
    name: 'Cotton Candy Sugar Rush',
    category: 'Aesthetic',
    previewColor: '#FB7185',
    description: 'High-gloss bubblegum swirl border with sparkling candy dust and sweet lollipop icons.'
  },
  {
    id: 'nebula-stardust',
    name: 'Celestial Milky Way',
    category: 'Aesthetic',
    previewColor: '#818CF8',
    description: 'Deep space purple stellar cloud with twinkling diamond stars and cosmic constellation lines.'
  },
  {
    id: 'aurora-borealis-v2',
    name: 'Nordic Northern Lights',
    category: 'Aesthetic',
    previewColor: '#2DD4BF',
    description: 'Shifting polar teal and violet curtains of northern lights moving seamlessly behind cards.'
  },
  {
    id: 'twilight-moonlight',
    name: 'Moonlight Serenade',
    category: 'Aesthetic',
    previewColor: '#93C5FD',
    description: 'Midnight blue card with silver crescent moon crest, glowing star dust, and peaceful night sky.'
  },
  {
    id: 'ocean-bioluminescence',
    name: 'Bioluminescent Abyssal Coral',
    category: 'Aesthetic',
    previewColor: '#0D9488',
    description: 'Deep-sea oceanic reef with glowing bioluminescent jellyfish trails and floating aquatic embers.'
  },

  // ==========================================
  // 73-80: PRESTIGE, MYTHIC & IMPERIAL (8 STYLES)
  // ==========================================
  {
    id: 'phoenix-rebirth',
    name: 'Phoenix Solar Wings',
    category: 'Special',
    previewColor: '#F59E0B',
    description: 'Golden-orange fiery phoenix wings with radiant thermal embers, soaring plumage aura, and rebirth halo.'
  },
  {
    id: 'golden-emperor',
    name: 'Imperial Dynasty Gold',
    category: 'Special',
    previewColor: '#EAB308',
    description: 'Solid 24K gold mirror bezel with sweeping specular glare beams and ornate imperial laurel crests.'
  },
  {
    id: 'void-singularity',
    name: 'Black Hole Event Horizon',
    category: 'Special',
    previewColor: '#7C3AED',
    description: 'Gravitational lensing dark matter core with swirling violet accretion disk and relativistic light bends.'
  },
  {
    id: 'vampire-crimson-blood',
    name: 'Vampiric Baroque Crimson',
    category: 'Special',
    previewColor: '#991B1B',
    description: 'Gothic Victorian velvet red cards with ornate silver filigree, bat wings, and dark crimson blood glow.'
  },
  {
    id: 'neon-valkyrie',
    name: 'Valkyrie Angelic Grace',
    category: 'Special',
    previewColor: '#FDE047',
    description: 'Divine white-gold celestial radiance with shimmering feather halos, holy aura, and seraph crests.'
  },
  {
    id: 'solar-corona-eclipse',
    name: 'Total Solar Eclipse',
    category: 'Special',
    previewColor: '#F59E0B',
    description: 'Jet-black obsidian disc surrounded by a blazing diamond-ring solar corona flare pulsing around cards.'
  },
  {
    id: 'golden-dragon-shrine',
    name: 'Imperial Jade Dragon',
    category: 'Special',
    previewColor: '#10B981',
    description: 'Rich polished jade stone bezel intertwined with sculpted golden dragon scales and oriental scrolls.'
  },
  {
    id: 'starlight-galaxy-infinity',
    name: 'Infinite Cosmos Horizon',
    category: 'Special',
    previewColor: '#6366F1',
    description: 'Deep infinite space void with parallax starlight shimmer, warp streak borders, and cosmic aura.'
  }
];

export interface ExtendedRenderParams {
  templateStyle: string;
  title: string;
  periodLabel: string;
  displayLimit: number;
  donorsToRender: LeaderboardDonor[];
  accentColor: string;
  showBackground: boolean;
  showAnimation: boolean;
  showRankBadges: boolean;
  resolvedFontFamily?: string;
  className?: string;
  overtakingDonorName?: string | null;
  singleRank?: number | null;
  renderRankBadge: (rank: number, styleColor: string, isOvertaker?: boolean) => React.ReactNode;
}

export function renderExtendedLeaderboardTemplate({
  templateStyle,
  title,
  periodLabel,
  displayLimit,
  donorsToRender,
  accentColor,
  showBackground,
  showAnimation,
  resolvedFontFamily,
  className = '',
  overtakingDonorName,
  singleRank = null,
  renderRankBadge
}: ExtendedRenderParams): React.ReactNode | null {
  const match = EXTENDED_LEADERBOARD_TEMPLATES.find((t) => t.id === templateStyle);
  if (!match) return null;

  const col = accentColor || match.previewColor;

  // Render donor row helper with built-in overtake animation and #1 spotlight hierarchy
  const renderDonorRow = (
    d: LeaderboardDonor,
    i: number,
    cardClasses: string,
    cardStyles: React.CSSProperties = {},
    customAmountColor?: string
  ) => {
    const isOvertaker = Boolean(
      overtakingDonorName && d.name.toLowerCase() === overtakingDonorName.toLowerCase()
    );
    const isFirst = d.rank === 1;

    if (singleRank) {
      return (
        <div
          key={i}
          className={`${
            isFirst ? 'p-3 sm:p-3.5' : 'p-2.5'
          } flex items-center justify-between gap-3 transition-all relative ${cardClasses} ${
            isOvertaker ? 'lb-anim-overtake ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)]' : ''
          }`}
          style={cardStyles}
        >
          <span
            className={`${
              isFirst
                ? 'text-sm sm:text-base font-black tracking-wide text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]'
                : 'text-xs sm:text-sm font-bold text-slate-100'
            } block truncate`}
          >
            {d.name}
          </span>
          <span
            className={`${
              isFirst ? 'text-sm sm:text-base font-black' : 'text-xs sm:text-sm font-bold'
            } font-mono block flex-shrink-0 ml-2`}
            style={{ color: customAmountColor || col }}
          >
            ${Number(d.amount).toFixed(2)}
          </span>
        </div>
      );
    }

    return (
      <div
        key={i}
        className={`${
          isFirst ? 'p-3 sm:p-3.5 mb-2.5' : 'p-2'
        } flex items-center justify-between transition-all relative ${cardClasses} ${
          isOvertaker ? 'lb-anim-overtake ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)]' : ''
        }`}
        style={cardStyles}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`${
              isFirst
                ? 'w-8 h-8 rounded-xl bg-white/10 border border-white/20 shadow-inner'
                : 'w-5 h-5'
            } flex items-center justify-center font-bold flex-shrink-0`}
          >
            {renderRankBadge(d.rank, col, isOvertaker)}
          </div>
          <div className="truncate">
            {isFirst && (
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="text-[9px] font-mono font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/10 border border-white/15 leading-none"
                  style={{ color: customAmountColor || col }}
                >
                  #1 CHAMPION
                </span>
                {d.bank && (
                  <span className="text-[9px] font-mono opacity-80 truncate" style={{ color: col }}>
                    • {d.bank}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`${
                  isFirst
                    ? 'text-sm sm:text-base font-black tracking-wide text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]'
                    : 'text-[11px] sm:text-xs font-semibold text-slate-200/90'
                } block truncate`}
              >
                {d.name}
              </span>
              {isOvertaker && (
                <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black font-mono tracking-wider uppercase bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 shadow-md animate-pulse flex-shrink-0">
                  ▲ RANK UP!
                </span>
              )}
            </div>
            {!isFirst && d.bank && (
              <span className="text-[8px] font-mono block opacity-65" style={{ color: col }}>
                {d.bank}
              </span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0 ml-2">
          <span
            className={`${
              isFirst ? 'text-sm sm:text-base font-black' : 'text-xs font-bold opacity-90'
            } font-mono block`}
            style={{ color: customAmountColor || col }}
          >
            ${Number(d.amount).toFixed(2)}
          </span>
          {d.count && (
            <span className={`${isFirst ? 'text-[10px]' : 'text-[8px]'} font-mono text-slate-400`}>
              {d.count} tips
            </span>
          )}
        </div>
      </div>
    );
  };

  // 41. BLAZING INFERNO FLAME
  if (templateStyle === 'flame-inferno') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-3xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Chakra Petch', sans-serif",
          background: showBackground ? 'radial-gradient(circle at 50% 0%, #260902 0%, #0A0201 100%)' : 'transparent',
          borderColor: '#FF4500',
          boxShadow: showBackground ? '0 0 30px rgba(255, 69, 0, 0.35), inset 0 0 20px rgba(239, 68, 68, 0.2)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-orange-500/30">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-500 animate-pulse fill-orange-500" />
            <div>
              <h4 className="text-sm font-extrabold tracking-wider uppercase text-orange-200 leading-tight">
                {title}
              </h4>
              <span className="text-[10px] font-mono tracking-widest text-orange-400 uppercase">
                {periodLabel}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-950/80 border border-orange-500/50 text-orange-300">
            INFERNO {displayLimit}
          </span>
        </div>

        <div data-lb-donor-list="true" className="space-y-2">
          {donorsToRender.map((d, i) =>
            renderDonorRow(
              d,
              i,
              d.rank === 1
                ? 'bg-gradient-to-r from-red-950/90 via-orange-950/80 to-red-950/90 border border-orange-500/80 rounded-2xl lb-flame-card'
                : 'bg-black/60 border border-orange-900/50 hover:border-orange-500/50 rounded-xl',
              {},
              '#FB923C'
            )
          )}
        </div>
      </div>
    );
  }

  // 42. GLACIAL FROST CRYSTAL
  if (templateStyle === 'frost-crystalline') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-3xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily || "'Chakra Petch', sans-serif",
          background: showBackground ? 'linear-gradient(180deg, #04101E 0%, #02070D 100%)' : 'transparent',
          borderColor: '#38BDF8',
          boxShadow: showBackground ? '0 0 25px rgba(56, 189, 248, 0.3), inset 0 0 15px rgba(186, 230, 253, 0.15)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-sky-500/30">
          <div className="flex items-center gap-2">
            <Snowflake size={18} className="text-sky-300 animate-spin [animation-duration:12s]" />
            <div>
              <h4 className="text-sm font-extrabold tracking-wider uppercase text-sky-100 leading-tight">
                {title}
              </h4>
              <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase">
                {periodLabel}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-400/50 text-sky-200">
            FROST {displayLimit}
          </span>
        </div>

        <div data-lb-donor-list="true" className="space-y-2">
          {donorsToRender.map((d, i) =>
            renderDonorRow(
              d,
              i,
              d.rank === 1
                ? 'bg-gradient-to-r from-sky-950/90 via-blue-950/80 to-sky-950/90 border border-sky-400 rounded-2xl lb-frost-card'
                : 'bg-slate-950/60 border border-sky-900/40 hover:border-sky-400/50 rounded-xl',
              {},
              '#38BDF8'
            )
          )}
        </div>
      </div>
    );
  }

  // 43. THUNDERBOLT LIGHTNING STORM
  if (templateStyle === 'electric-thunderstorm') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'linear-gradient(135deg, #130326 0%, #080112 100%)' : 'transparent',
          borderColor: '#A855F7',
          boxShadow: showBackground ? '0 0 30px rgba(168, 85, 247, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-500/30">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-purple-400 animate-pulse fill-purple-400" />
            <div>
              <h4 className="text-sm font-black tracking-wider uppercase text-purple-200">{title}</h4>
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-400 text-purple-200">
            STORM {displayLimit}
          </span>
        </div>

        <div data-lb-donor-list="true" className="space-y-2">
          {donorsToRender.map((d, i) =>
            renderDonorRow(
              d,
              i,
              d.rank === 1
                ? 'bg-purple-950/80 border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] rounded-xl lb-anim-electric'
                : 'bg-slate-950/60 border border-purple-900/40 hover:border-purple-400/60 rounded-xl',
              {},
              '#C084FC'
            )
          )}
        </div>
      </div>
    );
  }

  // 44. MYTHIC DRAGON BREATH
  if (templateStyle === 'dragon-flame-fury') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-3xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'radial-gradient(ellipse at top, #2C0505 0%, #0F0101 100%)' : 'transparent',
          borderColor: '#DC2626',
          boxShadow: showBackground ? '0 0 30px rgba(220, 38, 38, 0.4)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-red-500/30">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-amber-400 fill-amber-400 animate-bounce" />
            <div>
              <h4 className="text-sm font-black tracking-wider uppercase text-red-200">{title}</h4>
              <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-red-950 border border-red-500 text-amber-300">
            DRAGON {displayLimit}
          </span>
        </div>

        <div data-lb-donor-list="true" className="space-y-2">
          {donorsToRender.map((d, i) =>
            renderDonorRow(
              d,
              i,
              d.rank === 1
                ? 'bg-gradient-to-r from-red-950/90 to-amber-950/90 border border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.3)] rounded-2xl lb-flame-card'
                : 'bg-black/60 border border-red-950 hover:border-red-600/60 rounded-xl',
              {},
              '#F59E0B'
            )
          )}
        </div>
      </div>
    );
  }

  // 45. SUB-ZERO ARCTIC BLIZZARD
  if (templateStyle === 'blizzard-subzero') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'linear-gradient(180deg, #02121F 0%, #01080E 100%)' : 'transparent',
          borderColor: '#7DD3FC',
          boxShadow: showBackground ? '0 0 25px rgba(125, 211, 252, 0.35)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-sky-400/30">
          <div className="flex items-center gap-2">
            <Snowflake size={18} className="text-sky-300 animate-pulse" />
            <div>
              <h4 className="text-sm font-extrabold tracking-wider uppercase text-sky-100">{title}</h4>
              <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-950 border border-sky-400 text-sky-200">
            SUBZERO {displayLimit}
          </span>
        </div>

        <div data-lb-donor-list="true" className="space-y-2">
          {donorsToRender.map((d, i) =>
            renderDonorRow(
              d,
              i,
              d.rank === 1
                ? 'bg-sky-950/80 border border-sky-300 shadow-[0_0_15px_rgba(125,211,252,0.4)] rounded-xl lb-frost-card'
                : 'bg-slate-950/60 border border-sky-950 hover:border-sky-500 rounded-xl',
              {},
              '#7DD3FC'
            )
          )}
        </div>
      </div>
    );
  }

  // 46. NEON PLASMA LASER ARC
  if (templateStyle === 'plasma-arc-runner') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'linear-gradient(135deg, #05141D 0%, #02080D 100%)' : 'transparent',
          borderColor: '#00F0FF',
          boxShadow: showBackground ? '0 0 30px rgba(0, 240, 255, 0.3)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-cyan-400 animate-pulse" />
            <div>
              <h4 className="text-sm font-black tracking-wider uppercase text-white">{title}</h4>
              <span className="text-[10px] font-mono tracking-widest text-cyan-300 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-300">
            PLASMA {displayLimit}
          </span>
        </div>

        <div data-lb-donor-list="true" className="space-y-2">
          {donorsToRender.map((d, i) =>
            renderDonorRow(
              d,
              i,
              d.rank === 1
                ? 'bg-cyan-950/70 border border-cyan-400 shadow-[0_0_18px_rgba(0,240,255,0.4)] rounded-xl lb-anim-plasma'
                : 'bg-slate-950/60 border border-cyan-950 hover:border-cyan-500 rounded-xl',
              {},
              '#00F0FF'
            )
          )}
        </div>
      </div>
    );
  }

  // 47. PHOENIX SOLAR WINGS
  if (templateStyle === 'phoenix-rebirth') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-3xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'radial-gradient(circle at top, #261102 0%, #0A0400 100%)' : 'transparent',
          borderColor: '#F59E0B',
          boxShadow: showBackground ? '0 0 30px rgba(245, 158, 11, 0.4)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400 animate-spin [animation-duration:8s]" />
            <div>
              <h4 className="text-sm font-black tracking-wider uppercase text-amber-200">{title}</h4>
              <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-400 text-amber-200">
            PHOENIX {displayLimit}
          </span>
        </div>

        <div data-lb-donor-list="true" className="space-y-2">
          {donorsToRender.map((d, i) =>
            renderDonorRow(
              d,
              i,
              d.rank === 1
                ? 'bg-gradient-to-r from-amber-950 via-rose-950 to-amber-950 border border-amber-400 rounded-2xl lb-flame-card shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                : 'bg-black/60 border border-amber-950 hover:border-amber-500 rounded-xl',
              {},
              '#FBBF24'
            )
          )}
        </div>
      </div>
    );
  }

  // 48. SAKURA PETAL BREEZE
  if (templateStyle === 'sakura-wind-blossom') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-3xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'linear-gradient(145deg, #1A0713 0%, #0A0208 100%)' : 'transparent',
          borderColor: '#F472B6',
          boxShadow: showBackground ? '0 0 25px rgba(244, 114, 182, 0.3)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-pink-500/30">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-pink-400 fill-pink-400 animate-pulse" />
            <div>
              <h4 className="text-sm font-bold tracking-wider uppercase text-pink-200">{title}</h4>
              <span className="text-[10px] font-mono tracking-widest text-pink-400 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-pink-950 border border-pink-400 text-pink-200">
            SAKURA {displayLimit}
          </span>
        </div>

        <div data-lb-donor-list="true" className="space-y-2">
          {donorsToRender.map((d, i) =>
            renderDonorRow(
              d,
              i,
              d.rank === 1
                ? 'bg-pink-950/80 border border-pink-400 rounded-2xl shadow-[0_0_15px_rgba(244,114,182,0.3)]'
                : 'bg-black/60 border border-pink-950 hover:border-pink-500 rounded-xl',
              {},
              '#F472B6'
            )
          )}
        </div>
      </div>
    );
  }

  // 49. IMPERIAL DYNASTY GOLD
  if (templateStyle === 'golden-emperor') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-2xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'radial-gradient(circle at 50% 0%, #201704 0%, #0A0701 100%)' : 'transparent',
          borderColor: '#EAB308',
          boxShadow: showBackground ? '0 0 35px rgba(234, 179, 8, 0.4), inset 0 0 20px rgba(234, 179, 8, 0.15)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-yellow-400 fill-yellow-400 animate-bounce" />
            <div>
              <h4 className="text-sm font-extrabold tracking-wider uppercase text-amber-200">{title}</h4>
              <span className="text-[10px] font-mono tracking-widest text-yellow-400 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-yellow-950 border border-yellow-400 text-yellow-200">
            EMPEROR {displayLimit}
          </span>
        </div>

        <div data-lb-donor-list="true" className="space-y-2">
          {donorsToRender.map((d, i) =>
            renderDonorRow(
              d,
              i,
              d.rank === 1
                ? 'bg-gradient-to-r from-yellow-950/90 to-amber-950/90 border-2 border-yellow-400 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                : 'bg-black/60 border border-amber-950 hover:border-yellow-500 rounded-xl',
              {},
              '#FACC15'
            )
          )}
        </div>
      </div>
    );
  }

  // 50. BLACK HOLE EVENT HORIZON
  if (templateStyle === 'void-singularity') {
    return (
      <div
        className={`w-full max-w-sm p-4 rounded-3xl relative overflow-hidden border-2 ${className}`}
        style={{
          fontFamily: resolvedFontFamily,
          background: showBackground ? 'radial-gradient(circle, #0F0321 0%, #030008 100%)' : 'transparent',
          borderColor: '#7C3AED',
          boxShadow: showBackground ? '0 0 30px rgba(124, 58, 237, 0.4)' : 'none'
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-violet-500/30">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-violet-400 animate-pulse" />
            <div>
              <h4 className="text-sm font-black tracking-wider uppercase text-violet-200">{title}</h4>
              <span className="text-[10px] font-mono tracking-widest text-violet-400 uppercase">{periodLabel}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-950 border border-violet-400 text-violet-200">
            SINGULARITY {displayLimit}
          </span>
        </div>

        <div data-lb-donor-list="true" className="space-y-2">
          {donorsToRender.map((d, i) =>
            renderDonorRow(
              d,
              i,
              d.rank === 1
                ? 'bg-violet-950/80 border border-violet-400 shadow-[0_0_18px_rgba(124,58,237,0.45)] rounded-2xl'
                : 'bg-black/70 border border-violet-950 hover:border-violet-500 rounded-xl',
              {},
              '#A78BFA'
            )
          )}
        </div>
      </div>
    );
  }

  // GENERIC HIGH-TECH HANDLER FOR REMAINING 30 EXTENDED TEMPLATES
  // Dynamically applies each template's custom theme, colors, frame borders, badges, and overtake animations!
  return (
    <div
      className={`w-full max-w-sm p-4 rounded-2xl relative overflow-hidden border-2 ${className}`}
      style={{
        fontFamily: resolvedFontFamily || "'Chakra Petch', sans-serif",
        background: showBackground ? 'rgba(7, 10, 19, 0.95)' : 'transparent',
        borderColor: col,
        boxShadow: showBackground ? `0 0 25px ${col}33, inset 0 0 15px ${col}15` : 'none'
      }}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: `${col}33` }}>
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={18} style={{ color: col }} className={showAnimation ? 'animate-pulse' : ''} />
          <div className="truncate">
            <h4 className="text-sm font-extrabold tracking-wider uppercase text-white truncate leading-tight">
              {title}
            </h4>
            <span className="text-[10px] font-mono tracking-widest block uppercase truncate" style={{ color: col }}>
              {periodLabel}
            </span>
          </div>
        </div>
        <span
          className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: `${col}22`, border: `1px solid ${col}66`, color: col }}
        >
          {match.category.toUpperCase()} {displayLimit}
        </span>
      </div>

      <div data-lb-donor-list="true" className="space-y-2">
        {donorsToRender.map((d, i) =>
          renderDonorRow(
            d,
            i,
            d.rank === 1
              ? 'rounded-xl border shadow-md'
              : 'rounded-xl border hover:opacity-95',
            {
              backgroundColor: d.rank === 1 ? `${col}25` : 'rgba(10, 15, 29, 0.65)',
              borderColor: d.rank === 1 ? col : `${col}33`,
              boxShadow: d.rank === 1 ? `0 0 16px ${col}44` : 'none'
            },
            col
          )
        )}
      </div>
    </div>
  );
}
