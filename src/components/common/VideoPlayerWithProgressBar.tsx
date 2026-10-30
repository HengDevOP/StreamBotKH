'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Tv, Clock } from 'lucide-react';

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
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedOffsetRef = useRef<number>(0);
  const onEndedFiredRef = useRef<boolean>(false);

  // Remaining countdown seconds (from full duration down to 0)
  const remaining = Math.max(0, totalDuration - elapsed);
  // Countdown percentage (from 100% down to 0%)
  const countdownPct = totalDuration > 0 ? (remaining / totalDuration) * 100 : 0;
  // Progress elapsed percentage (from 0% up to 100%)
  const elapsedPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

  // Reset timer when videoId, startTime, or endTime changes
  useEffect(() => {
    setElapsed(0);
    elapsedOffsetRef.current = 0;
    startTimeRef.current = null;
    onEndedFiredRef.current = false;
    setIsPlaying(autoplay);
    setRenderKey((k) => k + 1);
  }, [videoId, safeStart, safeEnd, autoplay]);

  // Real-time smooth 60fps ticking loop for the countdown bar (with 1.0s buffer for YouTube iframe buffering)
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    onEndedFiredRef.current = false;

    const startDelayTimer = setTimeout(() => {
      startTimeRef.current = performance.now();

      const loop = () => {
        if (!startTimeRef.current) return;
        const now = performance.now();
        const currentElapsed = elapsedOffsetRef.current + (now - startTimeRef.current) / 1000;

        if (currentElapsed >= totalDuration) {
          setElapsed(totalDuration);
          if (!onEndedFiredRef.current) {
            onEndedFiredRef.current = true;
            setTimeout(() => {
              if (onEnded) onEnded();
            }, 500);
          }
          return;
        }

        setElapsed(currentElapsed);
        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    }, 1000);

    return () => {
      clearTimeout(startDelayTimer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (startTimeRef.current) {
        elapsedOffsetRef.current += (performance.now() - startTimeRef.current) / 1000;
        startTimeRef.current = null;
      }
    };
  }, [isPlaying, totalDuration, onEnded, renderKey]);

  const handleRestart = () => {
    setElapsed(0);
    elapsedOffsetRef.current = 0;
    startTimeRef.current = null;
    onEndedFiredRef.current = false;
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
      {/* Top Header: Show ONLY the donor name (No emojis, no "DONOR:") */}
      {donorName && (
        <div className="w-full px-4 py-2 bg-slate-950/95 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center">
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
      {/* SMOOTH RED COUNTDOWN PROGRESS DURATION BAR                      */}
      {/* ============================================================== */}
      <div className="w-full h-1.5 sm:h-2 bg-slate-950 relative overflow-hidden border-t border-slate-800/80">
        <div
          className="h-full transition-[width] duration-75 ease-linear rounded-r-sm"
          style={{
            width: `${Math.max(0, Math.min(100, countdownPct))}%`,
            backgroundColor: '#DC2626',
            boxShadow: '0 0 10px rgba(220, 38, 38, 0.75)'
          }}
        />
      </div>
    </div>
  );
};
