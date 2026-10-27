'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Sparkles, Tv, Clock } from 'lucide-react';

export interface VideoPlayerWithProgressBarProps {
  videoId: string;
  startTime?: number;
  endTime?: number;
  autoplay?: boolean;
  muted?: boolean;
  videoTitle?: string;
  donorName?: string;
  amount?: number;
  currency?: string;
  glowColor?: string;
  showControls?: boolean;
  isPreview?: boolean;
  onEnded?: () => void;
  className?: string;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const VideoPlayerWithProgressBar: React.FC<VideoPlayerWithProgressBarProps> = ({
  videoId,
  startTime = 0,
  endTime = 30,
  autoplay = true,
  muted = false,
  videoTitle,
  donorName,
  amount,
  currency = 'USD',
  glowColor = '#00F0FF',
  showControls = false,
  isPreview = false,
  onEnded,
  className = ''
}) => {
  const safeStart = Math.max(0, startTime);
  const safeEnd = Math.max(safeStart + 1, endTime);
  const totalDuration = safeEnd - safeStart;

  const [isPlaying, setIsPlaying] = useState<boolean>(autoplay);
  const [elapsed, setElapsed] = useState<number>(0);
  const [renderKey, setRenderKey] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Remaining countdown seconds (from full duration down to 0)
  const remaining = Math.max(0, totalDuration - elapsed);
  // Countdown percentage (from 100% down to 0%)
  const countdownPct = totalDuration > 0 ? (remaining / totalDuration) * 100 : 0;
  // Progress elapsed percentage (from 0% up to 100%)
  const elapsedPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

  // Reset timer when videoId, startTime, or endTime changes
  useEffect(() => {
    setElapsed(0);
    setIsPlaying(autoplay);
    setRenderKey((k) => k + 1);
  }, [videoId, safeStart, safeEnd, autoplay]);

  // Real-time ticking loop for the countdown bar (with 1.2s buffer for YouTube iframe buffering)
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const startDelayTimer = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= totalDuration) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            // Allow clip to finish playing completely to the last frame before triggering onEnded
            setTimeout(() => {
              if (onEnded) onEnded();
            }, 800);
            return totalDuration;
          }
          return next;
        });
      }, 1000);
    }, 1200);

    return () => {
      clearTimeout(startDelayTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalDuration, onEnded]);

  const handleRestart = () => {
    setElapsed(0);
    setIsPlaying(true);
    setRenderKey((k) => k + 1);
  };

  const handleTogglePlay = () => {
    if (elapsed >= totalDuration) {
      handleRestart();
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const formattedAmount =
    currency === 'KHR'
      ? `${(amount || 0).toLocaleString()} ៛`
      : `$${Number(amount || 0).toFixed(2)}`;

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl group select-none flex flex-col ${className}`}
      style={{
        boxShadow: `0 0 30px ${glowColor}25, 0 8px 32px rgba(0,0,0,0.85)`
      }}
    >
      {/* Top Header: Donor on the top of the video */}
      {donorName && (
        <div className="w-full px-4 py-2 bg-slate-950/95 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Sparkles size={13} style={{ color: glowColor || '#00F0FF' }} />
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              DONOR:
            </span>
            <span
              className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] tracking-wide"
              style={{
                textShadow: glowColor ? `0 0 10px ${glowColor}88` : undefined
              }}
            >
              {donorName}
            </span>
          </div>
        </div>
      )}

      {/* 100% Clean Video Area (No Amount, No Title, No Message) */}
      <div className="relative w-full aspect-video bg-black overflow-hidden">
        <iframe
          key={renderKey}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&mute=${muted ? 1 : 0}&controls=${showControls ? 1 : 0}&start=${safeStart}&end=${safeEnd}&enablejsapi=1`}
          title={videoTitle || 'YouTube Media Share'}
          className="w-full h-full pointer-events-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />

        {/* Optional Preview Play/Pause button on preview screen only */}
        {isPreview && (
          <button
            type="button"
            onClick={handleTogglePlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors pointer-events-auto"
            title={isPlaying ? 'Pause preview' : 'Play preview'}
          >
            {!isPlaying && (
              <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transform hover:scale-110 transition-transform">
                <Play size={24} className="fill-white ml-1" />
              </div>
            )}
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* PURE PROGRESS DURATION BAR ON THE BOTTOM BORDER (NO LABELS)     */}
      {/* ============================================================== */}
      <div className="w-full h-1.5 sm:h-2 bg-slate-950 relative overflow-hidden border-t border-slate-800/80">
        <div
          className="h-full transition-all duration-300 ease-linear rounded-r-full"
          style={{
            width: `${Math.max(0, Math.min(100, countdownPct))}%`,
            background: `linear-gradient(90deg, #F59E0B 0%, ${glowColor} 100%)`,
            boxShadow: `0 0 10px ${glowColor}`
          }}
        />
      </div>
    </div>
  );
};
