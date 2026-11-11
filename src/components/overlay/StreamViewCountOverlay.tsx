'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';

export interface StreamViewCountOverlayProps {
  token: string;
}

type PlatformId = 'youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick';

// Smooth animated counter component
export const AnimatedCounter: React.FC<{
  value: number;
  duration?: number;
  className?: string;
}> = ({ value, duration = 850, className = '' }) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const [animDirection, setAnimDirection] = useState<'up' | 'down' | 'idle'>('idle');
  const prevValueRef = useRef<number>(value);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const fromVal = prevValueRef.current;
    const toVal = value;
    prevValueRef.current = value;

    if (fromVal === toVal) return;

    setAnimDirection(toVal > fromVal ? 'up' : 'down');

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth natural deceleration
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(fromVal + (toVal - fromVal) * ease);

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(toVal);
        setTimeout(() => setAnimDirection('idle'), 350);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  return (
    <span
      className={`inline-block tabular-nums transition-all duration-300 ${
        animDirection === 'up'
          ? 'scale-[1.07] text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]'
          : animDirection === 'down'
          ? 'scale-[1.05] text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]'
          : 'scale-100 text-white'
      } ${className}`}
    >
      {displayValue.toLocaleString()}
    </span>
  );
};

const PLATFORM_LOGOS: Record<PlatformId, React.ReactNode> = {
  youtube: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FF0000] shrink-0 drop-shadow-[0_0_8px_rgba(255,0,0,0.5)]" aria-label="YouTube">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1877F2] shrink-0 drop-shadow-[0_0_8px_rgba(24,119,242,0.5)]" aria-label="Facebook">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  twitch: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#9146FF] shrink-0 drop-shadow-[0_0_8px_rgba(145,70,255,0.5)]" aria-label="Twitch">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" aria-label="TikTok">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.77 1.81-.03 3.29-1.54 3.32-3.35.03-4.92.01-9.84.02-14.76V.02Z" />
    </svg>
  ),
  // Official Kick.com logo (pixelated K mark)
  kick: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#53FC18] shrink-0 drop-shadow-[0_0_8px_rgba(83,252,24,0.6)]" aria-label="Kick">
      <path d="M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z" />
    </svg>
  )
};

export const StreamViewCountOverlay: React.FC<StreamViewCountOverlayProps> = ({ token }) => {
  const { socket, connected, joinOverlayRoom } = useSocket();
  const effectiveToken = token || 'demo-token';

  const [enabledPlatforms, setEnabledPlatforms] = useState<PlatformId[]>(['youtube', 'facebook']);
  const [totalViewers, setTotalViewers] = useState<number>(1420);
  const [showLiveDot, setShowLiveDot] = useState<boolean>(true);
  const [showLabel, setShowLabel] = useState<boolean>(true);
  const [theme, setTheme] = useState<string>('glass-dark');
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const pulseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Data Fetch
  const loadStats = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/widgets/view-count?token=${effectiveToken}`);
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.settings?.enabledPlatforms) && data.settings.enabledPlatforms.length > 0) {
          setEnabledPlatforms(data.settings.enabledPlatforms);
        } else if (Array.isArray(data.platforms) && data.platforms.length > 0) {
          setEnabledPlatforms(data.platforms);
        }
        if (typeof data.totalViewers === 'number') {
          setTotalViewers(data.totalViewers);
        }
        if (data.settings?.theme) {
          setTheme(data.settings.theme);
        }
        if (data.settings?.showLiveDot !== undefined) {
          setShowLiveDot(Boolean(data.settings.showLiveDot));
        }
        if (data.settings?.showLabel !== undefined) {
          setShowLabel(Boolean(data.settings.showLabel));
        }
      }
    } catch (e) {
      console.error('[ViewCountOverlay] Error fetching stats:', e);
    }
  }, [effectiveToken]);

  useEffect(() => {
    loadStats();
    // Refresh viewers every 12s to track live viewer fluctuations
    const interval = setInterval(loadStats, 12000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // 2. Join Overlay Socket Room
  useEffect(() => {
    if (effectiveToken) {
      joinOverlayRoom(effectiveToken);
    }
  }, [effectiveToken, connected, joinOverlayRoom]);

  // 3. Listen for Real-Time Updates via Socket
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (payload: any) => {
      if (!payload) return;

      if (Array.isArray(payload.platforms)) {
        setEnabledPlatforms(payload.platforms);
      } else if (Array.isArray(payload.settings?.enabledPlatforms)) {
        setEnabledPlatforms(payload.settings.enabledPlatforms);
      }

      if (typeof payload.totalViewers === 'number') {
        setTotalViewers(payload.totalViewers);
      }

      if (payload.settings?.theme) {
        setTheme(payload.settings.theme);
      }
      if (payload.settings?.showLiveDot !== undefined) {
        setShowLiveDot(Boolean(payload.settings.showLiveDot));
      }
      if (payload.settings?.showLabel !== undefined) {
        setShowLabel(Boolean(payload.settings.showLabel));
      }

      // Trigger pulse animation
      setIsPulsing(true);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => setIsPulsing(false), 800);
    };

    socket.on('view_count:update', handleUpdate);
    return () => {
      socket.off('view_count:update', handleUpdate);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, [socket]);

  // Fallback to youtube & facebook if empty
  const activePlatforms = enabledPlatforms.length > 0 ? enabledPlatforms : (['youtube', 'facebook'] as PlatformId[]);

  // Theme container classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'neon-glow':
        return 'bg-slate-950/90 border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(0,240,255,0.4)] text-white';
      case 'minimal-pill':
        return 'bg-black/85 border border-white/20 shadow-2xl text-white rounded-full';
      case 'pure-transparent':
        return 'bg-transparent border-none shadow-none text-white';
      case 'glass-dark':
      default:
        return 'bg-[#0B0F19]/90 backdrop-blur-xl border border-slate-700/70 shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-white';
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2 select-none pointer-events-none">
      <div
        className={`inline-flex items-center gap-3.5 px-5 py-3 rounded-2xl transition-all duration-300 ${getThemeClasses()} ${
          isPulsing ? 'scale-105 ring-2 ring-cyan-400/60 shadow-[0_0_30px_rgba(6,182,212,0.4)]' : 'scale-100'
        }`}
      >
        {/* Ticked Platform Logos (e.g. YouTube & Facebook) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {activePlatforms.map((pid) => (
            <div
              key={pid}
              className="w-8 h-8 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
              title={pid}
            >
              {PLATFORM_LOGOS[pid]}
            </div>
          ))}
        </div>

        {/* Subtle Vertical Divider */}
        <div className="h-6 w-px bg-slate-700/60 shrink-0" />

        {/* Live Red Pulse Dot */}
        {showLiveDot && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
            </span>
          </div>
        )}

        {/* Total Concurrent View Count with Bold Style and Smooth Counter Animation */}
        <div className="flex items-baseline gap-2 shrink-0">
          <AnimatedCounter
            value={totalViewers}
            className="text-2xl sm:text-3xl font-black font-['Chakra_Petch',sans-serif] tracking-tight text-white leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          />
          {showLabel && (
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-300/90 font-['Chakra_Petch',sans-serif]">
              Viewers
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreamViewCountOverlay;
