'use client';

import React from 'react';
import {
  Timer,
  Sparkles
} from 'lucide-react';

export interface TimerTemplateMeta {
  id: string;
  name: string;
  category: 'Cyber' | 'Gaming' | 'Retro' | 'Aesthetic' | 'Minimal' | 'Special';
  previewColor: string;
  description: string;
}

export const TIMER_TEMPLATES: TimerTemplateMeta[] = [
  // ==========================================
  // CYBER (8 TEMPLATES)
  // ==========================================
  {
    id: 'cyber-neon',
    name: 'Cyberpunk Electric Neon',
    category: 'Cyber',
    previewColor: '#00F0FF',
    description: 'Cut-corner polygon HUD frame with electric cyan laser pulse, neon hazard ticks, and digital glow.'
  },
  {
    id: 'mecha-hud',
    name: 'Mecha Tactical Telemetry',
    category: 'Cyber',
    previewColor: '#F97316',
    description: 'Sci-fi military orange HUD with target crosshairs, telemetry bevels, and radar scanlines.'
  },
  {
    id: 'matrix-terminal',
    name: 'Matrix CRT Terminal',
    category: 'Cyber',
    previewColor: '#10B981',
    description: 'Pure black terminal with phosphor green glow, scanline raster sweep, and command line prompt.'
  },
  {
    id: 'holo-scifi',
    name: 'Holographic Cyber HUD',
    category: 'Cyber',
    previewColor: '#38BDF8',
    description: 'Floating angled holographic glass with chromatic aberration edges and glowing digit pods.'
  },
  {
    id: 'glitch-cyber',
    name: 'Glitch Overdrive Cyber',
    category: 'Cyber',
    previewColor: '#EC4899',
    description: 'Corrupted cyberpunk glitch distortion with cyan and magenta chromatic split and warning chevrons.'
  },
  {
    id: 'quantum-core',
    name: 'Quantum Reactor Core',
    category: 'Cyber',
    previewColor: '#2563EB',
    description: 'Sci-Fi plasma reactor containment core with concentric energy rings and cobalt blue radioactive aura.'
  },
  {
    id: 'cyber-samurai',
    name: 'Cyber Samurai Ronin',
    category: 'Cyber',
    previewColor: '#E11D48',
    description: 'Neo-Tokyo ronin katana aesthetic with sharp obsidian razor angles, crimson accents, and kanji header.'
  },
  {
    id: 'emerald-circuit',
    name: 'PCB Emerald Circuit',
    category: 'Cyber',
    previewColor: '#059669',
    description: 'Printed motherboard circuit board with golden metallic traces, silicon chip pins, and emerald solder mask.'
  },

  // ==========================================
  // GAMING (8 TEMPLATES)
  // ==========================================
  {
    id: 'chroma-rgb',
    name: 'Chroma RGB Gaming',
    category: 'Gaming',
    previewColor: '#10B981',
    description: 'High-energy 360-degree flowing rainbow spectrum border with dark esports carbon interior.'
  },
  {
    id: 'blood-moon',
    name: 'Gothic Blood Moon',
    category: 'Gaming',
    previewColor: '#DC2626',
    description: 'Dark crimson gothic noir with pulsing soulslike boss countdown heartbeat and red blood aura.'
  },
  {
    id: 'carbon-tactical',
    name: 'Carbon Tactical Esports',
    category: 'Gaming',
    previewColor: '#84CC16',
    description: 'Woven carbon twill chassis with electric lime accents and race-day tachometer digital readout.'
  },
  {
    id: 'arcade-fighter',
    name: 'Arcade VS Fight Timer',
    category: 'Gaming',
    previewColor: '#EF4444',
    description: 'Fighting game round countdown (K.O. style) with chunky beveled gold/red frame and battle badge.'
  },
  {
    id: 'speedometer-tach',
    name: 'Need For Speed Tachometer',
    category: 'Gaming',
    previewColor: '#F43F5E',
    description: 'Motorsport racing dashboard with redline RPM rev-limiter tick marks and carbon instrument cluster.'
  },
  {
    id: 'radioactive-hazard',
    name: 'Toxic Biohazard Bunker',
    category: 'Gaming',
    previewColor: '#F59E0B',
    description: 'Industrial fallout shelter caution barrier with diagonal black and yellow stripes and biohazard warning badge.'
  },
  {
    id: 'cyber-police',
    name: 'Night City Enforcer',
    category: 'Gaming',
    previewColor: '#3B82F6',
    description: 'Police cruiser emergency interceptor with alternating flashing blue and red tactical strobe beacon bars.'
  },
  {
    id: 'vampire-curse',
    name: 'Crimson Blood Vial',
    category: 'Gaming',
    previewColor: '#9333EA',
    description: 'Dark gothic vampire cathedral with baroque filigree, dark amethyst crystal, and liquid blood vial glow.'
  },

  // ==========================================
  // RETRO (8 TEMPLATES)
  // ==========================================
  {
    id: 'retro-8bit',
    name: 'Retro 8-Bit Pixel Arcade',
    category: 'Retro',
    previewColor: '#FBBF24',
    description: 'Chunky 4px pixelated borders, hard black 6px drop-shadows, and arcade yellow stepped digits.'
  },
  {
    id: 'synthwave-1984',
    name: 'Synthwave Sunset 1984',
    category: 'Retro',
    previewColor: '#D946EF',
    description: 'Outrun neon wireframe sunset gradient (fuchsia to warm orange) with deep violet aura.'
  },
  {
    id: 'vaporwave-90s',
    name: 'Windows 95 Vaporwave',
    category: 'Retro',
    previewColor: '#0D9488',
    description: 'Classic Windows 95 grey window title bar with 3D bevels, minimize buttons, and teal digital clock.'
  },
  {
    id: 'flip-clock',
    name: 'Split-Flap Airport Clock',
    category: 'Retro',
    previewColor: '#E2E8F0',
    description: 'Retro mechanical split-flap tiles with horizontal split crease and matte black airport blocks.'
  },
  {
    id: 'neon-cassette',
    name: 'Lo-Fi 80s Cassette Tape',
    category: 'Retro',
    previewColor: '#EA580C',
    description: 'Vintage 1980s cassette body with twin spinning tape spools, magnetic window, and warm analog glow.'
  },
  {
    id: 'gameboy-classic',
    name: 'GameBoy Dot-Matrix 1989',
    category: 'Retro',
    previewColor: '#65A30D',
    description: 'Authentic 1989 handheld 4-shade pea-soup olive green LCD dot matrix screen and handheld bezel.'
  },
  {
    id: 'vcr-glitch',
    name: 'VCR VHS Playback 1993',
    category: 'Retro',
    previewColor: '#06B6D4',
    description: 'Retro VHS magnetic tape on-screen display with glowing cyan tracking glitch lines and flashing PLAY badge.'
  },
  {
    id: 'neon-diner',
    name: 'Route 66 Neon Diner',
    category: 'Retro',
    previewColor: '#FB7185',
    description: '1950s American retro diner chrome trim with cursive glow, glowing cherry pink and turquoise neon tubes.'
  },

  // ==========================================
  // AESTHETIC (8 TEMPLATES)
  // ==========================================
  {
    id: 'kawaii-pastel',
    name: 'Kawaii Pastel Dream',
    category: 'Aesthetic',
    previewColor: '#EC4899',
    description: 'Soft pink bubble capsule with beating heart badge, playful glow, and floating pastel sparkles.'
  },
  {
    id: 'cosmic-galaxy',
    name: 'Deep Space Nebula',
    category: 'Aesthetic',
    previewColor: '#8B5CF6',
    description: 'Cosmic purple-indigo nebula background with twinkling stars and mystical stardust aura.'
  },
  {
    id: 'aqua-marine',
    name: 'Bioluminescent Aqua',
    category: 'Aesthetic',
    previewColor: '#06B6D4',
    description: 'Deep oceanic teal-cyan gradient with compass rose and gentle tidal wave breathing glow.'
  },
  {
    id: 'comic-pop',
    name: 'Comic Pop Art',
    category: 'Aesthetic',
    previewColor: '#F59E0B',
    description: 'Halftone dot texture, bold 4px black ink outlines, and explosive pop-art action banner.'
  },
  {
    id: 'sakura-blossom',
    name: 'Sakura Zen Blossom',
    category: 'Aesthetic',
    previewColor: '#F472B6',
    description: 'Zen Japanese cherry garden aesthetic with soft blush pink floral glow and translucent frosted quartz.'
  },
  {
    id: 'aurora-borealis',
    name: 'Nordic Aurora Borealis',
    category: 'Aesthetic',
    previewColor: '#10B981',
    description: 'Shimmering Arctic polar lights with undulating emerald and violet celestial wave gradients.'
  },
  {
    id: 'deep-abyss',
    name: 'Deep Oceanic Abyss',
    category: 'Aesthetic',
    previewColor: '#0284C7',
    description: 'Midnight navy oceanic trench with sonar radar sweeps and deep-sea bioluminescent cyan illumination.'
  },
  {
    id: 'bubble-gum',
    name: 'Bubble Gum Pop',
    category: 'Aesthetic',
    previewColor: '#14B8A6',
    description: 'Playful Y2K confectionery palette with bouncy mint and vibrant bubblegum pink glossy pill pods.'
  },

  // ==========================================
  // MINIMAL (4 TEMPLATES)
  // ==========================================
  {
    id: 'minimal-studio',
    name: 'Minimal Studio Mono',
    category: 'Minimal',
    previewColor: '#F8FAFC',
    description: 'Ultra-clean Swiss monochrome typography with razor-thin hairline frame and pure digits.'
  },
  {
    id: 'glass-frost',
    name: 'Frosted Glassmorphism',
    category: 'Minimal',
    previewColor: '#A855F7',
    description: 'Translucent frosted glass capsule with ultra backdrop blur, pill badge, and subtle aurora shimmer.'
  },
  {
    id: 'monochrome-swiss',
    name: 'Swiss Editorial Helvetica',
    category: 'Minimal',
    previewColor: '#E2E8F0',
    description: 'High-fashion editorial minimalism with ultra-clean grid layout, stark monochrome contrast, and precision numerals.'
  },
  {
    id: 'nordic-slate',
    name: 'Nordic Slate & Ash',
    category: 'Minimal',
    previewColor: '#94A3B8',
    description: 'Scandinavian matte charcoal slate stone with ice-white monospace numerals and whisper-thin zinc borders.'
  },

  // ==========================================
  // SPECIAL (4 TEMPLATES)
  // ==========================================
  {
    id: 'golden-luxury',
    name: 'Golden Luxury VIP',
    category: 'Special',
    previewColor: '#F59E0B',
    description: 'Royal obsidian glass with metallic gold borders, imperial crown badge, and amber glow.'
  },
  {
    id: 'steampunk-brass',
    name: 'Steampunk Clockwork',
    category: 'Special',
    previewColor: '#D97706',
    description: 'Antique copper and warm brass metallic rivet chassis with vintage gear chronometer aesthetic.'
  },
  {
    id: 'solar-flare',
    name: 'Solar Eclipse Corona',
    category: 'Special',
    previewColor: '#F97316',
    description: 'Blazing solar eclipse corona ring with incandescent molten solar flare glow and obsidian star center.'
  },
  {
    id: 'supernova-gold',
    name: 'Celestial Supernova VIP',
    category: 'Special',
    previewColor: '#EAB308',
    description: 'Celestial starlight VIP edition with diamond sparkles, polished gold bevels, and champagne brilliance.'
  }
];

export interface TimerRenderProps {
  title: string;
  remainingSeconds: number;
  isRunning?: boolean;
  rateMinutesPerUsd?: number;
  glowColor?: string;
  templateStyle?: string;
  showBackground?: boolean;
  showAnimation?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  description?: string;
  floatingBonuses?: Array<{ id: string; text: string }>;
}

export const formatTimerParts = (totalSec: number) => {
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    days,
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds)
  };
};

export const TimerTemplateRenderer: React.FC<TimerRenderProps> = ({
  title,
  remainingSeconds,
  isRunning = true,
  rateMinutesPerUsd = 10,
  glowColor = '#00F0FF',
  templateStyle = 'cyber-neon',
  showBackground = true,
  showAnimation = true,
  showTitle = true,
  showDescription = true,
  description = '',
  floatingBonuses = []
}) => {
  const time = formatTimerParts(remainingSeconds);

  // Common Keyframes
  const animationStyles = (
    <style>{`
      @keyframes timerPulseColon {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.25; transform: scale(0.95); }
      }
      @keyframes timerChromaHue {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
      @keyframes timerGoldGleam {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes timerRadarScanLine {
        0% { top: 0%; opacity: 0.8; }
        50% { opacity: 1; }
        100% { top: 100%; opacity: 0.8; }
      }
      @keyframes timerHeartbeatBeat {
        0%, 100% { transform: scale(1); }
        15% { transform: scale(1.15); }
        30% { transform: scale(1); }
        45% { transform: scale(1.1); }
      }
      @keyframes timerCrtFlicker {
        0% { opacity: 0.98; }
        50% { opacity: 1; }
        100% { opacity: 0.96; }
      }
      @keyframes timerPixelBlink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0.2; }
      }
      @keyframes timerBloodFlame {
        0%, 100% { filter: drop-shadow(0 0 10px #DC2626); }
        50% { filter: drop-shadow(0 0 25px #EF4444); }
      }
      @keyframes timerPoliceStrobe {
        0%, 49% { border-color: #3B82F6; box-shadow: 0 0 30px rgba(59,130,246,0.6); }
        50%, 100% { border-color: #EF4444; box-shadow: 0 0 30px rgba(239,68,68,0.6); }
      }
      @keyframes timerQuantumPulse {
        0%, 100% { box-shadow: 0 0 25px rgba(37,99,235,0.4), inset 0 0 15px rgba(37,99,235,0.2); }
        50% { box-shadow: 0 0 45px rgba(37,99,235,0.8), inset 0 0 25px rgba(37,99,235,0.4); }
      }
      @keyframes timerAuroraShimmer {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes timerSolarCorona {
        0%, 100% { box-shadow: 0 0 30px #F97316, 0 0 60px rgba(249,115,22,0.4); }
        50% { box-shadow: 0 0 50px #F97316, 0 0 85px rgba(249,115,22,0.7); }
      }
    `}</style>
  );

  const colonAnim = showAnimation && isRunning ? { animation: 'timerPulseColon 1s ease-in-out infinite' } : {};

  // Floating bonus tip popup
  const bonusToasts = floatingBonuses.length > 0 && (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-30">
      {floatingBonuses.map((b) => (
        <div
          key={b.id}
          className="animate-bounce flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-900/95 border text-xs font-mono font-bold shadow-2xl backdrop-blur-md"
          style={{ borderColor: glowColor, color: glowColor, boxShadow: `0 0 20px ${glowColor}66` }}
        >
          <Sparkles size={13} className="animate-spin" />
          <span>{b.text}</span>
        </div>
      ))}
    </div>
  );

  const isTitleVisible =
    showTitle !== false &&
    showTitle !== 0 &&
    (showTitle as any) !== 'false' &&
    (showTitle as any) !== '0' &&
    Boolean(title && title.trim());

  const isDescriptionVisible =
    showDescription !== false &&
    showDescription !== 0 &&
    (showDescription as any) !== 'false' &&
    (showDescription as any) !== '0';

  const renderDescription = (color = 'text-slate-400') => {
    if (!isDescriptionVisible) return null;
    const descText = description && description.trim() !== '' ? description : `$1 = +${rateMinutesPerUsd}m • 4,000៛ = +${rateMinutesPerUsd}m`;
    return (
      <div className={`text-[11px] font-mono ${color} font-semibold tracking-wide text-center pt-0.5 whitespace-nowrap select-none`}>
        {descText}
      </div>
    );
  };

  // Common root width class that gives plenty of room and prevents text wrapping
  const baseCardWidth = 'w-full max-w-xl min-w-[340px] sm:min-w-[440px] p-4 sm:p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5';

  // =========================================================================
  // 1. CYBERPUNK ELECTRIC NEON
  // =========================================================================
  if (templateStyle === 'cyber-neon') {
    return (
      <div
        className={`${baseCardWidth} ${
          showBackground ? 'bg-[#070B14]/95 border-2 shadow-2xl' : 'bg-transparent border-transparent shadow-none'
        }`}
        style={{
          borderColor: showBackground ? glowColor : 'transparent',
          boxShadow: showBackground ? `0 0 35px ${glowColor}35` : 'none',
          clipPath: showBackground ? 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' : undefined
        }}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="flex items-center justify-center px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-extrabold tracking-wider font-['Chakra_Petch'] drop-shadow-2xl select-none"
          style={{
            color: '#FFFFFF',
            textShadow: `0 0 25px ${glowColor}cc, 0 2px 4px rgba(0,0,0,0.9)`
          }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl mr-1.5 opacity-90">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={{ color: glowColor, ...colonAnim }}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={{ color: glowColor, ...colonAnim }}>:</span>
          <span style={{ color: glowColor }}>{time.seconds}</span>
        </div>

        {renderDescription('text-cyan-400/80')}
      </div>
    );
  }

  // =========================================================================
  // 2. MECHA TACTICAL HUD TELEMETRY
  // =========================================================================
  if (templateStyle === 'mecha-hud') {
    return (
      <div
        className={`${baseCardWidth} ${
          showBackground ? 'bg-[#0B0F19] border-2 border-orange-500/80 shadow-[0_0_30px_rgba(249,115,22,0.25)]' : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-black font-['Chakra_Petch'] uppercase tracking-widest text-orange-400 text-center">
            <span>{title}</span>
          </div>
        )}

        <div className="relative w-full px-4 sm:px-6 py-2 bg-black/60 border border-orange-500/40 rounded-lg overflow-hidden flex items-center justify-center">
          {showAnimation && (
            <div
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent pointer-events-none"
              style={{ animation: 'timerRadarScanLine 2s linear infinite' }}
            />
          )}
          <div
            className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider font-mono text-white select-none"
            style={{ textShadow: '0 0 20px rgba(249,115,22,0.8)' }}
          >
            {time.days > 0 && <span className="text-2xl text-orange-400 mr-1.5">{time.days}D :</span>}
            <span>{time.hours}</span>
            <span className="mx-1 sm:mx-1.5 inline-block" style={{ color: '#F97316', ...colonAnim }}>:</span>
            <span>{time.minutes}</span>
            <span className="mx-1 sm:mx-1.5 inline-block" style={{ color: '#F97316', ...colonAnim }}>:</span>
            <span className="text-orange-400">{time.seconds}</span>
          </div>
        </div>

        {renderDescription('text-orange-400/70')}
      </div>
    );
  }

  // =========================================================================
  // 3. MATRIX CRT TERMINAL
  // =========================================================================
  if (templateStyle === 'matrix-terminal') {
    return (
      <div
        className={`${baseCardWidth} font-mono ${
          showBackground ? 'bg-black border-2 border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.3)]' : 'bg-transparent border-transparent shadow-none'
        }`}
        style={showAnimation ? { animation: 'timerCrtFlicker 3s infinite' } : {}}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-bold text-emerald-400 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider text-emerald-400 select-none"
          style={{ textShadow: '0 0 20px #10B981, 0 0 40px #10B981' }}
        >
          {time.days > 0 && <span className="mr-1.5">{time.days}d:</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        {renderDescription('text-emerald-500')}
      </div>
    );
  }

  // =========================================================================
  // 4. HOLOGRAPHIC CYBER HUD
  // =========================================================================
  if (templateStyle === 'holo-scifi') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-slate-900/70 backdrop-blur-xl border border-sky-400/60 shadow-[0_0_35px_rgba(56,189,248,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-sky-950/60 border border-sky-400/30 text-[10px] font-mono font-bold text-sky-300 uppercase">
            <span>{title}</span>
          </div>
        )}

        <div className="flex items-center justify-center flex-nowrap whitespace-nowrap gap-1.5 sm:gap-2">
          {time.days > 0 && (
            <>
              <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-950/90 border border-sky-400/40 text-2xl sm:text-4xl font-black font-['Chakra_Petch'] text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                {time.days}d
              </div>
              <span className="text-xl sm:text-3xl font-black text-sky-400" style={colonAnim}>:</span>
            </>
          )}
          {[time.hours, time.minutes, time.seconds].map((segment, idx) => (
            <React.Fragment key={idx}>
              <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-950/90 border border-sky-400/40 text-3xl sm:text-5xl font-black font-['Chakra_Petch'] text-sky-100 shadow-[0_0_15px_rgba(56,189,248,0.3)] tabular-nums">
                {segment}
              </div>
              {idx < 2 && (
                <span className="text-2xl sm:text-3xl font-black text-sky-400" style={colonAnim}>
                  :
                </span>
              )}
            </React.Fragment>
          ))}
        </div>

        {renderDescription('text-sky-300/80')}
      </div>
    );
  }

  // =========================================================================
  // 5. GLITCH OVERDRIVE CYBER
  // =========================================================================
  if (templateStyle === 'glitch-cyber') {
    return (
      <div
        className={`${baseCardWidth} ${
          showBackground
            ? 'bg-[#0A0512] border-2 border-fuchsia-500 shadow-[0_0_35px_rgba(236,72,153,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
        style={{
          clipPath: showBackground ? 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' : undefined
        }}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded bg-fuchsia-950/80 border border-fuchsia-500/50 text-[11px] font-mono font-bold text-fuchsia-300 uppercase">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider font-mono text-white select-none"
          style={{
            textShadow: '2px 0 #00F0FF, -2px 0 #EC4899, 0 0 20px rgba(236,72,153,0.8)'
          }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-cyan-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-cyan-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-fuchsia-400 inline-block" style={colonAnim}>:</span>
          <span className="text-cyan-300">{time.seconds}</span>
        </div>

        {renderDescription('text-fuchsia-400')}
      </div>
    );
  }

  // =========================================================================
  // 6. QUANTUM REACTOR CORE
  // =========================================================================
  if (templateStyle === 'quantum-core') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-gradient-to-b from-[#030712] via-[#021028] to-[#010818] border-2 border-blue-500 shadow-[0_0_35px_rgba(37,99,235,0.4)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
        style={showAnimation ? { animation: 'timerQuantumPulse 3s infinite' } : {}}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-[11px] font-mono font-bold text-blue-300 uppercase">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider font-['Chakra_Petch'] text-white select-none"
          style={{ textShadow: '0 0 25px #2563EB, 0 0 45px #1D4ED8' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-blue-400 mr-1.5">{time.days}D :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-blue-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-blue-400 inline-block" style={colonAnim}>:</span>
          <span className="text-cyan-400">{time.seconds}</span>
        </div>

        {renderDescription('text-blue-400/80')}
      </div>
    );
  }

  // =========================================================================
  // 7. CYBER SAMURAI RONIN
  // =========================================================================
  if (templateStyle === 'cyber-samurai') {
    return (
      <div
        className={`${baseCardWidth} ${
          showBackground
            ? 'bg-gradient-to-r from-[#170206] via-[#0A0002] to-[#170206] border-2 border-rose-600 shadow-[0_0_35px_rgba(225,29,72,0.4)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
        style={{
          clipPath: showBackground ? 'polygon(16px 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 16px 100%, 0 50%)' : undefined
        }}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-black uppercase tracking-widest text-rose-500 font-['Chakra_Petch'] text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider font-['Chakra_Petch'] text-white select-none"
          style={{ textShadow: '0 0 25px #E11D48, 0 0 50px #9F1239' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-rose-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-rose-600 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-rose-600 inline-block" style={colonAnim}>:</span>
          <span className="text-rose-400">{time.seconds}</span>
        </div>

        {renderDescription('text-rose-400/80')}
      </div>
    );
  }

  // =========================================================================
  // 8. PCB EMERALD CIRCUIT
  // =========================================================================
  if (templateStyle === 'emerald-circuit') {
    return (
      <div
        className={`${baseCardWidth} rounded-xl ${
          showBackground
            ? 'bg-[#031A10] border-2 border-emerald-500/80 shadow-[0_0_35px_rgba(5,150,105,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 uppercase">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider font-mono text-emerald-300 select-none"
          style={{ textShadow: '0 0 20px #059669, 0 0 35px #10B981' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-amber-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-amber-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-amber-400 inline-block" style={colonAnim}>:</span>
          <span className="text-emerald-100">{time.seconds}</span>
        </div>

        {renderDescription('text-emerald-400')}
      </div>
    );
  }

  // =========================================================================
  // 9. CHROMA RGB GAMING
  // =========================================================================
  if (templateStyle === 'chroma-rgb') {
    return (
      <div
        className={`w-full max-w-xl min-w-[340px] sm:min-w-[440px] rounded-2xl relative transition-all duration-300 ${
          showBackground
            ? 'p-[2px] bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-cyan-400 via-blue-500 to-purple-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
            : 'p-0 bg-transparent shadow-none'
        }`}
        style={showAnimation ? { animation: 'timerChromaHue 4s linear infinite' } : {}}
      >
        {animationStyles}
        {bonusToasts}
        <div className={`w-full rounded-2xl p-4 sm:p-5 flex flex-col items-center space-y-2.5 ${showBackground ? 'bg-[#090D18]' : 'bg-transparent'}`}>
          {isTitleVisible && (
            <div className="px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-white">
              <span>{title}</span>
            </div>
          )}

          <div
            className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider font-['Chakra_Petch'] text-white drop-shadow-2xl select-none"
            style={{ textShadow: '0 0 25px rgba(16,185,129,0.8)' }}
          >
            {time.days > 0 && <span className="text-2xl sm:text-4xl mr-1.5">{time.days}d :</span>}
            <span>{time.hours}</span>
            <span className="mx-1 sm:mx-1.5 text-emerald-400 inline-block" style={colonAnim}>:</span>
            <span>{time.minutes}</span>
            <span className="mx-1 sm:mx-1.5 text-cyan-400 inline-block" style={colonAnim}>:</span>
            <span className="text-purple-400">{time.seconds}</span>
          </div>

          {renderDescription('text-emerald-400')}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 10. GOTHIC BLOOD MOON
  // =========================================================================
  if (templateStyle === 'blood-moon') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-gradient-to-br from-[#240306] via-[#120103] to-black border-2 border-red-600/70 shadow-[0_0_35px_rgba(220,38,38,0.4)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
        style={showAnimation ? { animation: 'timerBloodFlame 2s ease-in-out infinite' } : {}}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-bold font-serif uppercase tracking-widest text-red-500 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-serif tracking-wider text-red-100 select-none"
          style={{ textShadow: '0 0 25px #DC2626, 0 0 50px #7F1D1D' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-red-400 mr-1.5">{time.days}D :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-red-600 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-red-600 inline-block" style={colonAnim}>:</span>
          <span className="text-red-400">{time.seconds}</span>
        </div>

        {renderDescription('text-red-400/80')}
      </div>
    );
  }

  // =========================================================================
  // 11. CARBON TACTICAL ESPORTS
  // =========================================================================
  if (templateStyle === 'carbon-tactical') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-[#090D18] border-2 border-slate-800 shadow-2xl'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-lime-400">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-['Chakra_Petch'] tracking-wider text-white select-none"
          style={{ textShadow: '0 0 20px rgba(132,204,22,0.8)' }}
        >
          {time.days > 0 && <span className="text-2xl text-lime-400 mr-1.5">{time.days}D :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-lime-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-lime-400 inline-block" style={colonAnim}>:</span>
          <span className="text-lime-400">{time.seconds}</span>
        </div>

        {renderDescription('text-lime-400/80')}
      </div>
    );
  }

  // =========================================================================
  // 12. ARCADE VS FIGHT TIMER
  // =========================================================================
  if (templateStyle === 'arcade-fighter') {
    return (
      <div
        className={`${baseCardWidth} font-mono ${
          showBackground
            ? 'bg-gradient-to-b from-red-950 via-slate-950 to-black border-4 border-amber-400 shadow-[6px_6px_0px_#EF4444]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-sm">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black text-yellow-300 tracking-wider select-none"
          style={{ textShadow: '3px 3px 0px #DC2626' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-amber-400 mr-1.5">{time.days}d:</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        {renderDescription('text-amber-400')}
      </div>
    );
  }

  // =========================================================================
  // 13. NEED FOR SPEED TACHOMETER
  // =========================================================================
  if (templateStyle === 'speedometer-tach') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-[#0D0B12] border-2 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.4)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-slate-900 border border-rose-500/40 text-xs font-mono font-bold text-rose-400 uppercase">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-['Chakra_Petch'] tracking-wider text-white select-none"
          style={{ textShadow: '0 0 25px #F43F5E' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-rose-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-rose-500 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-rose-500 inline-block" style={colonAnim}>:</span>
          <span className="text-rose-400">{time.seconds}</span>
        </div>

        {renderDescription('text-rose-400')}
      </div>
    );
  }

  // =========================================================================
  // 14. TOXIC BIOHAZARD BUNKER
  // =========================================================================
  if (templateStyle === 'radioactive-hazard') {
    return (
      <div
        className={`${baseCardWidth} ${
          showBackground
            ? 'bg-[#120E04] border-4 border-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 bg-amber-500 text-black text-xs font-black uppercase tracking-wider rounded-sm">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-mono text-amber-400 tracking-wider select-none"
          style={{ textShadow: '0 0 20px #F59E0B' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-amber-300 mr-1.5">{time.days}D :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-amber-300 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-amber-300 inline-block" style={colonAnim}>:</span>
          <span className="text-amber-200">{time.seconds}</span>
        </div>

        {renderDescription('text-amber-400/90')}
      </div>
    );
  }

  // =========================================================================
  // 15. NIGHT CITY ENFORCER
  // =========================================================================
  if (templateStyle === 'cyber-police') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-[#080B14] border-2 border-blue-500 shadow-2xl'
            : 'bg-transparent border-transparent shadow-none'
        }`}
        style={showAnimation ? { animation: 'timerPoliceStrobe 1.5s infinite' } : {}}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-white uppercase">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-mono text-white tracking-wider select-none"
          style={{ textShadow: '0 0 20px #3B82F6, 0 0 40px #EF4444' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-blue-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-blue-500 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-red-500 inline-block" style={colonAnim}>:</span>
          <span className="text-red-400">{time.seconds}</span>
        </div>

        {renderDescription('text-blue-400')}
      </div>
    );
  }

  // =========================================================================
  // 16. CRIMSON BLOOD VIAL
  // =========================================================================
  if (templateStyle === 'vampire-curse') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-gradient-to-b from-[#180826] via-[#0E0317] to-[#050109] border-2 border-purple-600 shadow-[0_0_35px_rgba(147,51,234,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-bold font-serif uppercase tracking-widest text-purple-400 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-serif tracking-wider text-purple-100 select-none"
          style={{ textShadow: '0 0 25px #9333EA, 0 0 50px #DC2626' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-red-400 mr-1.5">{time.days}D :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-purple-500 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-red-500 inline-block" style={colonAnim}>:</span>
          <span className="text-red-400">{time.seconds}</span>
        </div>

        {renderDescription('text-purple-300')}
      </div>
    );
  }

  // =========================================================================
  // 17. RETRO 8-BIT PIXEL ARCADE
  // =========================================================================
  if (templateStyle === 'retro-8bit') {
    return (
      <div
        className={`${baseCardWidth} font-mono ${
          showBackground
            ? 'bg-[#0F172A] border-4 border-black shadow-[6px_6px_0px_#000000]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-black text-yellow-400 uppercase tracking-widest text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black text-white tracking-wider select-none"
          style={{ textShadow: '4px 4px 0px #000000' }}
        >
          {time.days > 0 && <span className="text-yellow-400 mr-1.5 text-2xl sm:text-4xl">{time.days}d:</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-yellow-400 inline-block" style={showAnimation ? { animation: 'timerPixelBlink 1s steps(1) infinite' } : {}}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-yellow-400 inline-block" style={showAnimation ? { animation: 'timerPixelBlink 1s steps(1) infinite' } : {}}>:</span>
          <span className="text-yellow-400">{time.seconds}</span>
        </div>

        {renderDescription('text-yellow-400/80')}
      </div>
    );
  }

  // =========================================================================
  // 18. SYNTHWAVE SUNSET 1984
  // =========================================================================
  if (templateStyle === 'synthwave-1984') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-gradient-to-b from-[#1E0B36] via-[#120422] to-[#090212] border-2 border-fuchsia-500/70 shadow-[0_0_35px_rgba(217,70,239,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-black uppercase tracking-widest text-amber-300 font-['Chakra_Petch'] text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black italic tracking-wider font-['Chakra_Petch'] bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300 bg-clip-text text-transparent select-none"
          style={{ filter: 'drop-shadow(0 0 20px rgba(217,70,239,0.7))' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-fuchsia-400 not-italic mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-pink-400 not-italic inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-pink-400 not-italic inline-block" style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        {renderDescription('text-fuchsia-400/80')}
      </div>
    );
  }

  // =========================================================================
  // 19. WINDOWS 95 VAPORWAVE
  // =========================================================================
  if (templateStyle === 'vaporwave-90s') {
    return (
      <div
        className={`${baseCardWidth} p-2 font-sans text-slate-950 ${
          showBackground
            ? 'bg-[#C0C0C0] border-4 border-t-white border-l-white border-r-gray-700 border-b-gray-700 shadow-2xl'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="w-full bg-gradient-to-r from-blue-900 to-teal-700 text-white px-2.5 py-1 flex items-center justify-between text-xs font-bold select-none rounded-t-sm">
            <span>{title}</span>
            <span className="text-[10px] font-mono">_ ▢ X</span>
          </div>
        )}

        <div className="p-3 w-full bg-black border-2 border-t-gray-700 border-l-gray-700 border-r-white border-b-white rounded-b-sm flex flex-col items-center space-y-1">
          <div
            className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-mono text-teal-400 tracking-wider select-none"
            style={{ textShadow: '0 0 15px #0D9488' }}
          >
            {time.days > 0 && <span className="text-2xl sm:text-4xl mr-1.5">{time.days}d:</span>}
            <span>{time.hours}</span>
            <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
            <span>{time.minutes}</span>
            <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
            <span>{time.seconds}</span>
          </div>
          {renderDescription('text-teal-400/80')}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 20. SPLIT-FLAP AIRPORT CLOCK
  // =========================================================================
  if (templateStyle === 'flip-clock') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground ? 'bg-[#18181B] border-2 border-zinc-700 shadow-2xl' : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 text-center">
            <span>{title}</span>
          </div>
        )}

        <div className="flex items-center justify-center flex-nowrap whitespace-nowrap gap-1.5 sm:gap-2">
          {time.days > 0 && (
            <>
              <div className="relative px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-[#09090B] border border-zinc-800 shadow-inner flex flex-col items-center overflow-hidden">
                <span className="text-2xl sm:text-4xl font-black font-mono text-white tracking-widest tabular-nums">
                  {time.days}d
                </span>
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/80" />
              </div>
              <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-500" style={colonAnim}>:</span>
            </>
          )}
          {[time.hours, time.minutes, time.seconds].map((unit, idx) => (
            <React.Fragment key={idx}>
              <div className="relative px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-[#09090B] border border-zinc-800 shadow-inner flex flex-col items-center overflow-hidden">
                <span className="text-3xl sm:text-5xl font-black font-mono text-white tracking-widest tabular-nums">
                  {unit}
                </span>
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/80" />
              </div>
              {idx < 2 && (
                <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-500" style={colonAnim}>
                  :
                </span>
              )}
            </React.Fragment>
          ))}
        </div>

        {renderDescription('text-zinc-400')}
      </div>
    );
  }

  // =========================================================================
  // 21. LO-FI 80S CASSETTE TAPE
  // =========================================================================
  if (templateStyle === 'neon-cassette') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-[#180E09] border-2 border-orange-600 shadow-[0_0_35px_rgba(234,88,12,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-black/80 border border-orange-500/40 text-xs font-mono font-bold text-orange-400 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-mono text-orange-200 tracking-wider select-none"
          style={{ textShadow: '0 0 20px #EA580C' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-orange-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-orange-500 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-orange-500 inline-block" style={colonAnim}>:</span>
          <span className="text-amber-300">{time.seconds}</span>
        </div>

        {renderDescription('text-orange-400/90')}
      </div>
    );
  }

  // =========================================================================
  // 22. GAMEBOY DOT-MATRIX 1989
  // =========================================================================
  if (templateStyle === 'gameboy-classic') {
    return (
      <div
        className={`${baseCardWidth} rounded-xl ${
          showBackground
            ? 'bg-[#8BAC0F] border-4 border-[#306230] shadow-[0_0_25px_rgba(48,98,48,0.4)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-[11px] font-mono font-black uppercase tracking-wider text-[#0F380F] text-center">
            <span>{title}</span>
          </div>
        )}

        <div className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-mono text-[#0F380F] tracking-wider select-none">
          {time.days > 0 && <span className="text-2xl sm:text-4xl mr-1.5">{time.days}d:</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        {renderDescription('text-[#306230]')}
      </div>
    );
  }

  // =========================================================================
  // 23. VCR VHS PLAYBACK 1993
  // =========================================================================
  if (templateStyle === 'vcr-glitch') {
    return (
      <div
        className={`${baseCardWidth} ${
          showBackground
            ? 'bg-[#000010] border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-2 text-[11px] font-mono font-bold text-cyan-400 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-mono text-cyan-300 tracking-wider select-none"
          style={{ textShadow: '0 0 20px #06B6D4' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-cyan-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        {renderDescription('text-cyan-400/80')}
      </div>
    );
  }

  // =========================================================================
  // 24. ROUTE 66 NEON DINER
  // =========================================================================
  if (templateStyle === 'neon-diner') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-[#180A12] border-2 border-pink-400 shadow-[0_0_35px_rgba(251,113,133,0.4)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-slate-900 border border-pink-400/50 text-xs font-mono font-bold text-pink-300 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-serif tracking-wider text-pink-200 select-none"
          style={{ textShadow: '0 0 20px #FB7185, 0 0 40px #F43F5E' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-pink-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-pink-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-pink-400 inline-block" style={colonAnim}>:</span>
          <span className="text-cyan-300">{time.seconds}</span>
        </div>

        {renderDescription('text-pink-300')}
      </div>
    );
  }

  // =========================================================================
  // 25. KAWAII PASTEL DREAM
  // =========================================================================
  if (templateStyle === 'kawaii-pastel') {
    return (
      <div
        className={`${baseCardWidth} rounded-3xl ${
          showBackground
            ? 'bg-pink-950/30 backdrop-blur-xl border-2 border-pink-300/40 shadow-[0_0_35px_rgba(244,114,182,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-pink-950/60 border border-pink-300/30 text-xs font-bold text-pink-300 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider text-pink-200 select-none"
          style={{ textShadow: '0 0 20px rgba(244,114,182,0.7)' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-pink-300 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-pink-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-pink-400 inline-block" style={colonAnim}>:</span>
          <span className="text-rose-300">{time.seconds}</span>
        </div>

        {renderDescription('text-pink-300/80')}
      </div>
    );
  }

  // =========================================================================
  // 26. DEEP SPACE NEBULA
  // =========================================================================
  if (templateStyle === 'cosmic-galaxy') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-gradient-to-br from-[#1E1138] via-[#0F0826] to-[#040112] border-2 border-purple-400/60 shadow-[0_0_35px_rgba(139,92,246,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-bold font-['Chakra_Petch'] uppercase tracking-widest text-purple-300 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider font-['Chakra_Petch'] text-white select-none"
          style={{ textShadow: '0 0 25px #8B5CF6, 0 0 45px #6D28D9' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-purple-300 mr-1.5">{time.days}d:</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-purple-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-purple-400 inline-block" style={colonAnim}>:</span>
          <span className="text-pink-300">{time.seconds}</span>
        </div>

        {renderDescription('text-purple-300/80')}
      </div>
    );
  }

  // =========================================================================
  // 27. BIOLUMINESCENT AQUA
  // =========================================================================
  if (templateStyle === 'aqua-marine') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-gradient-to-br from-[#041F38] via-[#021324] to-[#010912] border-2 border-cyan-400/60 shadow-[0_0_35px_rgba(6,182,212,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-bold font-['Chakra_Petch'] uppercase tracking-widest text-cyan-300 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider font-mono text-cyan-100 select-none"
          style={{ textShadow: '0 0 25px #06B6D4' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-cyan-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-teal-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-teal-400 inline-block" style={colonAnim}>:</span>
          <span className="text-cyan-400">{time.seconds}</span>
        </div>

        {renderDescription('text-cyan-300/80')}
      </div>
    );
  }

  // =========================================================================
  // 28. COMIC POP ART
  // =========================================================================
  if (templateStyle === 'comic-pop') {
    return (
      <div
        className={`${baseCardWidth} font-mono text-black ${
          showBackground
            ? 'bg-[#FFFBEB] border-4 border-black shadow-[6px_6px_0px_#000000]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 bg-black text-yellow-300 text-xs font-black uppercase tracking-wider rounded-sm">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black text-black tracking-wider select-none"
          style={{ textShadow: '3px 3px 0px #F59E0B' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-amber-600 mr-1.5">{time.days}d:</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 inline-block" style={colonAnim}>:</span>
          <span className="text-red-600">{time.seconds}</span>
        </div>

        {renderDescription('text-black font-black')}
      </div>
    );
  }

  // =========================================================================
  // 29. SAKURA ZEN BLOSSOM
  // =========================================================================
  if (templateStyle === 'sakura-blossom') {
    return (
      <div
        className={`${baseCardWidth} rounded-3xl ${
          showBackground
            ? 'bg-rose-950/20 backdrop-blur-2xl border-2 border-rose-300/50 shadow-[0_0_35px_rgba(244,114,182,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-rose-950/50 border border-rose-300/40 text-xs font-serif font-bold text-rose-300 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-serif tracking-wider text-rose-100 select-none"
          style={{ textShadow: '0 0 25px rgba(244,114,182,0.6)' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-rose-300 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-rose-300 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-rose-300 inline-block" style={colonAnim}>:</span>
          <span className="text-rose-200">{time.seconds}</span>
        </div>

        {renderDescription('text-rose-300')}
      </div>
    );
  }

  // =========================================================================
  // 30. NORDIC AURORA BOREALIS
  // =========================================================================
  if (templateStyle === 'aurora-borealis') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-gradient-to-r from-[#031C1A] via-[#09152C] to-[#16062E] border-2 border-emerald-400/80 shadow-[0_0_40px_rgba(16,185,129,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
        style={showAnimation ? { animation: 'timerAuroraShimmer 6s ease infinite' } : {}}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-300 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider text-white select-none"
          style={{ textShadow: '0 0 25px #10B981, 0 0 45px #8B5CF6' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-emerald-300 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-emerald-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-teal-400 inline-block" style={colonAnim}>:</span>
          <span className="text-purple-300">{time.seconds}</span>
        </div>

        {renderDescription('text-emerald-300')}
      </div>
    );
  }

  // =========================================================================
  // 31. DEEP OCEANIC ABYSS
  // =========================================================================
  if (templateStyle === 'deep-abyss') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-gradient-to-b from-[#02182B] via-[#010D1A] to-[#00050B] border-2 border-sky-500/80 shadow-[0_0_35px_rgba(2,132,199,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/40 text-xs font-mono font-bold text-sky-300 uppercase">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-mono text-sky-100 tracking-wider select-none"
          style={{ textShadow: '0 0 25px #0284C7' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-sky-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-sky-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-sky-400 inline-block" style={colonAnim}>:</span>
          <span className="text-cyan-400">{time.seconds}</span>
        </div>

        {renderDescription('text-sky-400/80')}
      </div>
    );
  }

  // =========================================================================
  // 32. BUBBLE GUM POP
  // =========================================================================
  if (templateStyle === 'bubble-gum') {
    return (
      <div
        className={`${baseCardWidth} rounded-3xl ${
          showBackground
            ? 'bg-gradient-to-r from-teal-950/40 via-purple-950/40 to-pink-950/40 border-2 border-teal-400/80 shadow-[0_0_35px_rgba(20,184,166,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-slate-900 border border-teal-400/50 text-xs font-bold text-teal-300">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider text-white select-none"
          style={{ textShadow: '0 0 25px #14B8A6, 0 0 40px #EC4899' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-teal-300 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-teal-400 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-pink-400 inline-block" style={colonAnim}>:</span>
          <span className="text-rose-300">{time.seconds}</span>
        </div>

        {renderDescription('text-teal-300')}
      </div>
    );
  }

  // =========================================================================
  // 33. MINIMAL STUDIO MONO
  // =========================================================================
  if (templateStyle === 'minimal-studio') {
    return (
      <div
        className={`${baseCardWidth} rounded-xl font-sans ${
          showBackground ? 'bg-black/95 border border-slate-800 shadow-xl' : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 text-center">
            <span>{title}</span>
          </div>
        )}

        <div className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-light font-mono text-white tracking-wider select-none">
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-slate-400 mr-1.5">{time.days}d:</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-slate-500 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-slate-500 inline-block" style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        {renderDescription('text-slate-500')}
      </div>
    );
  }

  // =========================================================================
  // 34. FROSTED GLASSMORPHISM
  // =========================================================================
  if (templateStyle === 'glass-frost') {
    return (
      <div
        className={`${baseCardWidth} rounded-3xl ${
          showBackground
            ? 'bg-white/[0.08] backdrop-blur-2xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="px-3 py-0.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider font-mono text-white select-none"
          style={{ textShadow: '0 0 25px rgba(216,180,254,0.6)' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-purple-200 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-purple-300 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-purple-300 inline-block" style={colonAnim}>:</span>
          <span className="text-purple-200">{time.seconds}</span>
        </div>

        {renderDescription('text-white/60')}
      </div>
    );
  }

  // =========================================================================
  // 35. SWISS EDITORIAL HELVETICA
  // =========================================================================
  if (templateStyle === 'monochrome-swiss') {
    return (
      <div
        className={`${baseCardWidth} rounded-lg ${
          showBackground ? 'bg-white border-4 border-black text-black shadow-2xl' : 'bg-transparent border-transparent shadow-none text-white'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-[11px] font-sans font-black uppercase tracking-widest border-b border-black/40 pb-1 w-full text-center">
            <span>{title}</span>
          </div>
        )}

        <div className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-sans tracking-tight select-none">
          {time.days > 0 && <span className="text-2xl sm:text-4xl mr-1.5">{time.days}D :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 opacity-40 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 opacity-40 inline-block" style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        {renderDescription('text-black/70')}
      </div>
    );
  }

  // =========================================================================
  // 36. NORDIC SLATE & ASH
  // =========================================================================
  if (templateStyle === 'nordic-slate') {
    return (
      <div
        className={`${baseCardWidth} rounded-xl font-mono ${
          showBackground ? 'bg-[#1E232A] border border-slate-600 shadow-xl' : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
            <span>{title}</span>
          </div>
        )}

        <div className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-bold text-slate-100 tracking-wider select-none">
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-slate-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-slate-500 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-slate-500 inline-block" style={colonAnim}>:</span>
          <span className="text-slate-200">{time.seconds}</span>
        </div>

        {renderDescription('text-slate-400')}
      </div>
    );
  }

  // =========================================================================
  // 37. GOLDEN LUXURY VIP
  // =========================================================================
  if (templateStyle === 'golden-luxury') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-gradient-to-br from-amber-950/70 via-slate-950/95 to-slate-950 border-2 border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-bold font-serif uppercase tracking-widest text-amber-300 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-serif tracking-wider bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-400 bg-clip-text text-transparent select-none"
          style={{ filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.6))' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-amber-300 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-amber-500 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-amber-500 inline-block" style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        {renderDescription('text-amber-400/80')}
      </div>
    );
  }

  // =========================================================================
  // 38. STEAMPUNK CLOCKWORK
  // =========================================================================
  if (templateStyle === 'steampunk-brass') {
    return (
      <div
        className={`${baseCardWidth} rounded-xl font-serif ${
          showBackground
            ? 'bg-[#1C140C] border-4 border-[#B47B36] shadow-[0_0_30px_rgba(180,123,54,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-bold uppercase tracking-widest text-[#E5B869] text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black tracking-wider font-mono text-[#F3D79B] select-none"
          style={{ textShadow: '0 0 20px #8C5D23' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-[#E5B869] mr-1.5">{time.days}d:</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-[#B47B36] inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-[#B47B36] inline-block" style={colonAnim}>:</span>
          <span className="text-[#E5B869]">{time.seconds}</span>
        </div>

        {renderDescription('text-[#E5B869]/80')}
      </div>
    );
  }

  // =========================================================================
  // 39. SOLAR ECLIPSE CORONA
  // =========================================================================
  if (templateStyle === 'solar-flare') {
    return (
      <div
        className={`${baseCardWidth} rounded-2xl ${
          showBackground
            ? 'bg-gradient-to-b from-[#1C0800] via-[#0C0300] to-[#040100] border-2 border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.4)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
        style={showAnimation ? { animation: 'timerSolarCorona 3s ease-in-out infinite' } : {}}
      >
        {animationStyles}
        {bonusToasts}
        {isTitleVisible && (
          <div className="text-xs font-bold uppercase tracking-widest text-orange-400 text-center">
            <span>{title}</span>
          </div>
        )}

        <div
          className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-['Chakra_Petch'] tracking-wider text-orange-100 select-none"
          style={{ textShadow: '0 0 25px #F97316, 0 0 50px #EA580C' }}
        >
          {time.days > 0 && <span className="text-2xl sm:text-4xl text-orange-400 mr-1.5">{time.days}d :</span>}
          <span>{time.hours}</span>
          <span className="mx-1 sm:mx-1.5 text-orange-500 inline-block" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="mx-1 sm:mx-1.5 text-orange-500 inline-block" style={colonAnim}>:</span>
          <span className="text-amber-300">{time.seconds}</span>
        </div>

        {renderDescription('text-orange-400/90')}
      </div>
    );
  }

  // =========================================================================
  // 40. CELESTIAL SUPERNOVA VIP
  // =========================================================================
  return (
    <div
      className={`${baseCardWidth} rounded-2xl ${
        showBackground
          ? 'bg-gradient-to-br from-[#1A1504] via-[#0D0A01] to-[#040300] border-2 border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.35)]'
          : 'bg-transparent border-transparent shadow-none'
      }`}
    >
      {animationStyles}
      {bonusToasts}
      {isTitleVisible && (
        <div className="text-xs font-bold font-serif uppercase tracking-widest text-yellow-300 text-center">
          <span>{title}</span>
        </div>
      )}

      <div
        className="flex items-center justify-center flex-nowrap whitespace-nowrap tabular-nums text-4xl sm:text-6xl font-black font-serif tracking-wider bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent select-none"
        style={{ filter: 'drop-shadow(0 0 25px rgba(234,179,8,0.7))' }}
      >
        {time.days > 0 && <span className="text-2xl sm:text-4xl text-yellow-300 mr-1.5">{time.days}d :</span>}
        <span>{time.hours}</span>
        <span className="mx-1 sm:mx-1.5 text-yellow-500 inline-block" style={colonAnim}>:</span>
        <span>{time.minutes}</span>
        <span className="mx-1 sm:mx-1.5 text-yellow-500 inline-block" style={colonAnim}>:</span>
        <span>{time.seconds}</span>
      </div>

      {renderDescription('text-yellow-400/90')}
    </div>
  );
};
