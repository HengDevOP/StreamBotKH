'use client';

import React, { useState } from 'react';
import {
  Bell,
  Volume2,
  Target,
  MessageSquare,
  Video,
  Crown
} from 'lucide-react';

interface SatelliteNode {
  id: string;
  title: string;
  icon: React.ElementType;
  pos: { left: string; top: string };
  // Connection line path starting at child card and terminating INTO main card
  path: string;
  portPoint: { x: number; y: number };
}

const SATELLITE_NODES: SatelliteNode[] = [
  // 1. Top-Center Card: Alert Box (starts at card, connects INTO top edge of main card)
  {
    id: 'alerts',
    title: 'Alert Box',
    icon: Bell,
    pos: { left: '25%', top: '2%' },
    path: 'M 290 46 L 330 46 L 330 87',
    portPoint: { x: 330, y: 87 }
  },
  // 2. Top-Left Card: Khmer AI TTS (starts at card, connects INTO left edge of main card)
  {
    id: 'tts',
    title: 'Khmer AI TTS',
    icon: Volume2,
    pos: { left: '1%', top: '6%' },
    path: 'M 60 64 L 60 145 L 120 145',
    portPoint: { x: 120, y: 145 }
  },
  // 3. Bottom-Left Card: Goal Tracker (starts at card, connects INTO bottom edge of main card)
  {
    id: 'goal',
    title: 'Goal Tracker',
    icon: Target,
    pos: { left: '1%', top: '73%' },
    path: 'M 60 372 L 60 420 L 180 420 L 180 373',
    portPoint: { x: 180, y: 373 }
  },
  // 4. Top-Right Card: Live Chat (starts at card, connects INTO right edge of main card)
  {
    id: 'chat',
    title: 'Live Chat',
    icon: MessageSquare,
    pos: { left: '77%', top: '6%' },
    path: 'M 530 64 L 530 145 L 480 145',
    portPoint: { x: 480, y: 145 }
  },
  // 5. Middle-Right Card: Video Share (starts at card, connects INTO right edge of main card)
  {
    id: 'video',
    title: 'Video Share',
    icon: Video,
    pos: { left: '81%', top: '45%' },
    path: 'M 486 225 L 480 225',
    portPoint: { x: 480, y: 225 }
  },
  // 6. Bottom-Right Card: Leaderboard (starts at card, connects INTO bottom edge of main card)
  {
    id: 'leaderboard',
    title: 'Leaderboard',
    icon: Crown,
    pos: { left: '54%', top: '88%' },
    path: 'M 380 405 L 380 373',
    portPoint: { x: 380, y: 373 }
  }
];

export const HomeHeroStreamCanvas: React.FC = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  return (
    <div className="home-stream-canvas-root relative w-full max-w-[580px] sm:max-w-[720px] lg:max-w-[820px] xl:max-w-[880px] 2xl:max-w-[960px] mx-auto aspect-[600/440] select-none">
      {/* Dynamic Ambient Background Glow beneath central screen */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[280px] bg-white/5 blur-[90px] rounded-full pointer-events-none -z-10" />

      {/* SVG Circuit Connector Lines (Leading FROM Child Cards INTO Main Card) */}
      <svg
        viewBox="0 0 600 460"
        className="home-stream-canvas-svg absolute inset-0 w-full h-full pointer-events-none z-10"
      >
        <defs>
          <filter id="circuitGlowWhite" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {SATELLITE_NODES.map((node, index) => {
          const isHighlighted = activeNode === node.id;
          const animDelay = `${index * 1.3}s`;

          return (
            <g
              key={`circuit-${node.id}`}
              className="circuit-line-cycle"
              style={{ animationDelay: animDelay }}
            >
              {/* Base structural wire trace */}
              <path
                d={node.path}
                className="circuit-base-trace"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Animated energy pulse packet traveling FROM child card INTO main card */}
              <path
                d={node.path}
                className="circuit-pulse-trace"
                stroke={isHighlighted ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)'}
                strokeWidth={isHighlighted ? 2.5 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="10 32"
                fill="none"
                filter="url(#circuitGlowWhite)"
              />

              {/* Receiving Port connection dot on the center main card */}
              <circle
                cx={node.portPoint.x}
                cy={node.portPoint.y}
                r={isHighlighted ? 4.5 : 3}
                className="circuit-port-dot transition-all duration-200"
                fill="#FFFFFF"
                filter="url(#circuitGlowWhite)"
              />
            </g>
          );
        })}
      </svg>

      {/* ============================================================== */}
      {/* 1. HUGE MAIN CARD: "LIVESTREAM" ONLY (No Live Dot, No Modal)   */}
      {/* Position in 600x460: left: 20%, top: 19%, w: 60%, h: 62%        */}
      {/* ============================================================== */}
      <div
        className="home-center-screen absolute left-[20%] top-[19%] w-[60%] h-[62%] rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0C1222]/95 via-[#070A14]/95 to-[#090E1D]/95 border-2 border-white/20 shadow-[0_0_55px_rgba(255,255,255,0.08)] backdrop-blur-2xl z-20 flex items-center justify-center overflow-hidden transition-all duration-300 hover:border-white/40"
      >
        {/* Subtle Ambient Cyber Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />

        {/* Center Radial Soft Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        {/* High-tech Corner Accents */}
        <div className="absolute top-2.5 left-2.5 w-2.5 h-2.5 border-t-2 border-l-2 border-white/40 pointer-events-none" />
        <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 border-t-2 border-r-2 border-white/40 pointer-events-none" />
        <div className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 border-b-2 border-l-2 border-white/40 pointer-events-none" />
        <div className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 border-b-2 border-r-2 border-white/40 pointer-events-none" />

        {/* Center Text: LIVESTREAM Only (No Live Dot) */}
        <div className="relative z-10 flex items-center justify-center px-4 select-none">
          <span className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white font-['Chakra_Petch'] uppercase tracking-wider sm:tracking-[0.18em] leading-none drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]">
            LIVESTREAM
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CHILDS CARDS: Expanded for Full View Content (No Truncation) */}
      {/* Gradient Design, Raw Icon, Title Full View, Slide Fade Reconnect*/}
      {/* ============================================================== */}
      {SATELLITE_NODES.map((node, index) => {
        const IconComp = node.icon;
        const isHovered = activeNode === node.id;
        const animDelay = `${index * 1.3}s`;

        return (
          <div
            key={node.id}
            onMouseEnter={() => setActiveNode(node.id)}
            onMouseLeave={() => setActiveNode(null)}
            style={{
              left: node.pos.left,
              top: node.pos.top,
              animationDelay: animDelay
            }}
            className={`home-satellite-card animate-card-fade-cycle absolute rounded-xl px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 border transition-all duration-300 cursor-pointer z-30 flex items-center gap-2 sm:gap-2.5 md:gap-3 shadow-lg backdrop-blur-xl whitespace-nowrap ${
              isHovered
                ? 'bg-gradient-to-r from-white/[0.22] via-slate-800/95 to-slate-900/95 border-white shadow-[0_0_24px_rgba(255,255,255,0.25)] scale-105'
                : 'bg-gradient-to-r from-white/[0.12] via-slate-900/90 to-slate-950/95 border-white/20 hover:border-white/40'
            }`}
          >
            {/* Node Icon: Raw icon, no background box and no border */}
            <IconComp
              size={17}
              className="text-white shrink-0 sm:size-[18px] md:size-5 transition-transform duration-200"
            />

            {/* Node Content: Title Full View (No truncate, expands to full content) */}
            <span className="home-node-title text-[9px] sm:text-[11px] md:text-xs lg:text-sm font-bold text-white whitespace-nowrap font-['Chakra_Petch'] tracking-wide">
              {node.title}
            </span>
          </div>
        );
      })}
    </div>
  );
};
