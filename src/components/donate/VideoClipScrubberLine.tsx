'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Clock, Sliders, ChevronLeft, ChevronRight, MoveHorizontal, Maximize2 } from 'lucide-react';
import { formatTime } from '../common/VideoPlayerWithProgressBar';

interface VideoClipScrubberLineProps {
  startTime: number;
  endTime: number;
  videoDuration?: number; // total actual video length in seconds from YouTube
  maxAllowedDuration?: number; // up to 300s (5 mins)
  totalTimelineLength?: number; // fallback scale in seconds, e.g. 600s (10m)
  onChange: (newStart: number, newEnd: number) => void;
}

export const VideoClipScrubberLine: React.FC<VideoClipScrubberLineProps> = ({
  startTime,
  endTime,
  videoDuration,
  maxAllowedDuration = 300,
  totalTimelineLength = 600,
  onChange
}) => {
  const minClipDuration = videoDuration && videoDuration < 5 ? Math.max(1, videoDuration) : 5;

  // Scale 100% matches the exact video duration when known!
  const maxScale = videoDuration && videoDuration > 0
    ? videoDuration
    : Math.max(totalTimelineLength, Math.max(startTime + 60, endTime));

  const upperLimit = videoDuration && videoDuration > 0 ? videoDuration : maxScale;

  // Safe clamped values to prevent scale jump or out-of-range handles
  const safeEnd = Math.max(minClipDuration, Math.min(endTime, upperLimit));
  const safeStart = Math.max(0, Math.min(startTime, safeEnd - minClipDuration));
  const currentDuration = Math.max(1, Math.round(safeEnd - safeStart));

  const trackRef = useRef<HTMLDivElement>(null);
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | 'middle' | null>(null);
  const dragRef = useRef<{ clientX: number; startSec: number; endSec: number }>({
    clientX: 0,
    startSec: 0,
    endSec: 0
  });

  // Allowed preset buttons (up to streamer's maximum allowed duration and within video length)
  const presets = [
    { label: '15s', sec: 15 },
    { label: '30s', sec: 30 },
    { label: '1m', sec: 60 },
    { label: '2m', sec: 120 },
    { label: '3m', sec: 180 },
    { label: '5m', sec: 300 }
  ].filter((p) => p.sec <= maxAllowedDuration && (!videoDuration || p.sec <= videoDuration));

  // Pointer drag initialization
  const onPointerDown = (e: React.PointerEvent, handle: 'start' | 'end' | 'middle') => {
    e.preventDefault();
    e.stopPropagation();

    setActiveHandle(handle);
    dragRef.current = {
      clientX: e.clientX,
      startSec: safeStart,
      endSec: safeEnd
    };
  };

  // Smooth 60fps window-level pointer drag tracking without dropping handles
  useEffect(() => {
    if (!activeHandle) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const deltaPx = e.clientX - dragRef.current.clientX;
      const deltaSec = Math.round((deltaPx / rect.width) * maxScale);

      if (activeHandle === 'start') {
        const targetStart = dragRef.current.startSec + deltaSec;
        const clampedStart = Math.max(0, Math.min(targetStart, safeEnd - minClipDuration));
        if (safeEnd - clampedStart > maxAllowedDuration) {
          onChange(clampedStart, clampedStart + maxAllowedDuration);
        } else {
          onChange(clampedStart, safeEnd);
        }
      } else if (activeHandle === 'end') {
        const targetEnd = dragRef.current.endSec + deltaSec;
        const clampedEnd = Math.max(safeStart + minClipDuration, Math.min(targetEnd, upperLimit));
        if (clampedEnd - safeStart > maxAllowedDuration) {
          onChange(clampedEnd - maxAllowedDuration, clampedEnd);
        } else {
          onChange(safeStart, clampedEnd);
        }
      } else if (activeHandle === 'middle') {
        const dur = Math.max(minClipDuration, dragRef.current.endSec - dragRef.current.startSec);
        const targetStart = dragRef.current.startSec + deltaSec;
        const clampedStart = Math.max(0, Math.min(targetStart, upperLimit - dur));
        onChange(clampedStart, clampedStart + dur);
      }
    };

    const handlePointerUp = () => {
      setActiveHandle(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeHandle, maxScale, upperLimit, maxAllowedDuration, minClipDuration, safeStart, safeEnd, onChange]);

  // Click on background track to shift clip
  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeHandle || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickPx = e.clientX - rect.left;
    const clickSec = Math.max(0, Math.min(upperLimit, Math.round((clickPx / rect.width) * maxScale)));

    const distToStart = Math.abs(clickSec - safeStart);
    const distToEnd = Math.abs(clickSec - safeEnd);

    if (distToStart < distToEnd) {
      const newStart = Math.max(0, Math.min(clickSec, safeEnd - minClipDuration));
      onChange(newStart, safeEnd);
    } else {
      const newEnd = Math.max(safeStart + minClipDuration, Math.min(clickSec, upperLimit));
      onChange(safeStart, Math.min(newEnd, Math.min(safeStart + maxAllowedDuration, upperLimit)));
    }
  };

  // Preset click handler: If video duration is less than the preset, default to full duration!
  const handleSelectPreset = (presetSec: number) => {
    if (videoDuration && videoDuration <= presetSec) {
      onChange(0, videoDuration);
      return;
    }

    const targetEnd = Math.min(safeStart + presetSec, upperLimit);

    if (targetEnd - safeStart < presetSec && upperLimit >= presetSec) {
      const adjustedStart = Math.max(0, upperLimit - presetSec);
      onChange(adjustedStart, upperLimit);
    } else {
      onChange(safeStart, targetEnd);
    }
  };

  // Set to 100% full duration of video
  const handleSetFullDuration = () => {
    if (videoDuration && videoDuration > 0) {
      const clampedEnd = Math.min(videoDuration, maxAllowedDuration);
      onChange(0, clampedEnd);
    }
  };

  // Nudge functions
  const nudgeStart = (delta: number) => {
    const newStart = Math.max(0, Math.min(safeStart + delta, safeEnd - minClipDuration));
    onChange(newStart, safeEnd);
  };

  const nudgeEnd = (delta: number) => {
    const newEnd = Math.max(safeStart + minClipDuration, Math.min(safeEnd + delta, Math.min(safeStart + maxAllowedDuration, upperLimit)));
    onChange(safeStart, newEnd);
  };

  // Accurate percentage calculations
  const startPct = Math.max(0, Math.min(100, (safeStart / maxScale) * 100));
  const endPct = Math.max(0, Math.min(100, (safeEnd / maxScale) * 100));
  const clipWidthPct = Math.max(0, endPct - startPct);

  return (
    <div className="p-3.5 rounded-xl bg-slate-950/95 border border-slate-800 space-y-3 font-mono select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Clock size={13} className="text-red-500" />
          <span>Clip Duration Range</span>
        </span>
        <div className="flex items-center gap-2">
          {videoDuration && (
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              Total: <b className="text-slate-300">{formatTime(videoDuration)}</b>
            </span>
          )}
          <span className="text-[10px] text-slate-300">
            <span className="text-white font-bold">{formatTime(safeStart)}</span>
            <span className="mx-1 text-slate-500">➔</span>
            <span className="text-white font-bold">{formatTime(safeEnd)}</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold text-[11px]">
            {currentDuration}s
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CLASSIC CLIP DURATION TIMELINE WITH LINE HANDLES                */}
      {/* ============================================================== */}
      <div className="space-y-2 py-2">
        <div
          ref={trackRef}
          onClick={onTrackClick}
          className="relative w-full h-2.5 rounded-sm bg-slate-800 cursor-pointer overflow-visible flex items-center my-3 touch-none"
        >
          {/* Active Highlighted Line Segment Between Start and End */}
          <div
            onPointerDown={(e) => onPointerDown(e, 'middle')}
            className={`absolute top-0 bottom-0 rounded-sm cursor-grab active:cursor-grabbing transition-colors z-10 ${
              activeHandle === 'middle' ? 'bg-red-500' : 'bg-red-600'
            }`}
            style={{
              left: `${startPct}%`,
              width: `${clipWidthPct}%`
            }}
            title="Drag line to move entire clip window"
          />

          {/* HANDLE 1: START (VERTICAL LINE HANDLE) */}
          <div
            onPointerDown={(e) => onPointerDown(e, 'start')}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-7 rounded-sm bg-white border border-slate-300 shadow-md cursor-ew-resize z-30 transition-transform hover:scale-110 active:scale-105 flex items-center justify-center touch-none ${
              activeHandle === 'start' ? 'ring-2 ring-red-500 scale-110' : ''
            }`}
            style={{ left: `${startPct}%` }}
            title={`Start: ${formatTime(safeStart)}`}
          >
            {/* Center line indicator inside handle */}
            <div className="w-[1.5px] h-3.5 bg-slate-700 rounded-full" />
          </div>

          {/* HANDLE 2: END (VERTICAL LINE HANDLE) */}
          <div
            onPointerDown={(e) => onPointerDown(e, 'end')}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-7 rounded-sm bg-white border border-slate-300 shadow-md cursor-ew-resize z-30 transition-transform hover:scale-110 active:scale-105 flex items-center justify-center touch-none ${
              activeHandle === 'end' ? 'ring-2 ring-red-500 scale-110' : ''
            }`}
            style={{ left: `${endPct}%` }}
            title={`End: ${formatTime(safeEnd)}`}
          >
            {/* Center line indicator inside handle */}
            <div className="w-[1.5px] h-3.5 bg-slate-700 rounded-full" />
          </div>
        </div>

        {/* Timeline Bottom Time Labels */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span className="text-white font-bold">{formatTime(safeStart)}</span>
          <span className="text-slate-500 text-[10px] flex items-center gap-1 font-sans">
            <MoveHorizontal size={11} />
            <span>Drag line or vertical handles to adjust clip</span>
          </span>
          <span className="text-white font-bold">
            {formatTime(safeEnd)} {videoDuration ? `/ ${formatTime(videoDuration)}` : ''}
          </span>
        </div>
      </div>

      {/* Quick Steppers & Presets Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900 text-[10px]">
        {/* Nudge Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-slate-300 font-bold mr-1">Start:</span>
          <button
            type="button"
            onClick={() => nudgeStart(-5)}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold transition-colors"
          >
            -5s
          </button>
          <button
            type="button"
            onClick={() => nudgeStart(5)}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold transition-colors mr-2"
          >
            +5s
          </button>

          <span className="text-slate-300 font-bold mr-1">End:</span>
          <button
            type="button"
            onClick={() => nudgeEnd(-5)}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold transition-colors"
          >
            -5s
          </button>
          <button
            type="button"
            onClick={() => nudgeEnd(5)}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold transition-colors"
          >
            +5s
          </button>
        </div>

        {/* Clip Length Presets & Full Duration button */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500 mr-1 hidden sm:inline">Presets:</span>
          {videoDuration && videoDuration > 0 && (
            <button
              type="button"
              onClick={handleSetFullDuration}
              className={`px-2 py-0.5 rounded font-bold border transition-colors flex items-center gap-1 ${
                safeStart === 0 && (safeEnd === videoDuration || safeEnd === maxAllowedDuration)
                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Set full video duration"
            >
              <Maximize2 size={9} />
              <span>Full ({formatTime(videoDuration)})</span>
            </button>
          )}

          {presets.map((p) => {
            const isFullDueToLength = videoDuration && videoDuration <= p.sec;
            return (
              <button
                key={p.sec}
                type="button"
                onClick={() => handleSelectPreset(p.sec)}
                className={`px-2 py-0.5 rounded font-bold border transition-colors ${
                  currentDuration === (isFullDueToLength ? videoDuration : p.sec)
                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title={isFullDueToLength ? `Video is ${videoDuration}s, selecting full duration` : `Set ${p.label}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
