'use client';

import { useState, useEffect, useRef } from 'react';
import { LiveAlertPayload } from '../types/alert';
import { useAudio } from './useAudio';

export function useAlertQueue() {
  const [queue, setQueue] = useState<LiveAlertPayload[]>([]);
  const [currentAlert, setCurrentAlert] = useState<LiveAlertPayload | null>(null);
  const isProcessingRef = useRef(false);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { playSound } = useAudio();

  const pushAlert = (alert: LiveAlertPayload) => {
    setQueue((prev) => [...prev, alert]);
  };

  const dismissCurrentAlert = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setCurrentAlert(null);
    isProcessingRef.current = false;
  };

  useEffect(() => {
    if (queue.length > 0 && !isProcessingRef.current && !currentAlert) {
      processNextAlert();
    }
  }, [queue, currentAlert]);

  const processNextAlert = () => {
    if (queue.length === 0) return;

    isProcessingRef.current = true;
    const next = queue[0];
    setQueue((prev) => prev.slice(1));
    setCurrentAlert(next);

    // 1. Play alert sound effect (ONLY for standard alerts, NEVER for video media share alerts)
    if (!next.isSecondStageVideo && !next.videoUrl && next.soundUrl && next.soundUrl !== 'none') {
      playSound(next.soundUrl, next.soundVolume ?? 0.8);
    }

    // 2. Auto dismiss after durationSeconds
    const durationMs = (next.durationSeconds || 8) * 1000;
    dismissTimerRef.current = setTimeout(() => {
      dismissCurrentAlert();
    }, durationMs);
  };

  return {
    currentAlert,
    pushAlert,
    dismissCurrentAlert,
    queueLength: queue.length
  };
}
