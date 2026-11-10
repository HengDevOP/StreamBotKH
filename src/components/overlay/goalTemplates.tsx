'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export interface GoalTemplateMeta {
  id: string;
  name: string;
  category: 'Cyber' | 'Gaming' | 'Aesthetic' | 'Retro' | 'Minimal' | 'Special';
  previewColor: string;
  description: string;
}

export const GOAL_TEMPLATES: GoalTemplateMeta[] = [
  {
    id: 'liquid-gradient-shader',
    name: 'Liquid Gradient Shader',
    category: 'Cyber',
    previewColor: '#EC4899',
    description: 'Hyper-dynamic liquid gradient mesh shader with continuous iridescent flow, caustics light sweep, and chromatic aura.'
  },
  {
    id: 'cyber-neon',
    name: 'Cyberpunk Neon',
    category: 'Cyber',
    previewColor: '#00F0FF',
    description: 'Cut-corner polygon frame with electric neon glow and circuit hazard stripes.'
  },
  {
    id: 'golden-luxury',
    name: 'Golden Luxury VIP',
    category: 'Special',
    previewColor: '#F59E0B',
    description: 'Royal obsidian glass with metallic gold border and warm amber-gold gradient.'
  },
  {
    id: 'retro-arcade',
    name: 'Retro 8-Bit Arcade',
    category: 'Retro',
    previewColor: '#EF4444',
    description: 'Chunky pixelated 4px borders, hard drop shadows, and discrete HP block fill.'
  },
  {
    id: 'glass-frost',
    name: 'Glassmorphism Frost',
    category: 'Minimal',
    previewColor: '#A855F7',
    description: 'Frosted translucent glass with ultra backdrop blur and glossy pill capsule.'
  },
  {
    id: 'mecha-hud',
    name: 'Mecha Sci-Fi HUD',
    category: 'Cyber',
    previewColor: '#F97316',
    description: 'Military tactical HUD frame with telemetry bevels and target crosshairs.'
  },
  {
    id: 'kawaii-pastel',
    name: 'Kawaii Pastel Dream',
    category: 'Aesthetic',
    previewColor: '#EC4899',
    description: 'Soft pastel pink bubble capsule with beating heart badge and playful glow.'
  },
  {
    id: 'synthwave-midnight',
    name: 'Synthwave 1984',
    category: 'Retro',
    previewColor: '#D946EF',
    description: 'Outrun sunset gradient (magenta to warm orange) with deep violet midnight aura.'
  },
  {
    id: 'minimal-studio',
    name: 'Minimal Studio',
    category: 'Minimal',
    previewColor: '#E2E8F0',
    description: 'Monochrome Swiss design with razor-thin borders and clean progress bar.'
  },
  {
    id: 'chroma-rgb',
    name: 'Chroma RGB Gaming',
    category: 'Gaming',
    previewColor: '#10B981',
    description: 'Animated rainbow RGB spectrum border with dynamic high-energy esports carbon interior.'
  },
  {
    id: 'matrix-terminal',
    name: 'Matrix CRT Terminal',
    category: 'Cyber',
    previewColor: '#22C55E',
    description: 'Phosphor green CRT scanlines, command-line syntax, and glowing digital progress.'
  },
  {
    id: 'lava-core',
    name: 'Molten Lava Core',
    category: 'Gaming',
    previewColor: '#EA580C',
    description: 'Volcanic magma crimson, intense fiery flame accents, and molten lava progress.'
  },
  {
    id: 'cosmic-galaxy',
    name: 'Cosmic Galaxy',
    category: 'Aesthetic',
    previewColor: '#8B5CF6',
    description: 'Deep celestial void with glowing nebula violet dust and twinkling star reflections.'
  },
  {
    id: 'vaporwave-90s',
    name: '90s Retro Window',
    category: 'Retro',
    previewColor: '#06B6D4',
    description: 'Classic 90s OS window frame with titlebar controls and nostalgic teal tones.'
  },
  {
    id: 'glitch-anarchy',
    name: 'Glitch Anarchy',
    category: 'Cyber',
    previewColor: '#84CC16',
    description: 'Acid lime green with misaligned chromatic aberration offset borders.'
  },
  {
    id: 'aqua-ocean',
    name: 'Aqua Marine Deep',
    category: 'Aesthetic',
    previewColor: '#0EA5E9',
    description: 'Bioluminescent deep-sea ocean turquoise with smooth fluid wave progress fill.'
  },
  {
    id: 'blood-moon',
    name: 'Gothic Blood Moon',
    category: 'Gaming',
    previewColor: '#DC2626',
    description: 'Dark crimson gothic noir with dark soulslike boss health-bar intensity.'
  },
  {
    id: 'steampunk-brass',
    name: 'Steampunk Brass',
    category: 'Special',
    previewColor: '#D97706',
    description: 'Antique copper and warm brass metallic rivet borders with steam gauge aesthetic.'
  },
  {
    id: 'prismatic-holo',
    name: 'Prismatic Hologram',
    category: 'Special',
    previewColor: '#E0E7FF',
    description: 'Iridescent holographic foil with shifting silver-white sheen and clean futuristic aura.'
  },
  {
    id: 'comic-manga',
    name: 'Comic Pop Art',
    category: 'Aesthetic',
    previewColor: '#FBBF24',
    description: 'Bold 4px black ink outlines, halftone dot texture, and explosive pop-art styling.'
  },
  {
    id: 'carbon-tactical',
    name: 'Carbon Tactical Esports',
    category: 'Gaming',
    previewColor: '#84CC16',
    description: 'Woven carbon-fiber twill texture with electric lime accents for competitive broadcasts.'
  }
];

export interface GoalRenderProps {
  title: string;
  targetAmount: number;
  currentAmount: number;
  accentColor?: string;
  templateStyle?: string;
  showBalance?: boolean;
  showBackground?: boolean;
  showAnimation?: boolean;
  showGradientShader?: boolean;
  endDate?: string | null;
  recentDonor?: string | null;
  addedAmount?: number | null;
  width?: number | string;
  goalWidth?: number | string;
  isAnimating?: boolean;
}

export const ProgressBarGradientShader: React.FC<{
  show?: boolean;
  accentColor?: string;
  roundedClass?: string;
}> = ({ show = true, accentColor = '#10B981', roundedClass = 'rounded' }) => {
  if (!show) return null;
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden z-[5] ${roundedClass}`}>
      {/* Dynamic iridescent liquid gradient flow layer */}
      <div
        className="absolute inset-0 opacity-85 mix-blend-screen"
        style={{
          backgroundImage: `linear-gradient(120deg, ${accentColor} 0%, #38BDF8 20%, #A855F7 40%, #EC4899 60%, #F59E0B 80%, ${accentColor} 100%)`,
          backgroundSize: '300% 300%',
          animation: 'goalGradientShaderFlow 3.5s ease infinite, goalGradientShaderHue 12s linear infinite'
        }}
      />
      {/* Secondary chromatic plasma overlay */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: 'radial-gradient(ellipse at center, rgba(255,255,255,0.8) 0%, transparent 70%)',
          backgroundSize: '150% 150%',
          animation: 'goalShaderPlasmaPulse 2.4s ease-in-out infinite'
        }}
      />
      {/* Glinting specular liquid caustics beam */}
      <div
        className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none"
        style={{
          animation: 'goalShaderBeamSweep 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite'
        }}
      />
      {/* Top 3D glass gloss curvature highlight */}
      <div className="absolute top-0 inset-x-0 h-[40%] bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none" />
    </div>
  );
};

export const ContainerGradientShaderAura: React.FC<{
  show?: boolean;
  showBackground?: boolean;
  accentColor?: string;
  borderRadius?: string;
}> = ({ show = true, showBackground = true, accentColor = '#10B981', borderRadius = '1rem' }) => {
  if (!show || !showBackground) return null;
  return (
    <div
      className="absolute -inset-1.5 pointer-events-none opacity-45 blur-xl transition-opacity duration-700 -z-10"
      style={{
        borderRadius,
        backgroundImage: `linear-gradient(125deg, ${accentColor} 0%, #38BDF8 25%, #8B5CF6 50%, #EC4899 75%, #F59E0B 100%)`,
        backgroundSize: '300% 300%',
        animation: 'goalGradientShaderFlow 5s ease infinite, goalGradientShaderHue 14s linear infinite'
      }}
    />
  );
};

export const GoalTemplateRenderer: React.FC<GoalRenderProps> = ({
  title,
  targetAmount,
  currentAmount,
  accentColor = '#10B981',
  templateStyle = 'cyber-neon',
  showBalance = true,
  showBackground = true,
  showAnimation = true,
  showGradientShader = true,
  endDate,
  recentDonor,
  addedAmount,
  width,
  goalWidth,
  isAnimating = false
}) => {
  const exactPercent = Math.min(100, Math.max(0, (currentAmount / (targetAmount || 1)) * 100));
  const percent = Math.round(exactPercent);
  // At 0%, use only 1 bit (1%) of progress bar; at 100%, exactly 100% width and balance
  const barWidthPercent = exactPercent <= 0 ? 1 : Math.max(1, exactPercent);
  const fillTransition = isAnimating ? 'none' : 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)';

  // Shared CSS keyframes for unique progress bar animations
  const animationStyles = (
    <style>{`
      @keyframes cyberStripesMove {
        0% { background-position: 0 0; }
        100% { background-position: 40px 0; }
      }
      @keyframes goldSweepLight {
        0% { transform: translateX(-150%); }
        100% { transform: translateX(250%); }
      }
      @keyframes arcadeStrobeFlash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      @keyframes frostAuroraFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes mechaRadarBeam {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @keyframes kawaiiGlowOscillate {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.25) drop-shadow(0 0 10px #F472B6); }
      }
      @keyframes synthwaveGradientFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes minimalEdgeGlow {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }
      @keyframes chromaHueRotation {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
      @keyframes matrixPhosphorSweep {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @keyframes lavaSurgeWave {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes cosmicStarTwinkle {
        0%, 100% { filter: drop-shadow(0 0 6px #8B5CF6); }
        50% { filter: drop-shadow(0 0 16px #EC4899); }
      }
      @keyframes win95BlockPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.75; }
      }
      @keyframes glitchTwitchStatic {
        0%, 92%, 100% { transform: translate(0, 0); }
        94% { transform: translate(-2px, 1px); }
        96% { transform: translate(2px, -1px); }
        98% { transform: translate(-1px, 1px); }
      }
      @keyframes oceanSwellDrift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes bloodMoonSurge {
        0%, 100% { filter: brightness(1) drop-shadow(0 0 8px #DC2626); }
        50% { filter: brightness(1.3) drop-shadow(0 0 20px #EF4444); }
      }
      @keyframes brassSweepTick {
        0% { transform: translateX(-120%); }
        100% { transform: translateX(220%); }
      }
      @keyframes holoDiffractionFlow {
        0% { filter: hue-rotate(0deg) brightness(1); }
        50% { filter: hue-rotate(60deg) brightness(1.2); }
        100% { filter: hue-rotate(0deg) brightness(1); }
      }
      @keyframes mangaSpeedlinePan {
        0% { background-position: 0 0; }
        100% { background-position: 30px 0; }
      }
      @keyframes tachometerTracerScan {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @keyframes goalGradientShaderFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes goalGradientShaderHue {
        0% { filter: hue-rotate(0deg); }
        50% { filter: hue-rotate(180deg); }
        100% { filter: hue-rotate(360deg); }
      }
      @keyframes goalShaderBeamSweep {
        0% { transform: translateX(-160%) skewX(-20deg); }
        100% { transform: translateX(260%) skewX(-20deg); }
      }
      @keyframes goalShaderPlasmaPulse {
        0%, 100% { opacity: 0.55; }
        50% { opacity: 0.95; }
      }
      @keyframes goalShaderBorderFlow {
        0% { background-position: 0% 0%; }
        50% { background-position: 100% 100%; }
        100% { background-position: 0% 0%; }
      }
    `}</style>
  );

  // 0. LIQUID GRADIENT SHADER (Special Dedicated Shader Template)
  const renderTemplate = () => {
    if (templateStyle === 'liquid-gradient-shader') {
    return (
      <div
        className={`w-full rounded-2xl p-5 sm:p-6 relative transition-all duration-300 ${
          showBackground
            ? 'bg-slate-950/90 backdrop-blur-2xl border border-white/20 shadow-[0_0_40px_rgba(236,72,153,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor={accentColor} borderRadius="1rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-xl bg-slate-950 border border-white/20 p-0.5 overflow-hidden relative shadow-inner">
          <div
            className="h-full rounded-lg bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 relative flex items-center justify-end pr-2 overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.6)]"
            style={{ width: `${barWidthPercent}%`, transition: fillTransition, willChange: isAnimating ? 'width' : 'auto' }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor={accentColor} roundedClass="rounded-lg" />
          </div>
          <div className="absolute inset-0 px-3 sm:px-3.5 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-extrabold font-['Chakra_Petch'] truncate bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-extrabold font-mono text-cyan-300 flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-slate-400 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="text-white font-black">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 1. CYBERPUNK NEON
  if (templateStyle === 'cyber-neon') {
    return (
      <div
        className={`w-full p-5 relative transition-all duration-300 ${
          showBackground ? 'bg-[#070B14]/95 border-2 shadow-2xl' : 'bg-transparent border-transparent shadow-none'
        }`}
        style={{
          borderColor: showBackground ? accentColor : 'transparent',
          boxShadow: showBackground ? `0 0 35px ${accentColor}35` : 'none',
          clipPath: showBackground ? 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' : undefined
        }}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor={accentColor} borderRadius="0.5rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded bg-slate-900/90 border border-slate-800 p-0.5 relative overflow-hidden">
          <div
            className="h-full rounded-sm relative flex items-center justify-end pr-2 overflow-hidden"
            style={{ width: `${barWidthPercent}%`, backgroundColor: accentColor, boxShadow: `0 0 15px ${accentColor}80`, transition: fillTransition, willChange: isAnimating ? 'width' : 'auto' }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor={accentColor} roundedClass="rounded-sm" />
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.7) 10px, rgba(255,255,255,0.7) 20px)',
                backgroundSize: '40px 40px',
                animation: showAnimation ? 'cyberStripesMove 1.5s linear infinite' : 'none'
              }}
            />
          </div>
          <div className="absolute inset-0 px-3 sm:px-3.5 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-extrabold font-mono text-white flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-slate-400 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="text-cyan-300 font-black">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. GOLDEN LUXURY VIP
  if (templateStyle === 'golden-luxury') {
    return (
      <div
        className={`w-full rounded-2xl p-5 sm:p-6 relative transition-all duration-300 ${
          showBackground
            ? 'bg-gradient-to-br from-amber-950/70 via-slate-950/95 to-slate-950 border-2 border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.25)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#F59E0B" borderRadius="1rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-xl bg-amber-950/40 border border-amber-500/30 p-1 relative overflow-hidden shadow-inner">
          <div
            className="h-full rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 relative flex items-center justify-end pr-2 overflow-hidden shadow-[0_0_15px_rgba(251,191,36,0.6)]"
            style={{ width: `${barWidthPercent}%`, transition: fillTransition, willChange: isAnimating ? 'width' : 'auto' }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#F59E0B" roundedClass="rounded-lg" />
            {showAnimation && (
              <div
                className="absolute inset-0 w-2/3 bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none"
                style={{ animation: 'goldSweepLight 2.2s ease-in-out infinite' }}
              />
            )}
          </div>
          <div className="absolute inset-0 px-3 sm:px-3.5 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-bold text-amber-100 font-serif tracking-wide truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-extrabold font-mono text-amber-300 flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-amber-500/80 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="text-amber-100 font-black">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. RETRO 8-BIT ARCADE
  if (templateStyle === 'retro-arcade') {
    return (
      <div
        className={`w-full p-5 relative font-mono transition-all duration-300 ${
          showBackground
            ? 'bg-[#0F172A] border-4 border-black shadow-[6px_6px_0px_#000000]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#10B981" borderRadius="0" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 bg-black border-2 border-slate-700 p-1 flex gap-1 relative overflow-hidden">
          {Array.from({ length: 10 }).map((_, idx) => {
            const filled = exactPercent <= 0 ? idx === 0 : (idx + 1) * 10 <= exactPercent;
            return (
              <div
                key={idx}
                className={`flex-1 h-full relative overflow-hidden ${
                  filled ? 'bg-emerald-400 shadow-[0_0_6px_#10B981]' : 'bg-slate-900 border border-slate-800'
                }`}
                style={{
                  transition: fillTransition,
                  animation: showAnimation && filled ? 'arcadeStrobeFlash 1.2s steps(2, start) infinite' : 'none'
                }}
              >
                {filled && <ProgressBarGradientShader show={showGradientShader} accentColor="#10B981" roundedClass="rounded-none" />}
              </div>
            );
          })}
          <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wider truncate drop-shadow-[0_1px_3px_#000000]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-black text-white flex-shrink-0 drop-shadow-[0_1px_3px_#000000]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(0)} <span className="text-slate-400 font-normal">/ ${targetAmount.toFixed(0)}</span>{' '}
                  <span className="text-yellow-400">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 4. GLASSMORPISM FROST
  if (templateStyle === 'glass-frost') {
    return (
      <div
        className={`w-full rounded-3xl p-5 sm:p-6 relative transition-all duration-300 ${
          showBackground
            ? 'bg-white/[0.08] backdrop-blur-2xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#A855F7" borderRadius="1.5rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-full bg-black/30 border border-white/10 p-0.5 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 shadow-[0_0_15px_rgba(216,180,254,0.5)] overflow-hidden relative"
            style={{
              width: `${barWidthPercent}%`,
              transition: fillTransition,
              willChange: isAnimating ? 'width' : 'auto',
              backgroundSize: '200% 200%',
              animation: showAnimation ? 'frostAuroraFlow 3.5s ease infinite' : 'none'
            }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#A855F7" roundedClass="rounded-full" />
          </div>
          <div className="absolute inset-0 px-3.5 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-semibold text-white truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-white flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-white/60 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="font-extrabold text-pink-200">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 5. MECHA SCI-FI HUD
  if (templateStyle === 'mecha-hud') {
    return (
      <div
        className={`w-full p-5 relative transition-all duration-300 ${
          showBackground
            ? 'bg-[#0B0F19] border-2 border-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.2)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#F97316" borderRadius="0" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 bg-slate-950 border border-orange-500/40 p-0.5 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.7)] relative overflow-hidden"
            style={{ width: `${barWidthPercent}%`, transition: fillTransition, willChange: isAnimating ? 'width' : 'auto' }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#F97316" roundedClass="rounded-none" />
            {showAnimation && (
              <div
                className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none"
                style={{ animation: 'mechaRadarBeam 1.8s ease-in-out infinite' }}
              />
            )}
          </div>
          <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-black text-white font-['Chakra_Petch'] uppercase truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-orange-400 flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(1)}{' '}
                  <span className="text-slate-400 font-normal">/ ${targetAmount.toFixed(1)}</span>{' '}
                  <span className="font-black text-white">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 6. KAWAII PASTEL DREAM
  if (templateStyle === 'kawaii-pastel') {
    return (
      <div
        className={`w-full rounded-3xl p-5 sm:p-6 relative transition-all duration-300 ${
          showBackground
            ? 'bg-pink-950/30 backdrop-blur-xl border-2 border-pink-300/40 shadow-[0_0_30px_rgba(244,114,182,0.25)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#EC4899" borderRadius="1.5rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-full bg-pink-950/60 border border-pink-300/30 p-1 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 relative overflow-hidden"
            style={{
              width: `${barWidthPercent}%`,
              transition: fillTransition,
              willChange: isAnimating ? 'width' : 'auto',
              animation: showAnimation ? 'kawaiiGlowOscillate 2s ease-in-out infinite' : 'none'
            }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#EC4899" roundedClass="rounded-full" />
          </div>
          <div className="absolute inset-0 px-3.5 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-extrabold text-white truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-pink-300 flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-pink-400/70 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="font-extrabold text-white">💖 {percent}%</span>
                </>
              ) : (
                `💖 ${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 7. SYNTHWAVE MIDNIGHT 1984
  if (templateStyle === 'synthwave-midnight') {
    return (
      <div
        className={`w-full rounded-2xl p-5 relative transition-all duration-300 ${
          showBackground
            ? 'bg-gradient-to-b from-[#1E0B36] via-[#120422] to-[#090212] border-2 border-fuchsia-500/70 shadow-[0_0_35px_rgba(217,70,239,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#D946EF" borderRadius="1rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-lg bg-slate-950 border border-fuchsia-500/40 p-0.5 overflow-hidden relative">
          <div
            className="h-full rounded-md bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 shadow-[0_0_15px_#D946EF] relative overflow-hidden"
            style={{
              width: `${barWidthPercent}%`,
              transition: fillTransition,
              willChange: isAnimating ? 'width' : 'auto',
              backgroundSize: '200% 200%',
              animation: showAnimation ? 'synthwaveGradientFlow 3s ease infinite' : 'none'
            }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#D946EF" roundedClass="rounded-md" />
          </div>
          <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-extrabold text-white font-['Chakra_Petch'] truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-extrabold font-mono text-cyan-300 flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-fuchsia-400/70 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="font-black text-amber-300">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 8. MINIMAL STUDIO
  if (templateStyle === 'minimal-studio') {
    return (
      <div
        className={`w-full rounded-xl p-5 relative font-sans transition-all duration-300 ${
          showBackground ? 'bg-black/95 border border-slate-800 shadow-xl' : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor={accentColor} borderRadius="0.75rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-lg bg-slate-900 border border-slate-800 p-0.5 overflow-hidden relative">
          <div
            className="h-full rounded-md bg-white relative overflow-hidden"
            style={{ width: `${barWidthPercent}%`, transition: fillTransition, willChange: isAnimating ? 'width' : 'auto' }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor={accentColor} roundedClass="rounded-md" />
            {showAnimation && (
              <div
                className="absolute right-0 top-0 bottom-0 w-2 bg-cyan-300 rounded-full"
                style={{ animation: 'minimalEdgeGlow 1.4s ease-in-out infinite' }}
              />
            )}
          </div>
          <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono text-slate-300 flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-slate-500 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="font-bold text-white">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 9. CHROMA RGB GAMING
  if (templateStyle === 'chroma-rgb') {
    return (
      <div
        className={`w-full rounded-2xl relative transition-all duration-300 ${
          showBackground
            ? 'p-[2px] bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-cyan-400 via-blue-500 to-purple-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
            : 'p-0 bg-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#10B981" borderRadius="1rem" />
        {animationStyles}
        <div className={`w-full rounded-2xl p-5 ${showBackground ? 'bg-[#090D18]' : 'bg-transparent'}`}>
          <div className="w-full h-8 sm:h-9 rounded-lg bg-slate-950 border border-slate-800 p-0.5 overflow-hidden relative">
            <div
              className="h-full rounded bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 relative overflow-hidden"
              style={{
                width: `${barWidthPercent}%`,
                transition: fillTransition,
                willChange: isAnimating ? 'width' : 'auto',
                animation: showAnimation ? 'chromaHueRotation 3s linear infinite' : 'none'
              }}
            >
              <ProgressBarGradientShader show={showGradientShader} accentColor="#10B981" roundedClass="rounded" />
            </div>
            <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
              <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                {title}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-white flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                {showBalance ? (
                  <>
                    ${currentAmount.toFixed(2)}{' '}
                    <span className="text-slate-400 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                    <span className="font-black text-emerald-300">({percent}%)</span>
                  </>
                ) : (
                  `${percent}%`
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 10. MATRIX CRT TERMINAL
  if (templateStyle === 'matrix-terminal') {
    return (
      <div
        className={`w-full p-5 relative font-mono text-emerald-400 transition-all duration-300 ${
          showBackground
            ? 'bg-black border-2 border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#10B981" borderRadius="0" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 bg-slate-950 border border-emerald-500/40 p-0.5 overflow-hidden relative">
          <div
            className="h-full bg-emerald-500 relative overflow-hidden"
            style={{ width: `${barWidthPercent}%`, transition: fillTransition, willChange: isAnimating ? 'width' : 'auto' }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#10B981" roundedClass="rounded-none" />
            {showAnimation && (
              <div
                className="absolute inset-y-0 w-6 bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none"
                style={{ animation: 'matrixPhosphorSweep 1.6s linear infinite' }}
              />
            )}
          </div>
          <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-bold text-emerald-300 truncate drop-shadow-[0_1px_3px_#000000]">
              &gt; {title}
            </span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 flex-shrink-0 drop-shadow-[0_1px_3px_#000000]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-emerald-700 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="text-white font-black">[{percent}%]</span>
                </>
              ) : (
                `[${percent}%]`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 11. MOLTEN LAVA CORE
  if (templateStyle === 'lava-core') {
    return (
      <div
        className={`w-full rounded-2xl p-5 relative transition-all duration-300 ${
          showBackground
            ? 'bg-gradient-to-br from-red-950/80 via-black to-slate-950 border-2 border-orange-500/70 shadow-[0_0_35px_rgba(234,88,12,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#EA580C" borderRadius="1rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-xl bg-black border border-orange-500/40 p-0.5 overflow-hidden relative">
          <div
            className="h-full rounded-lg bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 relative overflow-hidden"
            style={{
              width: `${barWidthPercent}%`,
              transition: fillTransition,
              willChange: isAnimating ? 'width' : 'auto',
              backgroundSize: '200% 200%',
              animation: showAnimation ? 'lavaSurgeWave 2.5s ease-in-out infinite' : 'none'
            }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#EA580C" roundedClass="rounded-lg" />
          </div>
          <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-extrabold text-white font-['Chakra_Petch'] truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-orange-300 flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-orange-500 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="font-black text-amber-200">🔥 {percent}%</span>
                </>
              ) : (
                `🔥 ${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 12. COSMIC GALAXY
  if (templateStyle === 'cosmic-galaxy') {
    return (
      <div
        className={`w-full rounded-2xl p-5 relative transition-all duration-300 ${
          showBackground
            ? 'bg-gradient-to-br from-[#1E1138] via-[#0F0826] to-[#040112] border-2 border-purple-400/60 shadow-[0_0_35px_rgba(139,92,246,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#8B5CF6" borderRadius="1rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-full bg-slate-950 border border-purple-500/30 p-1 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400 relative overflow-hidden"
            style={{
              width: `${barWidthPercent}%`,
              transition: fillTransition,
              willChange: isAnimating ? 'width' : 'auto',
              animation: showAnimation ? 'cosmicStarTwinkle 2.5s ease-in-out infinite' : 'none'
            }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#8B5CF6" roundedClass="rounded-full" />
          </div>
          <div className="absolute inset-0 px-3.5 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-purple-200 flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-purple-400 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="font-black text-pink-200">✨ {percent}%</span>
                </>
              ) : (
                `✨ ${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 13. VAPORWAVE 90S WINDOW
  if (templateStyle === 'vaporwave-90s') {
    return (
      <div
        className={`w-full p-2 relative font-sans text-slate-950 transition-all duration-300 ${
          showBackground
            ? 'bg-[#C0C0C0] border-4 border-t-white border-l-white border-r-gray-700 border-b-gray-700 shadow-2xl'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#06B6D4" borderRadius="0.25rem" />
        {animationStyles}
        <div className="bg-gradient-to-r from-blue-900 to-teal-700 text-white px-2.5 py-1 flex items-center justify-between text-xs font-bold mb-2.5 select-none rounded-t-sm">
          <span className="truncate">Goal Tracker.exe</span>
          <span className="font-mono text-cyan-200 font-bold ml-2">[{percent}%]</span>
        </div>
        <div className="p-2.5 bg-gray-100 border-2 border-t-gray-700 border-l-gray-700 border-r-white border-b-white rounded-b-sm">
          <div className="w-full h-8 sm:h-9 bg-white border-2 border-t-gray-700 border-l-gray-700 border-r-white border-b-white p-0.5 flex gap-1 relative overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => {
              const active = exactPercent <= 0 ? i === 0 : (i + 1) * 8.33 <= exactPercent;
              return (
                <div
                  key={i}
                  className={`flex-1 h-full relative overflow-hidden ${active ? 'bg-teal-600' : 'bg-transparent'}`}
                  style={{
                    transition: fillTransition,
                    animation: showAnimation && active ? 'win95BlockPulse 1.2s ease-in-out infinite' : 'none'
                  }}
                >
                  {active && <ProgressBarGradientShader show={showGradientShader} accentColor="#0D9488" roundedClass="rounded-none" />}
                </div>
              );
            })}
            <div className="absolute inset-0 px-2.5 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
              <span className="text-xs font-bold text-slate-900 truncate drop-shadow-[0_1px_1px_#ffffff]">
                {title}
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 flex-shrink-0 drop-shadow-[0_1px_1px_#ffffff]">
                {showBalance ? (
                  <>
                    ${currentAmount.toFixed(2)}{' '}
                    <span className="text-slate-600 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                    <span>({percent}%)</span>
                  </>
                ) : (
                  `${percent}%`
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 14. GLITCH ANARCHY
  if (templateStyle === 'glitch-anarchy') {
    return (
      <div
        className={`w-full p-5 relative transition-all duration-300 ${
          showBackground
            ? 'bg-[#080808] border-2 border-lime-400 shadow-[5px_5px_0px_#EF4444]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#84CC16" borderRadius="0" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 bg-black border border-lime-400 p-0.5 overflow-hidden relative">
          <div
            className="h-full bg-lime-400 relative overflow-hidden"
            style={{
              width: `${barWidthPercent}%`,
              transition: fillTransition,
              willChange: isAnimating ? 'width' : 'auto',
              animation: showAnimation ? 'glitchTwitchStatic 2.5s steps(1) infinite' : 'none'
            }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#84CC16" roundedClass="rounded-sm" />
          </div>
          <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider truncate drop-shadow-[0_1px_3px_#000000]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-lime-400 flex-shrink-0 drop-shadow-[0_1px_3px_#000000]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-red-400 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="text-white font-black">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 15. AQUA MARINE DEEP
  if (templateStyle === 'aqua-ocean') {
    return (
      <div
        className={`w-full rounded-2xl p-5 relative transition-all duration-300 ${
          showBackground
            ? 'bg-gradient-to-br from-[#041F38] via-[#021324] to-[#010912] border-2 border-cyan-400/60 shadow-[0_0_35px_rgba(6,182,212,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#0EA5E9" borderRadius="1rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-xl bg-slate-950 border border-cyan-500/40 p-0.5 overflow-hidden relative">
          <div
            className="h-full rounded-lg bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-300 relative overflow-hidden"
            style={{
              width: `${barWidthPercent}%`,
              transition: fillTransition,
              willChange: isAnimating ? 'width' : 'auto',
              backgroundSize: '200% 200%',
              animation: showAnimation ? 'oceanSwellDrift 3.5s ease-in-out infinite' : 'none'
            }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#0EA5E9" roundedClass="rounded-lg" />
          </div>
          <div className="absolute inset-0 px-3 sm:px-3.5 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-cyan-200 flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-cyan-500 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="text-white font-black">🌊 {percent}%</span>
                </>
              ) : (
                `🌊 ${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 16. GOTHIC BLOOD MOON
  if (templateStyle === 'blood-moon') {
    return (
      <div
        className={`w-full rounded-2xl p-5 relative transition-all duration-300 ${
          showBackground
            ? 'bg-gradient-to-br from-[#240306] via-[#120103] to-black border-2 border-red-600/70 shadow-[0_0_35px_rgba(220,38,38,0.35)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#DC2626" borderRadius="1rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded bg-black border border-red-800 p-0.5 overflow-hidden relative">
          <div
            className="h-full rounded-sm bg-gradient-to-r from-red-700 via-red-600 to-rose-500 relative overflow-hidden"
            style={{
              width: `${barWidthPercent}%`,
              transition: fillTransition,
              willChange: isAnimating ? 'width' : 'auto',
              animation: showAnimation ? 'bloodMoonSurge 1.8s ease-in-out infinite' : 'none'
            }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#DC2626" roundedClass="rounded-sm" />
          </div>
          <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-bold text-white font-serif tracking-wider uppercase truncate drop-shadow-[0_1px_3px_#000000]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-red-300 flex-shrink-0 drop-shadow-[0_1px_3px_#000000]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-red-500 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="text-white font-black">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 17. STEAMPUNK BRASS
  if (templateStyle === 'steampunk-brass') {
    return (
      <div
        className={`w-full rounded-xl p-5 relative font-serif transition-all duration-300 ${
          showBackground
            ? 'bg-[#1C140C] border-4 border-[#B47B36] shadow-[0_0_25px_rgba(180,123,54,0.3)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#D97706" borderRadius="0.75rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-lg bg-black border-2 border-[#8C5D23] p-0.5 overflow-hidden relative">
          <div
            className="h-full rounded bg-gradient-to-r from-[#8C5D23] via-[#B47B36] to-[#E5B869] relative overflow-hidden"
            style={{ width: `${barWidthPercent}%`, transition: fillTransition, willChange: isAnimating ? 'width' : 'auto' }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#D97706" roundedClass="rounded" />
            {showAnimation && (
              <div
                className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-amber-100/70 to-transparent pointer-events-none"
                style={{ animation: 'brassSweepTick 2.4s ease-in-out infinite' }}
              />
            )}
          </div>
          <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#F3D79B] tracking-wide truncate drop-shadow-[0_1px_3px_#000000]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-[#F3D79B] flex-shrink-0 drop-shadow-[0_1px_3px_#000000]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-[#8C5D23] font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="font-bold text-white">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 18. PRISMATIC HOLOGRAM
  if (templateStyle === 'prismatic-holo') {
    return (
      <div
        className={`w-full rounded-2xl p-5 sm:p-6 relative transition-all duration-300 ${
          showBackground
            ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-400/50 shadow-[0_0_35px_rgba(255,255,255,0.2)]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#E0E7FF" borderRadius="1rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-xl bg-slate-950 border border-white/20 p-0.5 overflow-hidden relative">
          <div
            className="h-full rounded-lg bg-gradient-to-r from-sky-300 via-indigo-300 via-pink-300 to-yellow-200 relative overflow-hidden"
            style={{
              width: `${barWidthPercent}%`,
              transition: fillTransition,
              willChange: isAnimating ? 'width' : 'auto',
              animation: showAnimation ? 'holoDiffractionFlow 3s ease-in-out infinite' : 'none'
            }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#E0E7FF" roundedClass="rounded-lg" />
          </div>
          <div className="absolute inset-0 px-3 sm:px-3.5 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-white flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-slate-400 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="font-bold text-yellow-200">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 19. COMIC POP ART
  if (templateStyle === 'comic-manga') {
    return (
      <div
        className={`w-full p-5 relative text-black transition-all duration-300 ${
          showBackground
            ? 'bg-[#FFFBEB] border-4 border-black shadow-[6px_6px_0px_#000000]'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#FBBF24" borderRadius="0" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 bg-white border-4 border-black p-0.5 overflow-hidden relative">
          <div
            className="h-full bg-yellow-400 border-r-2 border-black relative overflow-hidden"
            style={{ width: `${barWidthPercent}%`, transition: fillTransition, willChange: isAnimating ? 'width' : 'auto' }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#FBBF24" roundedClass="rounded-none" />
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, #000 8px, #000 16px)',
                backgroundSize: '30px 30px',
                animation: showAnimation ? 'mangaSpeedlinePan 1.2s linear infinite' : 'none'
              }}
            />
          </div>
          <div className="absolute inset-0 px-3 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-black uppercase tracking-tight truncate drop-shadow-[0_1px_2px_#ffffff]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-black flex-shrink-0 drop-shadow-[0_1px_2px_#ffffff]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(0)} <span className="text-slate-600 font-normal">/ ${targetAmount.toFixed(0)}</span>{' '}
                  <span className="text-black font-black">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

    // 20. CARBON TACTICAL ESPORTS (DEFAULT / FALLBACK)
    return (
      <div
        className={`w-full rounded-2xl p-5 relative transition-all duration-300 ${
          showBackground
            ? 'bg-[#090D18] border-2 border-slate-800 shadow-2xl'
            : 'bg-transparent border-transparent shadow-none'
        }`}
      >
        <ContainerGradientShaderAura show={showGradientShader} showBackground={showBackground} accentColor="#84CC16" borderRadius="1rem" />
        {animationStyles}
        <div className="w-full h-8 sm:h-9 rounded-xl bg-slate-950 border border-slate-800 p-0.5 overflow-hidden relative">
          <div
            className="h-full rounded-lg bg-gradient-to-r from-lime-500 to-emerald-400 relative overflow-hidden"
            style={{ width: `${barWidthPercent}%`, transition: fillTransition, willChange: isAnimating ? 'width' : 'auto' }}
          >
            <ProgressBarGradientShader show={showGradientShader} accentColor="#84CC16" roundedClass="rounded-lg" />
            {showAnimation && (
              <div
                className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-lime-200/90 to-transparent pointer-events-none"
                style={{ animation: 'tachometerTracerScan 1.6s ease-in-out infinite' }}
              />
            )}
          </div>
          <div className="absolute inset-0 px-3 sm:px-3.5 flex items-center justify-between z-10 pointer-events-none select-none gap-2">
            <span className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {title}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-white flex-shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {showBalance ? (
                <>
                  ${currentAmount.toFixed(2)}{' '}
                  <span className="text-slate-400 font-normal">/ ${targetAmount.toFixed(2)}</span>{' '}
                  <span className="font-black text-lime-300">({percent}%)</span>
                </>
              ) : (
                `${percent}%`
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const resolvedWidth = width || goalWidth || 500;
  const maxWidthValue = typeof resolvedWidth === 'number' ? `${resolvedWidth}px` : resolvedWidth;

  return (
    <div
      className="w-full max-w-full min-w-0 flex justify-center mx-auto transition-all duration-300 overflow-hidden"
      style={{ maxWidth: maxWidthValue }}
    >
      {renderTemplate()}
    </div>
  );
};
