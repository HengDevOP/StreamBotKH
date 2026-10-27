'use client';

import { useCallback } from 'react';

export function useSpeechTTS() {
  const speak = useCallback((text: string, voiceName?: string, lang: string = 'en-US') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('[TTS] SpeechSynthesis API not supported in this browser');
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = lang;

      const voices = window.speechSynthesis.getVoices();
      if (voiceName) {
        const found = voices.find(v => v.name.toLowerCase().includes(voiceName.toLowerCase()));
        if (found) utterance.voice = found;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[TTS] TTS speech execution error:', err);
    }
  }, []);

  return { speak };
}
