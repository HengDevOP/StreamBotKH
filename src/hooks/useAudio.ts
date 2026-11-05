'use client';

import { useCallback, useRef } from 'react';

/**
 * Web Audio API synthesizer for guaranteed sound playback without missing asset dependencies.
 * Returns a Promise that resolves once the 1.8s chime finishes playing.
 */
function playSynthNeonChime(volume: number = 0.8): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  return new Promise<void>((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        resolve();
        return;
      }

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

      setTimeout(() => {
        try {
          if (ctx.state !== 'closed') ctx.close().catch(() => {});
        } catch {}
        resolve();
      }, 1850);
    } catch (e) {
      console.warn('[Audio] Web Audio synth playback error:', e);
      resolve();
    }
  });
}

export function useAudio() {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeResolveRef = useRef<(() => void) | null>(null);

  const stopSound = useCallback(() => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {}
      activeAudioRef.current = null;
    }
    if (activeResolveRef.current) {
      const finish = activeResolveRef.current;
      activeResolveRef.current = null;
      finish();
    }
  }, []);

  /**
   * Plays an audio file and returns a Promise<void> that resolves only when the audio finishes playing.
   */
  const playSound = useCallback((soundUrl?: string, volume: number = 0.8): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();

    // Stop any previous sound before starting a new one
    stopSound();

    // If soundUrl is empty, none, or disabled, do NOT play any sound
    if (!soundUrl || soundUrl === 'none' || soundUrl === 'disabled' || soundUrl === '') {
      return Promise.resolve();
    }

    if (soundUrl === '/sounds/neon-chime.mp3' || soundUrl === 'synth') {
      return playSynthNeonChime(volume);
    }

    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        if (activeResolveRef.current === done) {
          activeResolveRef.current = null;
        }
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        resolve();
      };

      // Safety fallback timeout (60s max) in case an audio stream hangs
      const safetyTimer = setTimeout(done, 60000);
      let audio: HTMLAudioElement | null = null;

      try {
        audio = new Audio(soundUrl);
        activeAudioRef.current = audio;
        activeResolveRef.current = done;
        audio.volume = Math.max(0, Math.min(1, volume));

        audio.onended = () => {
          done();
        };

        audio.onerror = () => {
          console.warn('[Audio] HTML5 audio error, falling back to synth chime');
          playSynthNeonChime(volume).then(done);
        };

        audio.play().catch((err) => {
          console.warn('[Audio] HTML5 audio play failed, falling back to synth chime:', err);
          playSynthNeonChime(volume).then(done);
        });
      } catch {
        playSynthNeonChime(volume).then(done);
      }
    });
  }, [stopSound]);

  return { playSound, stopSound, playSynthNeonChime };
}
