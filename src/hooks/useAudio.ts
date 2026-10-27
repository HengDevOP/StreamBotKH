'use client';

import { useCallback } from 'react';

/**
 * Web Audio API synthesizer for guaranteed sound playback without missing asset dependencies
 */
function playSynthNeonChime(volume: number = 0.8) {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    gainNode.connect(ctx.destination);

    // Cyber chord: F#5 (739.99 Hz), A#5 (932.33 Hz), C#6 (1108.73 Hz), D#6 (1244.51 Hz)
    const notes = [739.99, 932.33, 1108.73, 1244.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      osc.connect(gainNode);
      osc.start(now + idx * 0.08);
      osc.stop(now + 1.8);
    });
  } catch (e) {
    console.warn('[Audio] Web Audio synth playback error:', e);
  }
}

export function useAudio() {
  const playSound = useCallback((soundUrl?: string, volume: number = 0.8) => {
    if (typeof window === 'undefined') return;

    // If soundUrl is empty, none, or disabled, do NOT play any sound
    if (!soundUrl || soundUrl === 'none' || soundUrl === 'disabled' || soundUrl === '') {
      return;
    }

    if (soundUrl === '/sounds/neon-chime.mp3' || soundUrl === 'synth') {
      playSynthNeonChime(volume);
      return;
    }

    try {
      const audio = new Audio(soundUrl);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch((err) => {
        console.warn('[Audio] HTML5 audio play failed, falling back to synth chime:', err);
        playSynthNeonChime(volume);
      });
    } catch {
      playSynthNeonChime(volume);
    }
  }, []);

  return { playSound, playSynthNeonChime };
}
