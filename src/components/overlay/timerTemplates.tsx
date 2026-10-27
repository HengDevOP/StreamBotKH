'use client';

import React from 'react';
import {
  Timer,
  Flame,
  Sparkles,
  Zap,
  Shield,
  Crown,
  Terminal,
  Compass,
  Gamepad2,
  Heart,
  Sun,
  Star,
  Cpu,
  Coins,
  Moon,
  Crosshair,
  Radio,
  Eye,
  Check
} from 'lucide-react';

export interface TimerTemplateMeta {
  id: string;
  name: string;
  category: 'Cyber' | 'Gaming' | 'Retro' | 'Aesthetic' | 'Minimal' | 'Special';
  previewColor: string;
  description: string;
}

export const TIMER_TEMPLATES: TimerTemplateMeta[] = [
  // 1-4: Cyber
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

  // 5-8: Gaming & Esports
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

  // 9-12: Retro & Nostalgia
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

  // 13-16: Aesthetic & Streamer
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

  // 17-18: Minimal & Studio
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

  // 19-20: Special VIP & Luxury
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
      @keyframes timerFrostWave {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes timerSpeedlineRun {
        0% { background-position: 0 0; }
        100% { background-position: 24px 0; }
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

  const subathonFootnote = (color = 'text-slate-400') => (
    <div className={`text-[10px] font-mono ${color} font-semibold tracking-wide text-center pt-0.5`}>
      $1 = +{rateMinutesPerUsd}m • 4,000៛ = +{rateMinutesPerUsd}m
    </div>
  );

  // 1. CYBERPUNK ELECTRIC NEON
  if (templateStyle === 'cyber-neon') {
    return (
      <div
        className={`w-full max-w-md p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
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
        <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
          <Zap size={13} style={{ color: glowColor }} />
          <span>{title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-extrabold tracking-widest font-['Chakra_Petch'] drop-shadow-2xl"
          style={{
            color: '#FFFFFF',
            textShadow: `0 0 25px ${glowColor}cc, 0 2px 4px rgba(0,0,0,0.9)`
          }}
        >
          {time.days > 0 && <span className="text-3xl sm:text-4xl">{time.days}d : </span>}
          <span>{time.hours}</span>
          <span style={{ color: glowColor, ...colonAnim }}> : </span>
          <span>{time.minutes}</span>
          <span style={{ color: glowColor, ...colonAnim }}> : </span>
          <span style={{ color: glowColor }}>{time.seconds}</span>
        </div>

        {subathonFootnote('text-cyan-400/80')}
      </div>
    );
  }

  // 2. MECHA TACTICAL HUD TELEMETRY
  if (templateStyle === 'mecha-hud') {
    return (
      <div
        className={`w-full max-w-md p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
          showBackground ? 'bg-[#0B0F19] border-2 border-orange-500/80 shadow-[0_0_30px_rgba(249,115,22,0.25)]' : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-2 text-xs font-black font-['Chakra_Petch'] uppercase tracking-widest text-orange-400">
          <Crosshair size={14} className="animate-spin text-orange-400" />
          <span>{title}</span>
        </div>

        <div className="relative px-6 py-2 bg-black/60 border border-orange-500/40 rounded-lg overflow-hidden">
          {showAnimation && (
            <div
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent pointer-events-none"
              style={{ animation: 'timerRadarScanLine 2s linear infinite' }}
            />
          )}
          <div
            className="text-4xl sm:text-6xl font-black tracking-widest font-mono text-white"
            style={{ textShadow: '0 0 20px rgba(249,115,22,0.8)' }}
          >
            {time.days > 0 && <span className="text-2xl text-orange-400">{time.days}D : </span>}
            <span>{time.hours}</span>
            <span style={{ color: '#F97316', ...colonAnim }}>:</span>
            <span>{time.minutes}</span>
            <span style={{ color: '#F97316', ...colonAnim }}>:</span>
            <span className="text-orange-400">{time.seconds}</span>
          </div>
        </div>

        {subathonFootnote('text-orange-400/70')}
      </div>
    );
  }

  // 3. MATRIX CRT TERMINAL
  if (templateStyle === 'matrix-terminal') {
    return (
      <div
        className={`w-full max-w-md p-5 relative font-mono transition-all duration-300 flex flex-col items-center space-y-2 ${
          showBackground ? 'bg-black border-2 border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.3)]' : 'bg-transparent border-transparent shadow-none'
        }`}
        style={showAnimation ? { animation: 'timerCrtFlicker 3s infinite' } : {}}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <Terminal size={13} />
          <span>&gt; {title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-black tracking-widest text-emerald-400"
          style={{ textShadow: '0 0 20px #10B981, 0 0 40px #10B981' }}
        >
          {time.days > 0 && <span>{time.days}d:</span>}
          <span>{time.hours}</span>
          <span style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        <div className="text-[10px] text-emerald-600 font-bold">
          [EXTEND: $1 = +{rateMinutesPerUsd}m]
        </div>
      </div>
    );
  }

  // 4. HOLOGRAPHIC CYBER HUD
  if (templateStyle === 'holo-scifi') {
    return (
      <div
        className={`w-full max-w-md p-5 rounded-2xl relative transition-all duration-300 flex flex-col items-center space-y-2 ${
          showBackground
            ? 'bg-slate-900/70 backdrop-blur-xl border border-sky-400/60 shadow-[0_0_35px_rgba(56,189,248,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-950/60 border border-sky-400/30 text-[10px] font-mono font-bold text-sky-300 uppercase">
          <Eye size={12} className="text-sky-400" />
          <span>{title}</span>
        </div>

        <div className="flex items-center gap-2">
          {[time.hours, time.minutes, time.seconds].map((segment, idx) => (
            <React.Fragment key={idx}>
              <div className="px-3.5 py-2 rounded-xl bg-slate-950/90 border border-sky-400/40 text-3xl sm:text-5xl font-black font-['Chakra_Petch'] text-sky-100 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
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

        {subathonFootnote('text-sky-300/80')}
      </div>
    );
  }

  // 5. CHROMA RGB GAMING
  if (templateStyle === 'chroma-rgb') {
    return (
      <div
        className={`w-full max-w-md rounded-2xl relative transition-all duration-300 ${
          showBackground
            ? 'p-[2px] bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-cyan-400 via-blue-500 to-purple-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
            : 'p-0 bg-transparent shadow-none'
        }`}
        style={showAnimation ? { animation: 'timerChromaHue 4s linear infinite' } : {}}
      >
        {animationStyles}
        {bonusToasts}
        <div className={`w-full rounded-2xl p-5 flex flex-col items-center space-y-2.5 ${showBackground ? 'bg-[#090D18]' : 'bg-transparent'}`}>
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-white">
            <Flame size={13} className="text-red-400 animate-pulse" />
            <span>{title}</span>
          </div>

          <div
            className="text-4xl sm:text-6xl font-black tracking-wider font-['Chakra_Petch'] text-white drop-shadow-2xl"
            style={{ textShadow: '0 0 25px rgba(16,185,129,0.8)' }}
          >
            {time.days > 0 && <span className="text-3xl">{time.days}d : </span>}
            <span>{time.hours}</span>
            <span className="text-emerald-400" style={colonAnim}>:</span>
            <span>{time.minutes}</span>
            <span className="text-cyan-400" style={colonAnim}>:</span>
            <span className="text-purple-400">{time.seconds}</span>
          </div>

          {subathonFootnote('text-emerald-400')}
        </div>
      </div>
    );
  }

  // 6. GOTHIC BLOOD MOON
  if (templateStyle === 'blood-moon') {
    return (
      <div
        className={`w-full max-w-md rounded-2xl p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
          showBackground
            ? 'bg-gradient-to-br from-[#240306] via-[#120103] to-black border-2 border-red-600/70 shadow-[0_0_35px_rgba(220,38,38,0.4)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
        style={showAnimation ? { animation: 'timerBloodFlame 2s ease-in-out infinite' } : {}}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-1.5 text-xs font-bold font-serif uppercase tracking-widest text-red-500">
          <Moon size={14} className="text-red-500 fill-red-500" />
          <span>{title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-black font-serif tracking-widest text-red-100"
          style={{ textShadow: '0 0 25px #DC2626, 0 0 50px #7F1D1D' }}
        >
          {time.days > 0 && <span className="text-red-400">{time.days}D : </span>}
          <span>{time.hours}</span>
          <span className="text-red-600" style={colonAnim}> : </span>
          <span>{time.minutes}</span>
          <span className="text-red-600" style={colonAnim}> : </span>
          <span className="text-red-400">{time.seconds}</span>
        </div>

        {subathonFootnote('text-red-400/80')}
      </div>
    );
  }

  // 7. CARBON TACTICAL ESPORTS
  if (templateStyle === 'carbon-tactical') {
    return (
      <div
        className={`w-full max-w-md rounded-2xl p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
          showBackground
            ? 'bg-[#090D18] border-2 border-slate-800 shadow-2xl'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-lime-400">
          <Shield size={13} className="text-lime-400" />
          <span>{title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-black font-['Chakra_Petch'] tracking-widest text-white"
          style={{ textShadow: '0 0 20px rgba(132,204,22,0.8)' }}
        >
          {time.days > 0 && <span className="text-2xl text-lime-400">{time.days}D : </span>}
          <span>{time.hours}</span>
          <span className="text-lime-400" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="text-lime-400" style={colonAnim}>:</span>
          <span className="text-lime-400">{time.seconds}</span>
        </div>

        {subathonFootnote('text-lime-400/80')}
      </div>
    );
  }

  // 8. ARCADE VS FIGHT TIMER
  if (templateStyle === 'arcade-fighter') {
    return (
      <div
        className={`w-full max-w-md p-5 relative font-mono transition-all duration-300 flex flex-col items-center space-y-2 ${
          showBackground
            ? 'bg-gradient-to-b from-red-950 via-slate-950 to-black border-4 border-amber-400 shadow-[6px_6px_0px_#EF4444]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="px-3 py-0.5 bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-sm">
          ⚔️ {title} ⚔️
        </div>

        <div
          className="text-5xl sm:text-7xl font-black text-yellow-300 tracking-wider"
          style={{ textShadow: '4px 4px 0px #DC2626' }}
        >
          <span>{time.hours}</span>
          <span style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        {subathonFootnote('text-amber-400')}
      </div>
    );
  }

  // 9. RETRO 8-BIT PIXEL ARCADE
  if (templateStyle === 'retro-8bit') {
    return (
      <div
        className={`w-full max-w-md p-5 relative font-mono transition-all duration-300 flex flex-col items-center space-y-2 ${
          showBackground
            ? 'bg-[#0F172A] border-4 border-black shadow-[6px_6px_0px_#000000]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-1.5 text-xs font-black text-yellow-400 uppercase tracking-widest">
          <Gamepad2 size={15} />
          <span>{title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-black text-white tracking-widest"
          style={{ textShadow: '4px 4px 0px #000000' }}
        >
          {time.days > 0 && <span className="text-yellow-400">{time.days}d:</span>}
          <span>{time.hours}</span>
          <span className="text-yellow-400" style={showAnimation ? { animation: 'timerPixelBlink 1s steps(1) infinite' } : {}}>:</span>
          <span>{time.minutes}</span>
          <span className="text-yellow-400" style={showAnimation ? { animation: 'timerPixelBlink 1s steps(1) infinite' } : {}}>:</span>
          <span className="text-yellow-400">{time.seconds}</span>
        </div>

        {subathonFootnote('text-yellow-400/80')}
      </div>
    );
  }

  // 10. SYNTHWAVE SUNSET 1984
  if (templateStyle === 'synthwave-1984') {
    return (
      <div
        className={`w-full max-w-md rounded-2xl p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
          showBackground
            ? 'bg-gradient-to-b from-[#1E0B36] via-[#120422] to-[#090212] border-2 border-fuchsia-500/70 shadow-[0_0_35px_rgba(217,70,239,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-amber-300 font-['Chakra_Petch']">
          <Sun size={14} className="text-amber-400" />
          <span>{title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-black italic tracking-widest font-['Chakra_Petch'] bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300 bg-clip-text text-transparent"
          style={{ filter: 'drop-shadow(0 0 20px rgba(217,70,239,0.7))' }}
        >
          <span>{time.hours}</span>
          <span className="text-pink-400 not-italic" style={colonAnim}> : </span>
          <span>{time.minutes}</span>
          <span className="text-pink-400 not-italic" style={colonAnim}> : </span>
          <span>{time.seconds}</span>
        </div>

        {subathonFootnote('text-fuchsia-400/80')}
      </div>
    );
  }

  // 11. WINDOWS 95 VAPORWAVE
  if (templateStyle === 'vaporwave-90s') {
    return (
      <div
        className={`w-full max-w-md p-2 relative font-sans text-slate-950 transition-all duration-300 flex flex-col items-center space-y-2 ${
          showBackground
            ? 'bg-[#C0C0C0] border-4 border-t-white border-l-white border-r-gray-700 border-b-gray-700 shadow-2xl'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="w-full bg-gradient-to-r from-blue-900 to-teal-700 text-white px-2.5 py-1 flex items-center justify-between text-xs font-bold select-none rounded-t-sm">
          <span>💾 {title}</span>
          <span className="text-[10px] font-mono">_ ▢ X</span>
        </div>

        <div className="p-3 w-full bg-black border-2 border-t-gray-700 border-l-gray-700 border-r-white border-b-white rounded-b-sm flex flex-col items-center space-y-1">
          <div
            className="text-4xl sm:text-6xl font-black font-mono text-teal-400 tracking-widest"
            style={{ textShadow: '0 0 15px #0D9488' }}
          >
            <span>{time.hours}</span>
            <span style={colonAnim}>:</span>
            <span>{time.minutes}</span>
            <span style={colonAnim}>:</span>
            <span>{time.seconds}</span>
          </div>
          {subathonFootnote('text-teal-400/80')}
        </div>
      </div>
    );
  }

  // 12. SPLIT-FLAP AIRPORT CLOCK
  if (templateStyle === 'flip-clock') {
    return (
      <div
        className={`w-full max-w-md p-5 rounded-2xl relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
          showBackground ? 'bg-[#18181B] border-2 border-zinc-700 shadow-2xl' : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
          ✈️ {title}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {[time.hours, time.minutes, time.seconds].map((unit, idx) => (
            <React.Fragment key={idx}>
              <div className="relative px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-[#09090B] border border-zinc-800 shadow-inner flex flex-col items-center overflow-hidden">
                <span className="text-3xl sm:text-5xl font-black font-mono text-white tracking-widest">
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

        {subathonFootnote('text-zinc-400')}
      </div>
    );
  }

  // 13. KAWAII PASTEL DREAM
  if (templateStyle === 'kawaii-pastel') {
    return (
      <div
        className={`w-full max-w-md rounded-3xl p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
          showBackground
            ? 'bg-pink-950/30 backdrop-blur-xl border-2 border-pink-300/40 shadow-[0_0_35px_rgba(244,114,182,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-950/60 border border-pink-300/30 text-xs font-bold text-pink-300">
          <Heart size={13} className="text-pink-400 fill-pink-400" style={showAnimation ? { animation: 'timerHeartbeatBeat 1.5s infinite' } : {}} />
          <span>{title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-black tracking-wider text-pink-200"
          style={{ textShadow: '0 0 20px rgba(244,114,182,0.7)' }}
        >
          <span>{time.hours}</span>
          <span className="text-pink-400" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="text-pink-400" style={colonAnim}>:</span>
          <span className="text-rose-300">{time.seconds}</span>
        </div>

        {subathonFootnote('text-pink-300/80')}
      </div>
    );
  }

  // 14. DEEP SPACE NEBULA
  if (templateStyle === 'cosmic-galaxy') {
    return (
      <div
        className={`w-full max-w-md rounded-2xl p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
          showBackground
            ? 'bg-gradient-to-br from-[#1E1138] via-[#0F0826] to-[#040112] border-2 border-purple-400/60 shadow-[0_0_35px_rgba(139,92,246,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-1.5 text-xs font-bold font-['Chakra_Petch'] uppercase tracking-widest text-purple-300">
          <Star size={13} className="text-yellow-300 fill-yellow-300" />
          <span>{title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-black tracking-widest font-['Chakra_Petch'] text-white"
          style={{ textShadow: '0 0 25px #8B5CF6, 0 0 45px #6D28D9' }}
        >
          {time.days > 0 && <span className="text-purple-300">{time.days}d:</span>}
          <span>{time.hours}</span>
          <span className="text-purple-400" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="text-purple-400" style={colonAnim}>:</span>
          <span className="text-pink-300">{time.seconds}</span>
        </div>

        {subathonFootnote('text-purple-300/80')}
      </div>
    );
  }

  // 15. BIOLUMINESCENT AQUA
  if (templateStyle === 'aqua-marine') {
    return (
      <div
        className={`w-full max-w-md rounded-2xl p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
          showBackground
            ? 'bg-gradient-to-br from-[#041F38] via-[#021324] to-[#010912] border-2 border-cyan-400/60 shadow-[0_0_35px_rgba(6,182,212,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-1.5 text-xs font-bold font-['Chakra_Petch'] uppercase tracking-widest text-cyan-300">
          <Compass size={14} className="text-cyan-400" />
          <span>{title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-black tracking-widest font-mono text-cyan-100"
          style={{ textShadow: '0 0 25px #06B6D4' }}
        >
          <span>{time.hours}</span>
          <span className="text-teal-400" style={colonAnim}> : </span>
          <span>{time.minutes}</span>
          <span className="text-teal-400" style={colonAnim}> : </span>
          <span className="text-cyan-400">{time.seconds}</span>
        </div>

        {subathonFootnote('text-cyan-300/80')}
      </div>
    );
  }

  // 16. COMIC POP ART
  if (templateStyle === 'comic-pop') {
    return (
      <div
        className={`w-full max-w-md p-5 relative font-mono text-black transition-all duration-300 flex flex-col items-center space-y-2 ${
          showBackground
            ? 'bg-[#FFFBEB] border-4 border-black shadow-[6px_6px_0px_#000000]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="px-3 py-0.5 bg-black text-yellow-300 text-xs font-black uppercase tracking-wider rounded-sm">
          💥 {title}
        </div>

        <div
          className="text-5xl sm:text-7xl font-black text-black tracking-wider"
          style={{ textShadow: '3px 3px 0px #F59E0B' }}
        >
          <span>{time.hours}</span>
          <span style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span style={colonAnim}>:</span>
          <span className="text-red-600">{time.seconds}</span>
        </div>

        {subathonFootnote('text-black font-black')}
      </div>
    );
  }

  // 17. MINIMAL STUDIO MONO
  if (templateStyle === 'minimal-studio') {
    return (
      <div
        className={`w-full max-w-md rounded-xl p-5 relative font-sans transition-all duration-300 flex flex-col items-center space-y-2 ${
          showBackground ? 'bg-black/95 border border-slate-800 shadow-xl' : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
          {title}
        </div>

        <div className="text-4xl sm:text-6xl font-light font-mono text-white tracking-widest">
          <span>{time.hours}</span>
          <span className="text-slate-500" style={colonAnim}>:</span>
          <span>{time.minutes}</span>
          <span className="text-slate-500" style={colonAnim}>:</span>
          <span>{time.seconds}</span>
        </div>

        {subathonFootnote('text-slate-500')}
      </div>
    );
  }

  // 18. FROSTED GLASSMORPHISM
  if (templateStyle === 'glass-frost') {
    return (
      <div
        className={`w-full max-w-md rounded-3xl p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
          showBackground
            ? 'bg-white/[0.08] backdrop-blur-2xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white">
          <Sparkles size={13} className="text-purple-300" />
          <span>{title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-black tracking-widest font-mono text-white"
          style={{ textShadow: '0 0 25px rgba(216,180,254,0.6)' }}
        >
          <span>{time.hours}</span>
          <span className="text-purple-300" style={colonAnim}> : </span>
          <span>{time.minutes}</span>
          <span className="text-purple-300" style={colonAnim}> : </span>
          <span className="text-purple-200">{time.seconds}</span>
        </div>

        {subathonFootnote('text-white/60')}
      </div>
    );
  }

  // 19. GOLDEN LUXURY VIP
  if (templateStyle === 'golden-luxury') {
    return (
      <div
        className={`w-full max-w-md rounded-2xl p-5 relative transition-all duration-300 flex flex-col items-center space-y-2.5 ${
          showBackground
            ? 'bg-gradient-to-br from-amber-950/70 via-slate-950/95 to-slate-950 border-2 border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        {animationStyles}
        {bonusToasts}
        <div className="flex items-center gap-1.5 text-xs font-bold font-serif uppercase tracking-widest text-amber-300">
          <Crown size={14} className="text-amber-400" />
          <span>{title}</span>
        </div>

        <div
          className="text-4xl sm:text-6xl font-black font-serif tracking-widest bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
          style={{ filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.6))' }}
        >
          <span>{time.hours}</span>
          <span className="text-amber-500" style={colonAnim}> : </span>
          <span>{time.minutes}</span>
          <span className="text-amber-500" style={colonAnim}> : </span>
          <span>{time.seconds}</span>
        </div>

        {subathonFootnote('text-amber-400/80')}
      </div>
    );
  }

  // 20. STEAMPUNK CLOCKWORK (DEFAULT / FALLBACK)
  return (
    <div
      className={`w-full max-w-md rounded-xl p-5 relative font-serif transition-all duration-300 flex flex-col items-center space-y-2.5 ${
        showBackground
          ? 'bg-[#1C140C] border-4 border-[#B47B36] shadow-[0_0_30px_rgba(180,123,54,0.35)]'
          : 'bg-transparent border-transparent shadow-none'
      }`}
    >
      {animationStyles}
      {bonusToasts}
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E5B869]">
        <Coins size={14} className="text-[#E5B869]" />
        <span>{title}</span>
      </div>

      <div
        className="text-4xl sm:text-6xl font-black tracking-widest font-mono text-[#F3D79B]"
        style={{ textShadow: '0 0 20px #8C5D23' }}
      >
        <span>{time.hours}</span>
        <span className="text-[#B47B36]" style={colonAnim}> : </span>
        <span>{time.minutes}</span>
        <span className="text-[#B47B36]" style={colonAnim}> : </span>
        <span className="text-[#E5B869]">{time.seconds}</span>
      </div>

      {subathonFootnote('text-[#E5B869]/80')}
    </div>
  );
};
