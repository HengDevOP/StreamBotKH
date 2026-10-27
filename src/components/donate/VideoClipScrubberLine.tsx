'use client';

import React, { useRef, useState } from 'react';
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
  const currentDuration = Math.max(5, endTime - startTime);
  // If actual videoDuration is known, scale to the exact length of the video!
  const maxScale = videoDuration && videoDuration > 0
    ? Math.max(videoDuration, endTime)
    : Math.max(totalTimelineLength, startTime + currentDuration + 60);

  const trackRef = useRef<HTMLDivElement>(null);
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | 'middle' | null>(null);
  const dragRef = useRef<{ clientX: number; startSec: number; endSec: number }>({
    clientX: 0,
    startSec: 0,
    endSec: 0
  });

  // Allowed preset buttons (up to streamer's maximum allowed duration)
  const presets = [
    { label: '15s', sec: 15 },
    { label: '30s', sec: 30 },
    { label: '1m', sec: 60 },
    { label: '2m', sec: 120 },
    { label: '3m', sec: 180 },
    { label: '5m', sec: 300 }
  ].filter((p) => p.sec <= maxAllowedDuration);

  // Pointer drag initialization
  const onPointerDown = (e: React.PointerEvent, handle: 'start' | 'end' | 'middle') => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    setActiveHandle(handle);
    dragRef.current = {
      clientX: e.clientX,
      startSec: startTime,
      endSec: endTime
    };
  };

  // Pointer drag movement
  const onPointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    const deltaPx = e.clientX - dragRef.current.clientX;
    const deltaSec = Math.round((deltaPx / rect.width) * maxScale);
    const upperLimit = videoDuration && videoDuration > 0 ? videoDuration : maxScale;

    if (activeHandle === 'start') {
      const targetStart = dragRef.current.startSec + deltaSec;
      const clampedStart = Math.max(0, Math.min(targetStart, endTime - 5));
      if (endTime - clampedStart > maxAllowedDuration) {
        onChange(clampedStart, clampedStart + maxAllowedDuration);
      } else {
        onChange(clampedStart, endTime);
      }
    } else if (activeHandle === 'end') {
      const targetEnd = dragRef.current.endSec + deltaSec;
      const clampedEnd = Math.max(startTime + 5, Math.min(targetEnd, upperLimit));
      if (clampedEnd - startTime > maxAllowedDuration) {
        onChange(clampedEnd - maxAllowedDuration, clampedEnd);
      } else {
        onChange(startTime, clampedEnd);
      }
    } else if (activeHandle === 'middle') {
      const dur = dragRef.current.endSec - dragRef.current.startSec;
      const targetStart = dragRef.current.startSec + deltaSec;
      const clampedStart = Math.max(0, Math.min(targetStart, upperLimit - dur));
      onChange(clampedStart, clampedStart + dur);
    }
  };

  // Pointer drag release
  const onPointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveHandle(null);
    }
  };

  // Click on background track to shift clip
  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeHandle || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickPx = e.clientX - rect.left;
    const upperLimit = videoDuration && videoDuration > 0 ? videoDuration : maxScale;
    const clickSec = Math.max(0, Math.min(upperLimit, Math.round((clickPx / rect.width) * maxScale)));

    const distToStart = Math.abs(clickSec - startTime);
    const distToEnd = Math.abs(clickSec - endTime);

    if (distToStart < distToEnd) {
      const newStart = Math.min(clickSec, endTime - 5);
      onChange(newStart, endTime);
    } else {
      const newEnd = Math.max(clickSec, startTime + 5);
      onChange(startTime, Math.min(newEnd, Math.min(startTime + maxAllowedDuration, upperLimit)));
    }
  };

  // Preset click handler: If video duration is less than the preset, default to full duration!
  const handleSelectPreset = (presetSec: number) => {
    // If video duration is less than or equal to preset, default to full duration!
    if (videoDuration && videoDuration <= presetSec) {
      onChange(0, videoDuration);
      return;
    }

    const upperLimit = videoDuration && videoDuration > 0 ? videoDuration : maxScale;
    const targetEnd = Math.min(startTime + presetSec, upperLimit);

    // If starting from current startTime would exceed end of video, shift start back to capture the full preset
    if (targetEnd - startTime < presetSec && upperLimit >= presetSec) {
      const adjustedStart = Math.max(0, upperLimit - presetSec);
      onChange(adjustedStart, upperLimit);
    } else {
      onChange(startTime, targetEnd);
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
    const newStart = Math.max(0, Math.min(startTime + delta, endTime - 5));
    onChange(newStart, endTime);
  };

  const nudgeEnd = (delta: number) => {
    const upperLimit = videoDuration && videoDuration > 0 ? videoDuration : maxScale;
    const newEnd = Math.max(startTime + 5, Math.min(endTime + delta, Math.min(startTime + maxAllowedDuration, upperLimit)));
    onChange(startTime, newEnd);
  };

  // Percentage calculations
  const startPct = Math.max(0, Math.min(100, (startTime / maxScale) * 100));
  const endPct = Math.max(0, Math.min(100, (endTime / maxScale) * 100));
  const clipWidthPct = Math.max(3, endPct - startPct);

  return (
    <div className="p-3.5 rounded-xl bg-slate-950/95 border border-slate-800 space-y-3 font-mono select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Sliders size={13} className="text-cyan-400" />
          <span>Clip Bar (Move Start & End Handles)</span>
        </span>
        <div className="flex items-center gap-2">
          {videoDuration && (
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              Video: <b className="text-slate-300">{formatTime(videoDuration)}</b>
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            <span className="text-cyan-400 font-bold">{formatTime(startTime)}</span>
            <span className="mx-1 text-slate-600">➔</span>
            <span className="text-amber-400 font-bold">{formatTime(endTime)}</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-extrabold text-[11px]">
            {currentDuration}s
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CLASSIC MINIMALIST 2-HANDLE CLIP LINE                         */}
      {/* ============================================================== */}
      <div className="space-y-2 py-2">
        <div
          ref={trackRef}
          onClick={onTrackClick}
          className="relative w-full h-2 rounded-full bg-slate-800/80 cursor-pointer overflow-visible flex items-center my-3"
        >
          {/* Active Highlighted Line Segment Between Start and End */}
          <div
            onPointerDown={(e) => onPointerDown(e, 'middle')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`absolute top-0 bottom-0 rounded-full cursor-grab active:cursor-grabbing transition-colors z-10 ${
              activeHandle === 'middle' ? 'bg-cyan-300 ring-2 ring-cyan-400/50' : 'bg-gradient-to-r from-cyan-400 to-amber-400 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
            }`}
            style={{
              left: `${startPct}%`,
              width: `${clipWidthPct}%`
            }}
            title="Drag line to move entire clip window"
          />

          {/* HANDLE 1: START (LEFT CIRCLE) */}
          <div
            onPointerDown={(e) => onPointerDown(e, 'start')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)] cursor-ew-resize z-30 transition-transform hover:scale-125 active:scale-110 ${
              activeHandle === 'start' ? 'ring-4 ring-cyan-400/40 scale-125' : ''
            }`}
            style={{ left: `${startPct}%` }}
            title={`Start: ${formatTime(startTime)}`}
          />

          {/* HANDLE 2: END (RIGHT CIRCLE) */}
          <div
            onPointerDown={(e) => onPointerDown(e, 'end')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] cursor-ew-resize z-30 transition-transform hover:scale-125 active:scale-110 ${
              activeHandle === 'end' ? 'ring-4 ring-amber-400/40 scale-125' : ''
            }`}
            style={{ left: `${endPct}%` }}
            title={`End: ${formatTime(endTime)}`}
          />
        </div>

        {/* Timeline Bottom Time Labels */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span className="text-cyan-400 font-bold">{formatTime(startTime)}</span>
          <span className="text-slate-500 text-[10px] flex items-center gap-1 font-sans">
            <MoveHorizontal size={11} />
            <span>Slide handles or drag line</span>
          </span>
          <span className="text-amber-400 font-bold">
            {formatTime(endTime)} {videoDuration ? `/ ${formatTime(videoDuration)}` : ''}
          </span>
        </div>
      </div>

      {/* Quick Steppers & Presets Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900 text-[10px]">
        {/* Nudge Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-cyan-400 font-bold mr-1">Start:</span>
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

          <span className="text-amber-400 font-bold mr-1">End:</span>
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
                startTime === 0 && (endTime === videoDuration || endTime === maxAllowedDuration)
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
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
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
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
