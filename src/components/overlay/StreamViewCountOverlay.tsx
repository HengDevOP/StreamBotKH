'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';

export interface StreamViewCountOverlayProps {
  token: string;
}

type PlatformId = 'youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick' | 'instagram';

// Smooth animated counter component
export const AnimatedCounter: React.FC<{
  value: number;
  duration?: number;
  className?: string;
}> = ({ value, duration = 800, className = '' }) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const fromVal = prevValueRef.current;
    const toVal = value;
    prevValueRef.current = value;

    if (fromVal === toVal) return;

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(fromVal + (toVal - fromVal) * ease);

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(toVal);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  return (
    <span className={`inline-block tabular-nums transition-transform duration-200 ${className}`}>
      {displayValue.toLocaleString()}
    </span>
  );
};

const PLATFORM_LOGOS: Record<PlatformId, React.ReactNode> = {
  youtube: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FF0000] shrink-0" aria-label="YouTube">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1877F2] shrink-0" aria-label="Facebook">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  twitch: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#9146FF] shrink-0" aria-label="Twitch">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0" aria-label="TikTok">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.77 1.81-.03 3.29-1.54 3.32-3.35.03-4.92.01-9.84.02-14.76V.02Z" />
    </svg>
  ),
  kick: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#53FC18] shrink-0" aria-label="Kick">
      <path d="M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-label="Instagram">
      <defs>
        <radialGradient id="ig-grad-viewcount" cx="20%" cy="110%" r="130%">
          <stop offset="0%" stopColor="#FFDD55" />
          <stop offset="10%" stopColor="#FFDD55" />
          <stop offset="50%" stopColor="#FF543E" />
          <stop offset="80%" stopColor="#C837AB" />
          <stop offset="100%" stopColor="#3772FF" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad-viewcount)" />
      <path
        fill="#ffffff"
        transform="translate(3.6, 3.6) scale(0.7)"
        d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"
      />
    </svg>
  )
};

export const StreamViewCountOverlay: React.FC<StreamViewCountOverlayProps> = ({ token }) => {
  const { socket, connected, joinOverlayRoom } = useSocket();
  const effectiveToken = token || 'demo-token';

  const [enabledPlatforms, setEnabledPlatforms] = useState<PlatformId[]>(['youtube', 'facebook']);
  const [totalViewers, setTotalViewers] = useState<number>(0);

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
      }
    } catch (e) {
      console.error('[ViewCountOverlay] Error fetching stats:', e);
    }
  }, [effectiveToken]);

  useEffect(() => {
    loadStats();
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
    };

    socket.on('view_count:update', handleUpdate);
    return () => {
      socket.off('view_count:update', handleUpdate);
    };
  }, [socket]);

  const activePlatforms = enabledPlatforms.length > 0 ? enabledPlatforms : (['youtube', 'facebook'] as PlatformId[]);

  return (
    <div className="w-full h-full flex items-center justify-start p-2 select-none pointer-events-none">
      <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 text-white shadow-md">
        {/* Ticked Platform Logos side-by-side */}
        <div className="flex items-center gap-2 shrink-0">
          {activePlatforms.map((pid) => (
            <div key={pid} className="shrink-0 flex items-center justify-center">
              {PLATFORM_LOGOS[pid]}
            </div>
          ))}
        </div>

        {/* Concurrent View Count (Bold with smooth animated number transition) */}
        <AnimatedCounter
          value={totalViewers}
          className="text-lg sm:text-xl font-bold font-mono tracking-tight text-white"
        />
      </div>
    </div>
  );
};

export default StreamViewCountOverlay;
