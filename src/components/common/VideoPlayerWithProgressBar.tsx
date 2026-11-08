'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Tv, Clock } from 'lucide-react';

export type TextAlignMode = 'left' | 'center' | 'justify' | 'right';

export interface VideoPlayerWithProgressBarProps {
  videoId: string;
  startTime?: number;
  endTime?: number;
  autoplay?: boolean;
  muted?: boolean;
  volume?: number;
  isPaused?: boolean;
  videoTitle?: string;
  donorName?: string;
  donorColor?: string;
  amount?: number;
  currency?: string;
  glowColor?: string;
  showControls?: boolean;
  isPreview?: boolean;
  donorMessage?: string;
  headerColor?: string;
  headerBgColor?: string;
  footerColor?: string;
  footerBgColor?: string;
  headerTextAlign?: TextAlignMode;
  footerTextAlign?: TextAlignMode;
  onEnded?: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
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
  volume = 85,
  isPaused = false,
  videoTitle,
  donorName,
  donorColor,
  amount,
  currency = 'USD',
  glowColor = '#00F0FF',
  showControls = false,
  isPreview = false,
  donorMessage,
  headerColor,
  headerBgColor,
  footerColor,
  footerBgColor,
  headerTextAlign = 'left',
  footerTextAlign = 'left',
  onEnded,
  onPlayStateChange,
  className = ''
}) => {
  const cleanDonorMessage = typeof donorMessage === 'string' ? donorMessage.trim() : '';
  const hasMeaningfulMessage = Boolean(
    cleanDonorMessage &&
    cleanDonorMessage.toLowerCase() !== 'none' &&
    cleanDonorMessage.toLowerCase() !== '(none)' &&
    cleanDonorMessage.toLowerCase() !== 'null' &&
    cleanDonorMessage.toLowerCase() !== 'undefined'
  );

  const safeStart = Math.max(0, startTime);
  const safeEnd = Math.max(safeStart + 1, endTime);
  const totalDuration = safeEnd - safeStart;

  const [isPlaying, setIsPlaying] = useState<boolean>(Boolean(autoplay && !isPaused));
  const [mountAutoplay, setMountAutoplay] = useState<boolean>(Boolean(autoplay && !isPaused));
  const [renderKey, setRenderKey] = useState<number>(0);

  const barRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onEndedRef = useRef(onEnded);
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isPausedRef = useRef<boolean>(isPaused);
  const animFrameRef = useRef<number | null>(null);
  const pausedProgressRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const onEndedFiredRef = useRef<boolean>(false);
  const prevVideoIdRef = useRef<string>(videoId);
  const prevStartTimeRef = useRef<number>(safeStart);
  const prevEndTimeRef = useRef<number>(safeEnd);

  isPlayingRef.current = isPlaying;
  isPausedRef.current = isPaused;

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onPlayStateChangeRef.current = onPlayStateChange;
  }, [onPlayStateChange]);

  const sendPlayerCommand = (func: string, args: unknown[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      const safeArgs = Array.isArray(args) ? args : [];
      win.postMessage(JSON.stringify({ event: 'command', func, args: safeArgs }), '*');
    } catch {}
  };

  // Dynamically update audio mute & volume without iframe reloads
  useEffect(() => {
    if (muted) {
      sendPlayerCommand('mute', []);
    } else {
      sendPlayerCommand('unMute', []);
      sendPlayerCommand('setVolume', [Math.max(0, Math.min(100, volume))]);
    }
  }, [muted, volume]);

  // Handle external pause / autoplay state changes cleanly without duplicate commands
  useEffect(() => {
    if (isPaused) {
      setIsPlaying(false);
      sendPlayerCommand('pauseVideo', []);
    } else if (autoplay && !isPlayingRef.current) {
      if (pausedProgressRef.current >= 1) {
        pausedProgressRef.current = 0;
        startTimeRef.current = null;
        onEndedFiredRef.current = false;
        if (barRef.current) {
          barRef.current.style.width = '100%';
        }
        sendPlayerCommand('seekTo', [safeStart, true]);
      }
      setIsPlaying(true);
      if (!muted) {
        sendPlayerCommand('unMute', []);
        sendPlayerCommand('setVolume', [Math.max(0, Math.min(100, volume))]);
      }
      sendPlayerCommand('seekTo', [safeStart, true]);
      sendPlayerCommand('playVideo', []);
    } else if (!autoplay && isPlayingRef.current && isPreview) {
      setIsPlaying(false);
      sendPlayerCommand('pauseVideo', []);
    }
  }, [isPaused, autoplay, muted, volume, safeStart, isPreview]);

  // Reset timer & handle clip changes without glitching or duplicate mounts
  useEffect(() => {
    const videoChanged = prevVideoIdRef.current !== videoId;
    const timesChanged = prevStartTimeRef.current !== safeStart || prevEndTimeRef.current !== safeEnd;

    prevVideoIdRef.current = videoId;
    prevStartTimeRef.current = safeStart;
    prevEndTimeRef.current = safeEnd;

    pausedProgressRef.current = 0;
    startTimeRef.current = null;
    onEndedFiredRef.current = false;
    if (barRef.current) {
      barRef.current.style.width = '100%';
    }

    if (videoChanged) {
      // Remount iframe only when the video URL / ID changes
      const shouldPlay = Boolean(autoplay && !isPaused);
      setIsPlaying(shouldPlay);
      setMountAutoplay(shouldPlay);
      setRenderKey((k) => k + 1);
    } else if (timesChanged) {
      // Timeline scrubbed: smoothly seek without tearing down the iframe
      sendPlayerCommand('seekTo', [safeStart, true]);
      if (!isPlaying) {
        sendPlayerCommand('pauseVideo', []);
      }
    }
  }, [videoId, safeStart, safeEnd]);

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
              sendPlayerCommand('pauseVideo', []);
              onPlayStateChangeRef.current?.(false);
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
    setMountAutoplay(true);
    setIsPlaying(true);
    if (!muted) {
      sendPlayerCommand('unMute', []);
      sendPlayerCommand('setVolume', [Math.max(0, Math.min(100, volume))]);
    }
    sendPlayerCommand('seekTo', [safeStart, true]);
    sendPlayerCommand('playVideo', []);
  };

  const handleTogglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (pausedProgressRef.current >= 1) {
      handleRestart();
      onPlayStateChangeRef.current?.(true);
      return;
    }
    const next = !isPlaying;
    setIsPlaying(next);
    onPlayStateChangeRef.current?.(next);
    if (next) {
      if (!muted) {
        sendPlayerCommand('unMute', []);
        sendPlayerCommand('setVolume', [Math.max(0, Math.min(100, volume))]);
      }
      sendPlayerCommand('playVideo', []);
    } else {
      sendPlayerCommand('pauseVideo', []);
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
          className="w-full px-4 py-2.5 text-xs font-mono border-b border-slate-800/80 backdrop-blur-md flex-shrink-0"
          style={{
            backgroundColor: headerBgColor || (isPreview ? 'rgba(2, 6, 23, 0.95)' : 'rgba(0, 0, 0, 0.85)'),
            textAlign: headerTextAlign
          }}
        >
          <div
            className={`w-full flex items-center ${
              headerTextAlign === 'center'
                ? 'justify-center text-center'
                : headerTextAlign === 'right'
                ? 'justify-end text-right'
                : headerTextAlign === 'justify'
                ? 'justify-between text-justify'
                : 'justify-start text-left'
            }`}
          >
            <span
              className="text-xs sm:text-sm font-bold font-['Chakra_Petch'] tracking-wide inline-block"
              style={{
                ...getGradientOrColorStyle(headerColor || donorColor || glowColor || '#00F0FF'),
                textShadow: (headerColor || glowColor)
                  ? `0 0 10px ${(headerColor || glowColor)}88, 0 2px 4px rgba(0,0,0,0.95)`
                  : '0 2px 4px rgba(0,0,0,0.95)'
              }}
            >
              {donorName}
            </span>
          </div>
        </div>
      )}

      {/* 100% Clean Video Area (No Amount, No Title, No Message) */}
      <div className={`relative w-full aspect-video overflow-hidden flex-shrink-0 ${isPreview ? 'bg-black' : 'bg-transparent'}`}>
        <iframe
          ref={iframeRef}
          key={renderKey}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${mountAutoplay ? 1 : 0}&mute=${muted ? 1 : 0}&controls=${showControls ? 1 : 0}&start=${safeStart}&end=${safeEnd}&playsinline=1&enablejsapi=1${
            typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''
          }`}
          title={videoTitle || 'YouTube Media Share'}
          className="w-full h-full pointer-events-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={() => {
            try {
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'listening' }),
                '*'
              );
            } catch {}
            if (muted) {
              sendPlayerCommand('mute', []);
            } else {
              sendPlayerCommand('unMute', []);
              sendPlayerCommand('setVolume', [Math.max(0, Math.min(100, volume))]);
            }
            if (isPlayingRef.current && !isPausedRef.current) {
              sendPlayerCommand('seekTo', [safeStart, true]);
              sendPlayerCommand('playVideo', []);
            } else {
              sendPlayerCommand('pauseVideo', []);
            }
          }}
        />

        {/* Preview Overlay with Play Button */}
        {isPreview && (
          <button
            type="button"
            onClick={handleTogglePlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 hover:bg-black/15 transition-colors pointer-events-auto cursor-pointer"
            title={isPlaying ? 'Pause preview' : 'Play preview with sound'}
          >
            {!isPlaying && (
              <div className="w-14 h-14 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transform hover:scale-110 transition-transform">
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
        className={`w-full h-1.5 sm:h-2 relative overflow-hidden flex-shrink-0 ${
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

      {/* ============================================================== */}
      {/* ATTACHED DONOR MESSAGE SECTION (BOTTOM VIDEO SCREEN)           */}
      {/* ============================================================== */}
      {hasMeaningfulMessage && (
        <div
          className="w-full p-2.5 sm:p-3.5 text-xs sm:text-sm animate-fadeIn border-t border-slate-800/80 backdrop-blur-md flex-shrink-0"
          style={{
            backgroundColor: footerBgColor || (isPreview ? 'rgba(2, 6, 23, 0.95)' : 'rgba(0, 0, 0, 0.90)'),
            boxShadow: '0 4px 20px rgba(0,0,0,0.85)',
            textAlign: footerTextAlign
          }}
        >
          <p
            className={`w-full text-xs sm:text-sm font-sans italic leading-snug break-words ${
              footerTextAlign === 'center'
                ? 'text-center'
                : footerTextAlign === 'right'
                ? 'text-right'
                : footerTextAlign === 'justify'
                ? 'text-justify'
                : 'text-left'
            }`}
            style={{
              ...getGradientOrColorStyle(footerColor || '#FFFFFF'),
              textAlign: footerTextAlign
            }}
          >
            {cleanDonorMessage}
          </p>
        </div>
      )}
    </div>
  );
};
