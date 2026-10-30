'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveAlertPayload } from '../types/alert';
import { useAudio } from './useAudio';

export function useAlertQueue() {
  const [queue, setQueue] = useState<LiveAlertPayload[]>([]);
  const [currentAlert, setCurrentAlert] = useState<LiveAlertPayload | null>(null);
  const queueRef = useRef<LiveAlertPayload[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { playSound } = useAudio();

  // Always keep queueRef in sync with latest state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const playNext = useCallback(() => {
    if (isPlayingRef.current || isPausedRef.current) return;
    if (queueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const nextAlert = queueRef.current[0];

    // Remove the playing alert from queue
    setQueue((prev) => prev.slice(1));
    setCurrentAlert(nextAlert);

    // 1. Play alert sound chime (only for standard alerts, not video clips)
    if (!nextAlert.isSecondStageVideo && !nextAlert.videoUrl && nextAlert.soundUrl && nextAlert.soundUrl !== 'none') {
      playSound(nextAlert.soundUrl, nextAlert.soundVolume ?? 0.85);
    }

    // 2. Set auto-dismiss timer matching alert duration
    const isVideo = Boolean(nextAlert.isSecondStageVideo || nextAlert.videoUrl);
    const hasTts = Boolean(nextAlert.ttsEnabled);

    // If alert has TTS or is a video clip, dismissal is driven by TTS completion / video onEnded.
    // We provide a generous safety fallback timer so it never hangs indefinitely if network fails.
    const durationMs = isVideo
      ? Math.max(15, (Number(nextAlert.durationSeconds) || 30) + 15) * 1000
      : (hasTts
          ? Math.max(50, (Number(nextAlert.durationSeconds) || 8) + 40) * 1000
          : Math.max(3, Number(nextAlert.durationSeconds) || 8) * 1000);

    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = setTimeout(() => {
      dismissCurrentAlert();
    }, durationMs);
  }, [playSound]);

  const dismissCurrentAlert = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    // Dismiss active card
    setCurrentAlert(null);

    // 500ms transition gap between queued alerts allows exit animation to complete smoothly
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = setTimeout(() => {
      isPlayingRef.current = false;
      if (!isPausedRef.current) {
        playNext();
      }
    }, 500);
  }, [playNext]);

  const pushAlert = useCallback((alert: LiveAlertPayload) => {
    setQueue((prev) => {
      const updated = [...prev, alert];
      queueRef.current = updated;
      return updated;
    });

    // If no alert is currently playing and queue is not paused, start immediately
    if (!isPlayingRef.current && !isPausedRef.current) {
      setTimeout(() => {
        if (!isPlayingRef.current && !isPausedRef.current) {
          playNext();
        }
      }, 50);
    }
  }, [playNext]);

  const pauseQueue = useCallback(() => {
    console.log('⏸️ [Alert Queue] Queue paused: waiting for external video playback to complete...');
    isPausedRef.current = true;
  }, []);

  const resumeQueue = useCallback(() => {
    console.log('▶️ [Alert Queue] Queue resumed! Video playback completed. Checking for next alert...');
    isPausedRef.current = false;
    if (!isPlayingRef.current) {
      playNext();
    }
  }, [playNext]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  return {
    currentAlert,
    pushAlert,
    dismissCurrentAlert,
    pauseQueue,
    resumeQueue,
    queueLength: queue.length
  };
}
