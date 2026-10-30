'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Tv, Clock } from 'lucide-react';

export interface VideoPlayerWithProgressBarProps {
  videoId: string;
  startTime?: number;
  endTime?: number;
  autoplay?: boolean;
  muted?: boolean;
  isPaused?: boolean;
  videoTitle?: string;
  donorName?: string;
  donorColor?: string;
  amount?: number;
  currency?: string;
  glowColor?: string;
  showControls?: boolean;
  isPreview?: boolean;
  onEnded?: () => void;
  className?: string;
}

export const getGradientOrColorStyle = (colorStr?: string): React.CSSProperties => {
  if (!colorStr) return {};
  if (colorStr.includes('gradient')) {
    return {
      backgroundImage: colorStr,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block'
    };
  }
  return { color: colorStr };
};

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
  isPaused = false,
  videoTitle,
  donorName,
  donorColor,
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

  const [isPlaying, setIsPlaying] = useState<boolean>(autoplay && !isPaused);
  const [renderKey, setRenderKey] = useState<number>(0);

  const barRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onEndedRef = useRef(onEnded);
  const animFrameRef = useRef<number | null>(null);
  const pausedProgressRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const onEndedFiredRef = useRef<boolean>(false);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // Handle external pause command (e.g. viewer clicked Tips to show Bakong KHQR modal)
  useEffect(() => {
    if (isPaused) {
      setIsPlaying(false);
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
          '*'
        );
      } catch (e) {}
    }
  }, [isPaused]);

  useEffect(() => {
    if (!isPlaying) {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
          '*'
        );
      } catch (e) {}
    }
  }, [isPlaying]);

  // Reset timer when videoId, startTime, or endTime changes
  useEffect(() => {
    pausedProgressRef.current = 0;
    startTimeRef.current = null;
    onEndedFiredRef.current = false;
    if (barRef.current) {
      barRef.current.style.width = '100%';
    }
    setIsPlaying(autoplay && !isPaused);
    setRenderKey((k) => k + 1);
  }, [videoId, safeStart, safeEnd, autoplay, isPaused]);

  // Real-time smooth 60fps countdown animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let isCancelled = false;
    let localFrameId: number | null = null;
    let localStartTime: number | null = null;

    // Small 200ms initial buffer for YouTube iframe to buffer on first play
    const delay = pausedProgressRef.current === 0 ? 200 : 0;

    const startDelayTimer = setTimeout(() => {
      if (isCancelled) return;
      localStartTime = performance.now();
      startTimeRef.current = localStartTime;

      const loop = (now: number) => {
        if (isCancelled || !localStartTime) return;
        const deltaSec = (now - localStartTime) / 1000;
        const currentElapsed = (pausedProgressRef.current * totalDuration) + deltaSec;
        const progress = Math.min(1, currentElapsed / totalDuration);
        const remainingPct = Math.max(0, (1 - progress) * 100);

        if (barRef.current) {
          barRef.current.style.width = `${remainingPct}%`;
        }

        if (progress >= 1) {
          if (!onEndedFiredRef.current) {
            onEndedFiredRef.current = true;
            if (barRef.current) {
              barRef.current.style.width = '0%';
            }
            if (isPreview) {
              setIsPlaying(false);
            }
            setTimeout(() => {
              onEndedRef.current?.();
            }, 300);
          }
          return;
        }

        localFrameId = requestAnimationFrame(loop);
        animFrameRef.current = localFrameId;
      };

      localFrameId = requestAnimationFrame(loop);
      animFrameRef.current = localFrameId;
    }, delay);

    return () => {
      isCancelled = true;
      clearTimeout(startDelayTimer);
      if (localFrameId) cancelAnimationFrame(localFrameId);
      if (localStartTime) {
        const deltaSec = (performance.now() - localStartTime) / 1000;
        pausedProgressRef.current = Math.min(1, pausedProgressRef.current + deltaSec / totalDuration);
        localStartTime = null;
        startTimeRef.current = null;
      }
    };
  }, [isPlaying, totalDuration, renderKey]);

  const handleRestart = () => {
    pausedProgressRef.current = 0;
    startTimeRef.current = null;
    onEndedFiredRef.current = false;
    if (barRef.current) {
      barRef.current.style.width = '100%';
    }
    setIsPlaying(true);
    setRenderKey((k) => k + 1);
  };

  const handleTogglePlay = () => {
    if (pausedProgressRef.current >= 1) {
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
      className={`relative w-full overflow-hidden group select-none flex flex-col ${
        isPreview
          ? 'rounded-2xl bg-black border border-slate-800 shadow-2xl'
          : 'bg-transparent'
      } ${className}`}
      style={
        isPreview
          ? { boxShadow: `0 0 30px ${glowColor}25, 0 8px 32px rgba(0,0,0,0.85)` }
          : { background: 'transparent' }
      }
    >
      {/* Top Header: Show ONLY the donor name (No emojis, no "DONOR:") */}
      {donorName && (
        <div
          className={`w-full px-4 py-2 flex items-center justify-between text-xs font-mono ${
            isPreview ? 'bg-slate-950/95 border-b border-slate-800/80' : 'bg-transparent'
          }`}
        >
          <div className="flex items-center">
            <span
              className="text-xs sm:text-sm font-bold font-['Chakra_Petch'] tracking-wide"
              style={{
                ...getGradientOrColorStyle(donorColor || glowColor || '#00F0FF'),
                textShadow: glowColor
                  ? `0 0 10px ${glowColor}88, 0 2px 4px rgba(0,0,0,0.95)`
                  : '0 2px 4px rgba(0,0,0,0.95)'
              }}
            >
              {donorName}
            </span>
          </div>
        </div>
      )}

      {/* 100% Clean Video Area (No Amount, No Title, No Message) */}
      <div className={`relative w-full aspect-video overflow-hidden ${isPreview ? 'bg-black' : 'bg-transparent'}`}>
        <iframe
          ref={iframeRef}
          key={renderKey}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying && !isPaused ? 1 : 0}&mute=${muted ? 1 : 0}&controls=${showControls ? 1 : 0}&start=${safeStart}&end=${safeEnd}&enablejsapi=1`}
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
      <div
        className={`w-full h-1.5 sm:h-2 relative overflow-hidden ${
          isPreview ? 'bg-slate-950 border-t border-slate-800/80' : 'bg-transparent'
        }`}
      >
        <div
          ref={barRef}
          className="h-full rounded-r-sm will-change-[width]"
          style={{
            width: '100%',
            backgroundColor: '#DC2626',
            boxShadow: '0 0 10px rgba(220, 38, 38, 0.75)'
          }}
        />
      </div>
    </div>
  );
};
