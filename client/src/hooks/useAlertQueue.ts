import { useState, useEffect, useRef } from 'react';
import { LiveAlertPayload } from '../types/alert';
import { useAudio } from './useAudio';
import { useSpeechTTS } from './useSpeechTTS';
import confetti from 'canvas-confetti';

export function useAlertQueue() {
  const [queue, setQueue] = useState<LiveAlertPayload[]>([]);
  const [currentAlert, setCurrentAlert] = useState<LiveAlertPayload | null>(null);
  const isProcessingRef = useRef(false);

  const { playSound } = useAudio();
  const { speak } = useSpeechTTS();

  const pushAlert = (alert: LiveAlertPayload) => {
    setQueue((prev) => [...prev, alert]);
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

    // 1. Play alert sound effect
    playSound(next.soundUrl, next.soundVolume ?? 0.8);

    // 2. Trigger Neon Confetti Burst
    try {
      const colors = ['#00F0FF', '#FF007A', '#39FF14', '#FFE600', '#8A2BE2'];
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors
      });
    } catch (e) {
      // Confetti fallback
    }

    // 3. Text-to-Speech after sound starts (offset by 1.2s)
    if (next.ttsEnabled) {
      setTimeout(() => {
        const ttsText = `${next.donorName} donated ${next.amount} ${next.currency}. ${next.donorMessage || ''}`;
        speak(ttsText, next.ttsVoice);
      }, 1200);
    }

    // 4. Timer to dismiss alert and trigger next in queue
    const durationMs = (next.durationSeconds || 8) * 1000;
    setTimeout(() => {
      setCurrentAlert(null);
      isProcessingRef.current = false;
    }, durationMs);
  };

  return { currentAlert, pushAlert, queueLength: queue.length };
}
