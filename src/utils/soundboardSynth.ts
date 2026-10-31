/**
 * StreamBotKH Soundboard Web Audio Synthesizer & Sound FX Engine
 * Zero-dependency, ultra-low latency audio generation for PC keybind soundboards.
 */

// Global audio context singleton
let globalAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

// Active sound tracker for panic stop & single playback guard
interface ActiveSoundHandle {
  id: string;
  stop: () => void;
}

const activeSounds: ActiveSoundHandle[] = [];

// In-memory audio caches for zero-latency, instant playback
const audioBufferCache = new Map<string, AudioBuffer>();
const audioBufferInFlight = new Map<string, Promise<AudioBuffer | null>>();
const preloadedAudioElements = new Map<string, HTMLAudioElement>();

export function isSoundPlaying(soundId?: string): boolean {
  if (!soundId) return activeSounds.length > 0;
  return activeSounds.some((h) => h.id === soundId);
}

export function stopSound(soundId: string) {
  for (let i = activeSounds.length - 1; i >= 0; i--) {
    if (activeSounds[i].id === soundId) {
      try {
        activeSounds[i].stop();
      } catch {}
      activeSounds.splice(i, 1);
    }
  }
}

export function stopAllActiveSounds() {
  activeSounds.forEach((handle) => {
    try {
      handle.stop();
    } catch {}
  });
  activeSounds.length = 0;
}

/**
 * Preload and decode audio into in-memory Web Audio buffer for zero-latency instant play
 */
export async function preloadAudio(url: string): Promise<AudioBuffer | null> {
  if (!url || typeof window === 'undefined' || url.startsWith('synth:')) return null;

  // 1. Return from memory cache if already decoded
  if (audioBufferCache.has(url)) {
    return audioBufferCache.get(url)!;
  }

  // 2. Return in-flight fetch promise if already fetching
  if (audioBufferInFlight.has(url)) {
    return audioBufferInFlight.get(url)!;
  }

  const promise = (async () => {
    try {
      // Preload HTML5 Audio element in parallel as instant fallback
      if (!preloadedAudioElements.has(url)) {
        const fallbackAudio = new Audio();
        fallbackAudio.preload = 'auto';
        fallbackAudio.src = url;
        preloadedAudioElements.set(url, fallbackAudio);
      }

      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();

      const ctx = getAudioContext();
      if (!ctx) return null;

      const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
        ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
      });

      audioBufferCache.set(url, decoded);
      return decoded;
    } catch (err) {
      return null;
    } finally {
      audioBufferInFlight.delete(url);
    }
  })();

  audioBufferInFlight.set(url, promise);
  return promise;
}

/**
 * Batch preload an array of audio URLs in background
 */
export function preloadAudioBatch(urls: string[]): void {
  if (!Array.isArray(urls)) return;
  urls.forEach((url) => {
    if (url && !url.startsWith('synth:')) {
      preloadAudio(url).catch(() => {});
    }
  });
}

/**
 * 1. AIRHORN: Classic 3-burst MLG Detuned Triple Airhorn
 */
export function playSynthAirhorn(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume * 0.45, now);
  masterGain.connect(ctx.destination);

  // Triple airhorn bursts: [startOffset, duration]
  const bursts = [
    [0.0, 0.16],
    [0.2, 0.16],
    [0.4, 0.45]
  ];

  const chords = [466.16, 622.25, 698.46]; // Bb4, Eb5, F5
  const oscillators: OscillatorNode[] = [];

  bursts.forEach(([offset, dur]) => {
    const bStart = now + offset;
    const bEnd = bStart + dur;

    const burstGain = ctx.createGain();
    burstGain.gain.setValueAtTime(0, bStart);
    burstGain.gain.linearRampToValueAtTime(1, bStart + 0.02);
    burstGain.gain.setValueAtTime(1, bEnd - 0.03);
    burstGain.gain.linearRampToValueAtTime(0, bEnd);
    burstGain.connect(masterGain);

    chords.forEach((freq) => {
      // 2 detuned oscillators per chord note for rich brass roar
      [-4, 4].forEach((detune) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, bStart);
        osc.detune.setValueAtTime(detune, bStart);
        osc.connect(burstGain);
        osc.start(bStart);
        osc.stop(bEnd);
        oscillators.push(osc);
      });
    });
  });

  return {
    stop: () => {
      try {
        oscillators.forEach((o) => o.stop());
        masterGain.disconnect();
      } catch {}
    },
    durationMs: 950
  };
}

/**
 * 2. BRUH EFFECT: Deep comedy bass pitch drop
 */
export function playSynthBruh(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.6, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  gain.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(650, now);
  filter.frequency.exponentialRampToValueAtTime(140, now + 1.1);
  filter.connect(gain);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(165, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 1.1);
  osc.connect(filter);

  // Sub bass layer
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(120, now);
  sub.frequency.exponentialRampToValueAtTime(38, now + 1.1);
  sub.connect(filter);

  osc.start(now);
  sub.start(now);
  osc.stop(now + 1.2);
  sub.stop(now + 1.2);

  return {
    stop: () => {
      try {
        osc.stop();
        sub.stop();
        gain.disconnect();
      } catch {}
    },
    durationMs: 1200
  };
}

/**
 * 3. KA-CHING: Cash register bell & coin jingle
 */
export function playSynthKaChing(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.5, now);
  master.connect(ctx.destination);

  const oscs: OscillatorNode[] = [];

  // Register Bell
  const bell = ctx.createOscillator();
  const bellGain = ctx.createGain();
  bell.type = 'sine';
  bell.frequency.setValueAtTime(2637.02, now); // E7
  bellGain.gain.setValueAtTime(0.9, now);
  bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
  bell.connect(bellGain);
  bellGain.connect(master);
  bell.start(now);
  bell.stop(now + 1.1);
  oscs.push(bell);

  // Coin bounces
  const coinFreqs = [3520, 4186, 3136, 4400];
  coinFreqs.forEach((freq, idx) => {
    const t = now + 0.12 + idx * 0.08;
    const cOsc = ctx.createOscillator();
    const cGain = ctx.createGain();
    cOsc.type = 'triangle';
    cOsc.frequency.setValueAtTime(freq, t);
    cGain.gain.setValueAtTime(0, t);
    cGain.gain.linearRampToValueAtTime(0.6, t + 0.01);
    cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    cOsc.connect(cGain);
    cGain.connect(master);
    cOsc.start(t);
    cOsc.stop(t + 0.35);
    oscs.push(cOsc);
  });

  return {
    stop: () => {
      try {
        oscs.forEach((o) => o.stop());
        master.disconnect();
      } catch {}
    },
    durationMs: 1100
  };
}

/**
 * 4. VICTORY FANFARE: 8-Bit Brass Trumpet Fanfare
 */
export function playSynthVictory(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.4, now);
  master.connect(ctx.destination);

  // Fanfare notes: [frequency, startOffset, duration]
  // C5, C5, C5, F5, A5, C6
  const notes = [
    [523.25, 0.0, 0.12],
    [523.25, 0.14, 0.12],
    [523.25, 0.28, 0.12],
    [698.46, 0.42, 0.35],
    [880.0, 0.8, 0.25],
    [1046.5, 1.08, 0.7]
  ];

  const oscs: OscillatorNode[] = [];
  notes.forEach(([freq, offset, dur]) => {
    const t = now + offset;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    // Warm brass envelope
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.8, t + 0.03);
    g.gain.setValueAtTime(0.7, t + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur);
    oscs.push(osc);
  });

  return {
    stop: () => {
      try {
        oscs.forEach((o) => o.stop());
        master.disconnect();
      } catch {}
    },
    durationMs: 1800
  };
}

/**
 * 5. SAD TROMBONE: Waa-waa-waa-waaah fail slide
 */
export function playSynthFail(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.5, now);
  master.connect(ctx.destination);

  // 4 fail notes: D4 -> C#4 -> C4 -> B3 (with pitch wobble)
  const notes = [
    [293.66, 0.0, 0.35],
    [277.18, 0.4, 0.35],
    [261.63, 0.8, 0.35],
    [246.94, 1.2, 0.9] // Long wobble slide
  ];

  const oscs: OscillatorNode[] = [];
  notes.forEach(([freq, offset, dur], i) => {
    const t = now + offset;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    if (i === 3) {
      // Final sad slide down
      osc.frequency.exponentialRampToValueAtTime(180, t + dur);
    }

    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.7, t + 0.04);
    g.gain.setValueAtTime(0.6, t + dur - 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur);
    oscs.push(osc);
  });

  return {
    stop: () => {
      try {
        oscs.forEach((o) => o.stop());
        master.disconnect();
      } catch {}
    },
    durationMs: 2200
  };
}

/**
 * 6. APPLAUSE & CHEERING: Stadium crowd applause
 */
export function playSynthApplause(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 2.5; // 2.5 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate pink/brownish noise with burst peaks for hand claps
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // Brown noise integration
    lastOut = (lastOut + 0.02 * white) / 1.02;
    // Random sharp clap spike
    const clapSpike = Math.random() < 0.003 ? (Math.random() > 0.5 ? 0.8 : -0.8) : 0;
    data[i] = (lastOut * 3.5 + clapSpike) * 0.5;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, now);
  filter.Q.setValueAtTime(1.2, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume * 0.6, now + 0.3);
  gain.gain.setValueAtTime(volume * 0.6, now + 1.8);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 2.5);

  return {
    stop: () => {
      try {
        noise.stop();
        gain.disconnect();
      } catch {}
    },
    durationMs: 2500
  };
}

/**
 * 7. DRAMATIC BOOM: Inception Brass Horn + Sub Bass Impact
 */
export function playSynthDramatic(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.6, now);
  master.connect(ctx.destination);

  // Heavy brass saw
  const saw = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(450, now);
  filter.frequency.exponentialRampToValueAtTime(80, now + 1.8);

  saw.type = 'sawtooth';
  saw.frequency.setValueAtTime(55, now); // Low A1
  saw.connect(filter);

  const sawGain = ctx.createGain();
  sawGain.gain.setValueAtTime(0.8, now);
  sawGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
  filter.connect(sawGain);
  sawGain.connect(master);

  // Sub bass boom
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(90, now);
  sub.frequency.exponentialRampToValueAtTime(30, now + 1.5);
  subGain.gain.setValueAtTime(1.0, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

  sub.connect(subGain);
  subGain.connect(master);

  saw.start(now);
  sub.start(now);
  saw.stop(now + 2.2);
  sub.stop(now + 2.2);

  return {
    stop: () => {
      try {
        saw.stop();
        sub.stop();
        master.disconnect();
      } catch {}
    },
    durationMs: 2200
  };
}

/**
 * 8. LASER GUN: Arcade Sci-Fi Blaster Pew-Pew
 */
export function playSynthLaser(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.5, now);
  master.connect(ctx.destination);

  const oscs: OscillatorNode[] = [];

  // Double laser blast
  [0, 0.18].forEach((offset) => {
    const t = now + offset;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.15);

    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.16);
    oscs.push(osc);
  });

  return {
    stop: () => {
      try {
        oscs.forEach((o) => o.stop());
        master.disconnect();
      } catch {}
    },
    durationMs: 400
  };
}

/**
 * 9. DING: Crisp Service Desk Counter Bell
 */
export function playSynthDing(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(2959.96, now); // F#7
  g.gain.setValueAtTime(volume * 0.6, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.2);

  return {
    stop: () => {
      try {
        osc.stop();
        g.disconnect();
      } catch {}
    },
    durationMs: 1200
  };
}

/**
 * 10. BUZZER: Game Show Wrong Answer Buzz
 */
export function playSynthBuzzer(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.5, now);
  master.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc2.type = 'square';
  osc1.frequency.setValueAtTime(135, now);
  osc2.frequency.setValueAtTime(142, now); // Detuned harsh buzz

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.8, now);
  g.gain.setValueAtTime(0.8, now + 0.45);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

  osc1.connect(g);
  osc2.connect(g);
  g.connect(master);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.55);
  osc2.stop(now + 0.55);

  return {
    stop: () => {
      try {
        osc1.stop();
        osc2.stop();
        master.disconnect();
      } catch {}
    },
    durationMs: 600
  };
}

/**
 * 11. GAME OVER: 8-Bit Descending Death Tone
 */
export function playSynthGameOver(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.4, now);
  master.connect(ctx.destination);

  // Descending notes: G4 -> F#4 -> F4 -> E4 (slide down)
  const notes = [
    [392.0, 0.0, 0.2],
    [369.99, 0.22, 0.2],
    [349.23, 0.44, 0.2],
    [329.63, 0.66, 0.6]
  ];

  const oscs: OscillatorNode[] = [];
  notes.forEach(([freq, offset, dur], idx) => {
    const t = now + offset;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (idx === 3) {
      osc.frequency.exponentialRampToValueAtTime(110, t + dur);
    }
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur);
    oscs.push(osc);
  });

  return {
    stop: () => {
      try {
        oscs.forEach((o) => o.stop());
        master.disconnect();
      } catch {}
    },
    durationMs: 1400
  };
}

/**
 * 12. LEVEL UP: Ascending sparkle chime
 */
export function playSynthLevelUp(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.45, now);
  master.connect(ctx.destination);

  // Rising notes: C5, E5, G5, B5, C6, G6
  const freqs = [523.25, 659.25, 783.99, 987.77, 1046.5, 1567.98];
  const oscs: OscillatorNode[] = [];

  freqs.forEach((freq, idx) => {
    const t = now + idx * 0.08;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.8, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.6);
    oscs.push(osc);
  });

  return {
    stop: () => {
      try {
        oscs.forEach((o) => o.stop());
        master.disconnect();
      } catch {}
    },
    durationMs: 1200
  };
}

/**
 * 13. DRUM ROLL: Snare roll buildup + crash
 */
export function playSynthDrumroll(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.5, now);
  master.connect(ctx.destination);

  // Accelerating snare taps
  let curTime = now;
  let interval = 0.09;
  const nodes: (AudioBufferSourceNode | OscillatorNode)[] = [];

  for (let i = 0; i < 22; i++) {
    const tapOsc = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tapOsc.type = 'triangle';
    tapOsc.frequency.setValueAtTime(180, curTime);
    tapOsc.frequency.exponentialRampToValueAtTime(70, curTime + 0.04);

    tapGain.gain.setValueAtTime(0.2 + (i / 22) * 0.6, curTime);
    tapGain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.05);

    tapOsc.connect(tapGain);
    tapGain.connect(master);
    tapOsc.start(curTime);
    tapOsc.stop(curTime + 0.05);
    nodes.push(tapOsc);

    curTime += interval;
    interval = Math.max(0.03, interval * 0.94);
  }

  // Crash at end
  const crashTime = curTime + 0.05;
  const crashOsc = ctx.createOscillator();
  const crashGain = ctx.createGain();
  crashOsc.type = 'sawtooth';
  crashOsc.frequency.setValueAtTime(320, crashTime);
  crashOsc.frequency.exponentialRampToValueAtTime(60, crashTime + 0.8);
  crashGain.gain.setValueAtTime(0.9, crashTime);
  crashGain.gain.exponentialRampToValueAtTime(0.001, crashTime + 1.0);

  crashOsc.connect(crashGain);
  crashGain.connect(master);
  crashOsc.start(crashTime);
  crashOsc.stop(crashTime + 1.0);
  nodes.push(crashOsc);

  return {
    stop: () => {
      try {
        nodes.forEach((n) => n.stop());
        master.disconnect();
      } catch {}
    },
    durationMs: 1800
  };
}

/**
 * 14. PUNCH / SLAP: Comic thud impact
 */
export function playSynthPunch(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.6, now);
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

  g.gain.setValueAtTime(1.0, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(g);
  g.connect(master);
  osc.start(now);
  osc.stop(now + 0.3);

  return {
    stop: () => {
      try {
        osc.stop();
        master.disconnect();
      } catch {}
    },
    durationMs: 350
  };
}

/**
 * 15. CYBER GLITCH: Digital data glitch beep
 */
export function playSynthGlitch(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.45, now);
  master.connect(ctx.destination);

  const oscs: OscillatorNode[] = [];
  const glitchFreqs = [880, 1760, 440, 2200, 330, 1400];

  glitchFreqs.forEach((freq, i) => {
    const t = now + i * 0.04;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.7, t);
    g.gain.setValueAtTime(0.7, t + 0.035);
    g.gain.linearRampToValueAtTime(0, t + 0.04);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.04);
    oscs.push(osc);
  });

  return {
    stop: () => {
      try {
        oscs.forEach((o) => o.stop());
        master.disconnect();
      } catch {}
    },
    durationMs: 300
  };
}

/**
 * 16. SHEESH SQUEAK: Rising vocal squeak slide
 */
export function playSynthSheesh(ctx: AudioContext, volume: number = 0.8): { stop: () => void; durationMs: number } {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(volume * 0.5, now);
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(1450, now + 0.5);

  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.8, now + 0.08);
  g.gain.setValueAtTime(0.8, now + 0.4);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  osc.connect(g);
  g.connect(master);
  osc.start(now);
  osc.stop(now + 0.6);

  return {
    stop: () => {
      try {
        osc.stop();
        master.disconnect();
      } catch {}
    },
    durationMs: 650
  };
}

/**
 * Universal Soundboard Trigger
 * Dispatches to Web Audio cache, synthesizer engine, or HTML5 Audio.
 * Prevents multiple overlapping playback by stopping any active sounds.
 */
export function triggerSoundEffect(
  soundId: string,
  soundUrl: string,
  volume: number = 0.8,
  masterVolume: number = 0.8,
  onEnded?: () => void,
  stopPrevious: boolean = true
): { stop: () => void; durationMs: number } {
  // Prevent multiple overlapping plays: stop all active sounds first
  if (stopPrevious) {
    stopAllActiveSounds();
  }

  const effectiveVolume = Math.max(0, Math.min(1, volume * masterVolume));

  // 1. Synthesizer dispatch (instant Web Audio synthesis)
  if (soundUrl.startsWith('synth:')) {
    const synthType = soundUrl.replace('synth:', '').trim().toLowerCase();
    const ctx = getAudioContext();
    if (!ctx) {
      if (onEnded) setTimeout(onEnded, 500);
      return { stop: () => {}, durationMs: 500 };
    }

    let handle: { stop: () => void; durationMs: number };
    switch (synthType) {
      case 'airhorn':
        handle = playSynthAirhorn(ctx, effectiveVolume);
        break;
      case 'bruh':
        handle = playSynthBruh(ctx, effectiveVolume);
        break;
      case 'kaching':
        handle = playSynthKaChing(ctx, effectiveVolume);
        break;
      case 'victory':
        handle = playSynthVictory(ctx, effectiveVolume);
        break;
      case 'fail':
        handle = playSynthFail(ctx, effectiveVolume);
        break;
      case 'applause':
        handle = playSynthApplause(ctx, effectiveVolume);
        break;
      case 'dramatic':
        handle = playSynthDramatic(ctx, effectiveVolume);
        break;
      case 'laser':
        handle = playSynthLaser(ctx, effectiveVolume);
        break;
      case 'ding':
        handle = playSynthDing(ctx, effectiveVolume);
        break;
      case 'buzzer':
        handle = playSynthBuzzer(ctx, effectiveVolume);
        break;
      case 'gameover':
        handle = playSynthGameOver(ctx, effectiveVolume);
        break;
      case 'levelup':
        handle = playSynthLevelUp(ctx, effectiveVolume);
        break;
      case 'drumroll':
        handle = playSynthDrumroll(ctx, effectiveVolume);
        break;
      case 'punch':
        handle = playSynthPunch(ctx, effectiveVolume);
        break;
      case 'glitch':
        handle = playSynthGlitch(ctx, effectiveVolume);
        break;
      case 'sheesh':
        handle = playSynthSheesh(ctx, effectiveVolume);
        break;
      default:
        handle = playSynthAirhorn(ctx, effectiveVolume);
        break;
    }

    const tracker: ActiveSoundHandle = {
      id: soundId,
      stop: handle.stop
    };
    activeSounds.push(tracker);

    setTimeout(() => {
      const idx = activeSounds.indexOf(tracker);
      if (idx !== -1) activeSounds.splice(idx, 1);
      if (onEnded) onEnded();
    }, handle.durationMs);

    return handle;
  }

  // 2. Web Audio Cached AudioBuffer Dispatch (Zero-latency instant play!)
  const ctx = getAudioContext();
  if (ctx && audioBufferCache.has(soundUrl)) {
    try {
      const buffer = audioBufferCache.get(soundUrl)!;
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(effectiveVolume, ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(0);

      let isCleanedUp = false;
      const stopFn = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        try {
          source.stop();
          gainNode.disconnect();
        } catch {}
      };

      const tracker: ActiveSoundHandle = { id: soundId, stop: stopFn };
      activeSounds.push(tracker);

      source.onended = () => {
        const idx = activeSounds.indexOf(tracker);
        if (idx !== -1) activeSounds.splice(idx, 1);
        if (onEnded) onEnded();
      };

      return {
        stop: stopFn,
        durationMs: Math.round(buffer.duration * 1000)
      };
    } catch (err) {
      console.warn('[Soundboard] AudioBuffer play error, falling back:', err);
    }
  }

  // Ensure audio is cached in background for future instant clicks
  preloadAudio(soundUrl).catch(() => {});

  // 3. Preloaded / HTML5 Audio Dispatch (Fallback)
  try {
    const preloaded = preloadedAudioElements.get(soundUrl);
    const audio = preloaded ? (preloaded.cloneNode(true) as HTMLAudioElement) : new Audio(soundUrl);
    audio.volume = effectiveVolume;
    audio.play().catch((err) => {
      console.warn('[Soundboard] HTML5 Audio play failed, falling back to synth airhorn:', err);
      const ctxFallback = getAudioContext();
      if (ctxFallback) playSynthAirhorn(ctxFallback, effectiveVolume);
      if (onEnded) onEnded();
    });

    const stopFn = () => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
    };

    const tracker: ActiveSoundHandle = { id: soundId, stop: stopFn };
    activeSounds.push(tracker);

    audio.onended = () => {
      const idx = activeSounds.indexOf(tracker);
      if (idx !== -1) activeSounds.splice(idx, 1);
      if (onEnded) onEnded();
    };

    return {
      stop: stopFn,
      durationMs: 3000
    };
  } catch {
    if (onEnded) onEnded();
    return { stop: () => {}, durationMs: 500 };
  }
}
