import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import axios from 'axios';
import { execFile, spawn, ChildProcess } from 'child_process';
import readline from 'readline';
import { promisify } from 'util';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { normalizeCurrencyAndSymbols, isKhmerText, khmerNumberToWords } from '../../utils/ttsHelper';

export { normalizeCurrencyAndSymbols, isKhmerText, khmerNumberToWords };

const execFileAsync = promisify(execFile);

export const TTS_CACHE_DIR = path.join(process.cwd(), 'public', 'uploads', 'tts');

// Ephemeral in-memory audio buffer cache (expires after 2 minutes)
// TTS files are dynamic and ephemeral — they should never be permanently stored on disk!
interface CacheEntry {
  buffer: Buffer;
  expiresAt: number;
}
const ttsMemoryCache = new Map<string, CacheEntry>();

function pruneExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of ttsMemoryCache.entries()) {
    if (entry.expiresAt <= now) {
      ttsMemoryCache.delete(key);
    }
  }
}

/**
 * Clean up legacy TTS audio files from disk to reclaim storage space
 */
export function purgeDiskTtsFiles() {
  try {
    if (fs.existsSync(TTS_CACHE_DIR)) {
      const files = fs.readdirSync(TTS_CACHE_DIR);
      let count = 0;
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          try {
            fs.unlinkSync(path.join(TTS_CACHE_DIR, file));
            count++;
          } catch {}
        }
      }
      if (count > 0) {
        console.log(`🧹 [TTS Service] Purged ${count} ephemeral TTS audio files from disk.`);
      }
    }
  } catch (e) {
    console.warn('[TTS Service] Warning purging TTS files:', e);
  }
}

// Automatically purge any leftover TTS files from disk on startup
purgeDiskTtsFiles();

// Map UI voice models to neural voices
export const VOICE_MAP: Record<string, string> = {
  'kiritts-male': 'km-KH-PisethNeural',
  'kiritts-female': 'km-KH-SreymomNeural',
  'piseth': 'km-KH-PisethNeural',
  'sreymom': 'km-KH-SreymomNeural',
  'km-KH-PisethNeural': 'km-KH-PisethNeural',
  'km-KH-SreymomNeural': 'km-KH-SreymomNeural',
  'google': 'en-US-JennyNeural',
  'google-female': 'en-US-JennyNeural',
  'Google US English': 'en-US-JennyNeural',
  'en-US-JennyNeural': 'en-US-JennyNeural',
  'google-male': 'en-US-ChristopherNeural',
  'en-US-ChristopherNeural': 'en-US-ChristopherNeural'
};

export function resolveVoice(type?: string, text?: string): { voice: string; isKhmer: boolean } {
  const normType = (type || 'google').trim().toLowerCase();
  const hasKhmerChars = /[\u1780-\u17FF]/.test(text || '');

  if (
    normType === 'kiritts-male' ||
    normType === 'piseth' ||
    normType === 'km-kh-pisethneural' ||
    normType.includes('piseth')
  ) {
    return { voice: 'km-KH-PisethNeural', isKhmer: true };
  }

  if (
    normType === 'kiritts-female' ||
    normType === 'sreymom' ||
    normType === 'km-kh-sreymomneural' ||
    normType.includes('sreymom')
  ) {
    return { voice: 'km-KH-SreymomNeural', isKhmer: true };
  }

  if (
    normType === 'google-male' ||
    normType === 'en-us-christopherneural' ||
    normType.includes('christopher')
  ) {
    return {
      voice: hasKhmerChars ? 'km-KH-PisethNeural' : 'en-US-ChristopherNeural',
      isKhmer: hasKhmerChars
    };
  }

  // Default to Google / universal neural voice, but automatically speak Khmer Piseth if text is Khmer
  if (hasKhmerChars) {
    return { voice: 'km-KH-PisethNeural', isKhmer: true };
  }

  return { voice: 'en-US-JennyNeural', isKhmer: false };
}

/**
 * Direct Node.js WebSocket Edge-TTS synthesis into in-memory buffer (zero disk I/O)
 */
async function tryNodeEdgeTtsToBuffer(
  voice: string,
  text: string,
  options?: { pitch?: string; rate?: string; volume?: string }
): Promise<Buffer | null> {
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const prosody = {
      pitch: options?.pitch || '+0Hz',
      rate: options?.rate || '+0%',
      volume: options?.volume || '+0%'
    };
    const { audioStream } = tts.toStream(text, prosody);
    return await new Promise<Buffer | null>((resolve) => {
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => {
        resolve(null);
      }, 10000);

      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => {
        clearTimeout(timer);
        const full = Buffer.concat(chunks);
        resolve(full.length > 100 ? full : null);
      });
      audioStream.on('error', (err) => {
        clearTimeout(timer);
        console.warn(`[TTS Service] Node audioStream error (${voice}):`, err);
        resolve(null);
      });
    });
  } catch (err: any) {
    console.warn(`[TTS Service] Node msedge-tts failed (${voice}):`, err?.message || err);
    return null;
  }
}

/**
 * Python CLI edge-tts fallback synthesis (writes to temporary file in os.tmpdir and deletes immediately)
 */
async function tryEdgeTtsToBuffer(
  voice: string,
  text: string,
  options?: { pitch?: string; rate?: string; volume?: string }
): Promise<Buffer | null> {
  const tempFile = path.join(os.tmpdir(), `tts-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.mp3`);
  try {
    const homeDir = os.homedir() || '/root';
    const customPath = [
      process.env.PATH || '',
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
      path.join(homeDir, '.local', 'bin'),
      path.join(homeDir, 'bin')
    ].filter(Boolean).join(':');

    const pitchArg = options?.pitch || '+0Hz';
    const rateArg = options?.rate || '+0%';

    const candidates: { cmd: string; args: string[] }[] = [
      { cmd: '/opt/homebrew/bin/edge-tts', args: ['--voice', voice, '--pitch', pitchArg, '--rate', rateArg, '--text', text, '--write-media', tempFile] },
      { cmd: 'edge-tts', args: ['--voice', voice, '--pitch', pitchArg, '--rate', rateArg, '--text', text, '--write-media', tempFile] },
      { cmd: '/usr/local/bin/edge-tts', args: ['--voice', voice, '--pitch', pitchArg, '--rate', rateArg, '--text', text, '--write-media', tempFile] },
      { cmd: '/usr/bin/edge-tts', args: ['--voice', voice, '--pitch', pitchArg, '--rate', rateArg, '--text', text, '--write-media', tempFile] },
      { cmd: path.join(homeDir, '.local', 'bin', 'edge-tts'), args: ['--voice', voice, '--pitch', pitchArg, '--rate', rateArg, '--text', text, '--write-media', tempFile] },
      { cmd: '/opt/homebrew/bin/python3', args: ['-m', 'edge_tts', '--voice', voice, '--pitch', pitchArg, '--rate', rateArg, '--text', text, '--write-media', tempFile] },
      { cmd: 'python3', args: ['-m', 'edge_tts', '--voice', voice, '--pitch', pitchArg, '--rate', rateArg, '--text', text, '--write-media', tempFile] },
      { cmd: 'python', args: ['-m', 'edge_tts', '--voice', voice, '--pitch', pitchArg, '--rate', rateArg, '--text', text, '--write-media', tempFile] }
    ];

    for (const candidate of candidates) {
      try {
        await execFileAsync(candidate.cmd, candidate.args, {
          timeout: 12000,
          env: { ...process.env, PATH: customPath }
        });
        if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 100) {
          return fs.readFileSync(tempFile);
        }
      } catch {}
    }
  } catch {} finally {
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {}
  }
  return null;
}

/**
 * Server-side Google Translate TTS Downloader directly into memory buffer (zero disk I/O)
 */
async function fetchGoogleTranslateTtsToBuffer(lang: string, text: string): Promise<Buffer | null> {
  const endpoints = [
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text.slice(0, 190))}`,
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text.slice(0, 190))}`
  ];

  for (const url of endpoints) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
          Accept: 'audio/mpeg, audio/*;q=0.9, */*;q=0.8'
        }
      });

      if (response.data && response.data.byteLength > 100) {
        return Buffer.from(response.data);
      }
    } catch (err: any) {
      console.warn(`[TTS Service] Google TTS endpoint failed (${url}):`, err?.message || err);
    }
  }
  return null;
}

export interface ClonedVocalProfile {
  averagePitchHz: number;
  detectedGender: 'male' | 'female';
  soundStyle?: string;
  pacingLabel?: string;
  timbre?: string;
  tau?: number;
  f0Std?: number;
  spectralBrightnessHz: number;
  speakingTempoRatio: number;
  chestGainDb: number;
  presenceGainDb: number;
  airGainDb: number;
  pitchOffsetHz: number;
  ratePercent: number;
}

const NEURAL_CLONE_SCRIPT = path.join(process.cwd(), 'scripts', 'neural_voice_clone.py');
const PYTHON_CANDIDATES = [
  '/Users/hochenheng/Desktop/ClaudeNeon/.venv/bin/python',
  path.join(process.cwd(), '.venv', 'bin', 'python'),
  '/opt/homebrew/bin/python3',
  'python3'
];

function resolveNeuralPythonBin(): string {
  for (const bin of PYTHON_CANDIDATES) {
    if (bin === 'python3' || fs.existsSync(bin)) {
      return bin;
    }
  }
  return 'python3';
}

interface PendingNeuralJob {
  resolve: (data: any) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

let neuralWorkerProc: ChildProcess | null = null;
let neuralWorkerReady = false;
const pendingNeuralJobs = new Map<string, PendingNeuralJob>();

function ensureNeuralCloneWorker(): ChildProcess | null {
  if (neuralWorkerProc && !neuralWorkerProc.killed && neuralWorkerProc.stdin?.writable) {
    return neuralWorkerProc;
  }
  if (!fs.existsSync(NEURAL_CLONE_SCRIPT)) {
    return null;
  }

  try {
    const pyBin = resolveNeuralPythonBin();
    const proc = spawn(pyBin, [NEURAL_CLONE_SCRIPT, '--serve'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    neuralWorkerProc = proc;
    neuralWorkerReady = false;

    if (proc.stdout) {
      const rl = readline.createInterface({ input: proc.stdout });
      rl.on('line', (line) => {
        try {
          const msg = JSON.parse(line.trim());
          if (msg.ready) {
            neuralWorkerReady = true;
            return;
          }
          if (msg.id && pendingNeuralJobs.has(msg.id)) {
            const job = pendingNeuralJobs.get(msg.id)!;
            pendingNeuralJobs.delete(msg.id);
            clearTimeout(job.timer);
            if (msg.ok) {
              job.resolve(msg.meta);
            } else {
              job.reject(new Error(msg.error || 'Neural worker error'));
            }
          }
        } catch {}
      });
    }

    proc.on('exit', () => {
      neuralWorkerProc = null;
      neuralWorkerReady = false;
      for (const [id, job] of pendingNeuralJobs.entries()) {
        clearTimeout(job.timer);
        job.reject(new Error('Neural worker exited'));
        pendingNeuralJobs.delete(id);
      }
    });

    return proc;
  } catch (e) {
    console.warn('[TTS Service] Could not start persistent neural worker:', e);
    return null;
  }
}

async function callNeuralCloneEngine(payload: {
  cmd: 'analyze' | 'convert';
  refWav: string;
  srcAudio?: string;
  outAudio?: string;
  pitchOffsetHz?: number;
  force?: boolean;
}): Promise<any | null> {
  if (!fs.existsSync(NEURAL_CLONE_SCRIPT) || !payload.refWav || !fs.existsSync(payload.refWav)) {
    return null;
  }

  const proc = ensureNeuralCloneWorker();
  if (proc && proc.stdin?.writable && neuralWorkerReady) {
    try {
      const reqId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      return await new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingNeuralJobs.delete(reqId);
          reject(new Error('Neural worker timeout'));
        }, 12000);
        pendingNeuralJobs.set(reqId, { resolve, reject, timer });
        proc.stdin!.write(JSON.stringify({ id: reqId, ...payload }) + '\n');
      });
    } catch {}
  }

  // Fallback to direct CLI invocation
  try {
    const pyBin = resolveNeuralPythonBin();
    const args: string[] = [NEURAL_CLONE_SCRIPT];
    if (payload.cmd === 'analyze') {
      args.push('--analyze', '--ref-wav', payload.refWav);
      if (payload.force) args.push('--force');
    } else {
      args.push(
        '--convert',
        '--ref-wav',
        payload.refWav,
        '--src-audio',
        payload.srcAudio || '',
        '--out-audio',
        payload.outAudio || '',
        '--pitch-offset-hz',
        String(payload.pitchOffsetHz || 0)
      );
    }
    const { stdout } = await execFileAsync(pyBin, args, { timeout: 18000 });
    const lines = stdout.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    return JSON.parse(lastLine);
  } catch (e) {
    console.warn('[TTS Service] Neural clone CLI fallback warning:', e);
    return null;
  }
}

// Pre-warm the OpenVoiceV2 neural worker on startup
ensureNeuralCloneWorker();


/**
 * Analyzes a recorded client voice sample (.wav / .webm / .mp3) to extract its acoustic vocal fingerprint
 * and pre-build the 256-D OpenVoiceV2 speaker tone-color embedding + Welch LTAS spectrum.
 */
export async function analyzeVoiceSampleFile(inputPath: string): Promise<ClonedVocalProfile> {
  const defaultProfile: ClonedVocalProfile = {
    averagePitchHz: 130,
    detectedGender: 'male',
    soundStyle: 'Warm & Conversational',
    pacingLabel: 'Natural (1.0x)',
    timbre: 'balanced natural voice',
    spectralBrightnessHz: 420,
    speakingTempoRatio: 1.0,
    chestGainDb: 2.0,
    presenceGainDb: 1.8,
    airGainDb: 1.2,
    pitchOffsetHz: 0,
    ratePercent: 0,
    tau: 0.19
  };

  if (!inputPath || !fs.existsSync(inputPath)) {
    return defaultProfile;
  }

  // 1. Primary: Use PyTorch + OpenVoiceV2 + Band-Passed Glottal F0 Analyzer
  const neuralMeta = await callNeuralCloneEngine({
    cmd: 'analyze',
    refWav: inputPath,
    force: true
  });
  if (neuralMeta && typeof neuralMeta.averagePitchHz === 'number') {
    return {
      averagePitchHz: neuralMeta.averagePitchHz,
      detectedGender: neuralMeta.detectedGender === 'female' ? 'female' : 'male',
      soundStyle: neuralMeta.soundStyle || 'Warm & Conversational',
      pacingLabel: neuralMeta.pacingLabel || 'Natural (1.0x)',
      timbre: neuralMeta.timbre || 'balanced natural voice',
      tau: neuralMeta.tau ?? 0.19,
      f0Std: neuralMeta.f0Std ?? 18,
      spectralBrightnessHz: neuralMeta.spectralBrightnessHz ?? 420,
      speakingTempoRatio: neuralMeta.speakingTempoRatio ?? 1.0,
      chestGainDb: neuralMeta.chestGainDb ?? 2.0,
      presenceGainDb: neuralMeta.presenceGainDb ?? 1.8,
      airGainDb: neuralMeta.airGainDb ?? 1.2,
      pitchOffsetHz: neuralMeta.pitchOffsetHz ?? 0,
      ratePercent: neuralMeta.ratePercent ?? 0
    };
  }

  return defaultProfile;
}

/**
 * Converts a synthesized base TTS MP3 buffer to match the streamer's recorded voice sample
 * using OpenVoiceV2 Neural Tone-Color Conversion (256-D ReferenceEncoder + VITS Flow + HiFi-GAN),
 * exact glottal F0 pitch alignment, and 513-tap Blackman FIR Welch LTAS formant envelope transfer.
 */
async function morphAudioBufferToClonedVoice(
  inputBuffer: Buffer,
  profile: ClonedVocalProfile,
  referenceWavPath?: string
): Promise<Buffer> {
  const inFile = path.join(os.tmpdir(), `clone-in-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.mp3`);
  const outFile = path.join(os.tmpdir(), `clone-out-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.mp3`);
  try {
    fs.writeFileSync(inFile, inputBuffer);

    // 1. Run OpenVoiceV2 Neural Tone-Color Converter + 513-Tap Welch LTAS Formant Transfer when reference WAV exists
    if (referenceWavPath && fs.existsSync(referenceWavPath)) {
      const convertedMeta = await callNeuralCloneEngine({
        cmd: 'convert',
        refWav: referenceWavPath,
        srcAudio: inFile,
        outAudio: outFile,
        pitchOffsetHz: Number(profile.pitchOffsetHz || 0)
      });
      if (convertedMeta && fs.existsSync(outFile) && fs.statSync(outFile).size > 200) {
        return fs.readFileSync(outFile);
      }
    }

    // 2. Fallback gentle broadcast EQ if reference WAV was not found on disk
    const chestG = Number(profile.chestGainDb ?? 1.5).toFixed(1);
    const presG = Number(profile.presenceGainDb ?? 1.5).toFixed(1);
    const airG = Number(profile.airGainDb ?? 1.2).toFixed(1);

    const afChain = [
      `highpass=f=75`,
      `equalizer=f=220:t=q:w=1.2:g=${chestG}`,
      `equalizer=f=3500:t=q:w=1.4:g=${presG}`,
      `equalizer=f=8000:t=q:w=1.4:g=${airG}`,
      `acompressor=threshold=-18dB:ratio=2.2:attack=15:release=140:makeup=2`
    ].join(',');

    const ffmpegCandidates = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg', 'ffmpeg'];
    for (const cmd of ffmpegCandidates) {
      try {
        await execFileAsync(
          cmd,
          ['-y', '-i', inFile, '-af', afChain, '-ar', '24000', '-ac', '1', '-b:a', '128k', outFile],
          { timeout: 8000 }
        );
        if (fs.existsSync(outFile) && fs.statSync(outFile).size > 200) {
          return fs.readFileSync(outFile);
        }
      } catch {}
    }
  } catch (e) {
    console.warn('[TTS Service] Neural vocal clone warning:', e);
  } finally {
    try {
      if (fs.existsSync(inFile)) fs.unlinkSync(inFile);
      if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    } catch {}
  }
  return inputBuffer;
}

export interface SynthesizedTtsResult {
  audioUrl: string;
  filePath?: string;
  buffer?: Buffer;
}

export async function synthesizeTTSWithBuffer(params: {
  text: string;
  type?: string;
  clonedVoiceUrl?: string;
  clonedVoiceName?: string;
  pitch?: string;
  rate?: string;
  volume?: string;
  token?: string;
}): Promise<SynthesizedTtsResult> {
  const { text, type = 'google', clonedVoiceUrl, clonedVoiceName } = params;

  // Clean emoji and surrogate pairs from text
  const rawClean = text
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .trim()
    .slice(0, 300);

  if (!rawClean) {
    const fallbackChime = path.join(process.cwd(), 'public', 'sounds', 'neon-chime.mp3');
    return {
      audioUrl: '/sounds/neon-chime.mp3',
      filePath: fs.existsSync(fallbackChime) ? fallbackChime : undefined,
      buffer: fs.existsSync(fallbackChime) ? fs.readFileSync(fallbackChime) : undefined
    };
  }

  let isCloned = type === 'cloned' || type === 'neural-clone' || type === 'neural' || type === 'kiritts-clone';
  let activeVoice = 'km-KH-PisethNeural';
  let isKhmer = isKhmerText(rawClean);
  let prosodyOptions = {
    pitch: params.pitch || '+0Hz',
    rate: params.rate || '+0%',
    volume: params.volume || '+0%'
  };
  let clonedProfile: ClonedVocalProfile | null = null;
  let resolvedSampleDiskPath: string | undefined = undefined;

  if (isCloned) {
    // -------------------------------------------------------------
    // OPENVOICEV2 NEURAL CLONE VOICE RESOLUTION & SAMPLE PROFILE
    // Always sort by { clonedAt: -1 } so the newest voice clone is used!
    // -------------------------------------------------------------
    let cloneDoc: any = null;
    try {
      const { getVoiceClonesCollection } = await import('@/server/database/mongo');
      const col = await getVoiceClonesCollection();
      if (clonedVoiceUrl) {
        cloneDoc = await col.findOne(
          {
            $or: [
              { sampleUrl: clonedVoiceUrl },
              { voiceName: clonedVoiceUrl },
              ...(clonedVoiceName ? [{ voiceName: clonedVoiceName }] : [])
            ]
          },
          { sort: { clonedAt: -1 } }
        );
      }
      if (!cloneDoc && clonedVoiceName) {
        cloneDoc = await col.findOne({ voiceName: clonedVoiceName }, { sort: { clonedAt: -1 } });
      }
      if (!cloneDoc) {
        cloneDoc = await col.findOne({}, { sort: { clonedAt: -1 } });
      }
    } catch (e) {
      console.warn('[TTS Service] Cloned voice DB lookup error:', e);
    }

    // All users (Free & Pro) have full access to OpenVoiceV2 Neural Voice Cloning
    if (isCloned) {
      const isSupportedSamplePath = (p?: string) =>
        Boolean(p && typeof p === 'string' && (p.startsWith('/uploads/voices/') || p.startsWith('/assets/voice-clone/')));

      const relSample = isSupportedSamplePath(clonedVoiceUrl)
        ? clonedVoiceUrl
        : cloneDoc?.sampleUrl;

      if (isSupportedSamplePath(relSample)) {
        const candidatePath = path.join(process.cwd(), 'public', relSample!);
        if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).size > 500) {
          resolvedSampleDiskPath = candidatePath;
        }
      }

      // Fallback: check studio asset or newest .wav in /public/uploads/voices/
      if (!resolvedSampleDiskPath) {
        try {
          const studioDefault = path.join(process.cwd(), 'public', 'assets', 'voice-clone', 'studio-streamer-pro.wav');
          if (fs.existsSync(studioDefault) && fs.statSync(studioDefault).size > 500) {
            resolvedSampleDiskPath = studioDefault;
          } else {
            const voicesDir = path.join(process.cwd(), 'public', 'uploads', 'voices');
            if (fs.existsSync(voicesDir)) {
              const wavFiles = fs
                .readdirSync(voicesDir)
                .filter((f) => f.endsWith('.wav'))
                .map((f) => ({
                  full: path.join(voicesDir, f),
                  mtime: fs.statSync(path.join(voicesDir, f)).mtimeMs
                }))
                .sort((a, b) => b.mtime - a.mtime);
              if (wavFiles.length > 0) {
                resolvedSampleDiskPath = wavFiles[0].full;
              }
            }
          }
        } catch {}
      }

      const parsedManualPitch = parseInt(String(params.pitch || '0').replace(/[^0-9-]/g, ''), 10) || 0;
      const parsedManualRate = parseInt(String(params.rate || '0').replace(/[^0-9-]/g, ''), 10) || 0;

      // Use crystal-clear carrier matching the streamer's acoustic gender & language
      const isFemale =
        cloneDoc?.detectedGender === 'female' ||
        cloneDoc?.baseModel === 'neural-female' ||
        cloneDoc?.baseModel === 'female' ||
        cloneDoc?.baseModel === 'kiritts-female' ||
        (clonedVoiceUrl && clonedVoiceUrl.includes('velvet')) ||
        Number(cloneDoc?.averagePitchHz) > 175;

      // Carrier voice matching language, acoustic gender, and sound style
      if (isKhmer) {
        activeVoice = isFemale ? 'km-KH-SreymomNeural' : 'km-KH-PisethNeural';
      } else {
        if (isFemale) {
          activeVoice = 'en-US-JennyNeural';
        } else {
          const soundStyle = cloneDoc?.soundStyle;
          const avgPitch = Number(cloneDoc?.averagePitchHz || 130);
          activeVoice =
            soundStyle === 'Deep & Resonant' || avgPitch < 122
              ? 'en-US-ChristopherNeural'
              : 'en-US-GuyNeural';
        }
      }

      const effectivePitchHz = Number(cloneDoc?.averagePitchHz) || (isFemale ? 215 : 140);
      clonedProfile = {
        averagePitchHz: effectivePitchHz,
        detectedGender: isFemale ? 'female' : 'male',
        soundStyle: cloneDoc?.soundStyle || 'Warm & Conversational',
        pacingLabel: cloneDoc?.pacingLabel || 'Natural (1.0x)',
        timbre: cloneDoc?.timbre || 'balanced natural studio voice',
        tau: cloneDoc?.tau ?? 0.13,
        f0Std: cloneDoc?.f0Std ?? 18,
        spectralBrightnessHz: Number(cloneDoc?.spectralBrightnessHz) || 400,
        speakingTempoRatio: Number(cloneDoc?.speakingTempoRatio) || 1.0,
        chestGainDb: Number(cloneDoc?.chestGainDb ?? 2.0),
        presenceGainDb: Number(cloneDoc?.presenceGainDb ?? 1.8),
        airGainDb: Number(cloneDoc?.airGainDb ?? 1.2),
        pitchOffsetHz: parsedManualPitch,
        ratePercent: parsedManualRate
      };

      // Keep carrier pitch at +0Hz so neural_voice_clone.py performs single-stage phase-vocoder pitch alignment
      const trainedRate =
        cloneDoc?.rate && cloneDoc.rate !== '+0%'
          ? cloneDoc.rate
          : (parsedManualRate !== 0
              ? `${parsedManualRate > 0 ? '+' : ''}${parsedManualRate}%`
              : '+0%');

      prosodyOptions = {
        pitch: '+0Hz',
        rate: params.rate && params.rate !== '+0%' ? params.rate : trainedRate,
        volume: params.volume || cloneDoc?.volume || '+0%'
      };
    }
  }

  if (!isCloned) {
    // Standard voice resolution (or free tier fallback)
    const resolved = resolveVoice(type === 'cloned' ? 'google' : type, rawClean);
    activeVoice = resolved.voice;
    isKhmer = resolved.isKhmer;
  }

  // Normalize currency symbols ($ -> dollars/ដុល្លារ, ៛ -> riel/រៀល) and chat symbols
  const cleanedText = normalizeCurrencyAndSymbols(rawClean, isKhmer).slice(0, 300);
  const sampleTag = resolvedSampleDiskPath ? path.basename(resolvedSampleDiskPath) : 'default';
  const cloneCacheTag = clonedProfile
    ? `ov2clone:${sampleTag}:${clonedProfile.averagePitchHz}:${clonedProfile.pitchOffsetHz}`
    : 'std';
  const cacheKey = `${activeVoice}:${cloneCacheTag}:${cleanedText}:${prosodyOptions.pitch}:${prosodyOptions.rate}`;

  // 1. Check in-memory short-lived cache (prevents redundant synthesis during quick replay)
  pruneExpiredCache();
  const cached = ttsMemoryCache.get(cacheKey);

  const safeSampleUrl =
    clonedVoiceUrl && !clonedVoiceUrl.startsWith('data:') && clonedVoiceUrl.length < 250
      ? clonedVoiceUrl
      : '';

  const streamUrl = `/api/tts?type=${encodeURIComponent(type)}&clonedVoiceSampleUrl=${encodeURIComponent(
    safeSampleUrl
  )}&clonedVoiceName=${encodeURIComponent(clonedVoiceName || '')}&pitch=${encodeURIComponent(
    prosodyOptions.pitch
  )}&rate=${encodeURIComponent(prosodyOptions.rate)}&text=${encodeURIComponent(cleanedText.slice(0, 250))}`;

  if (cached && cached.buffer) {
    return {
      audioUrl: streamUrl,
      buffer: cached.buffer
    };
  }

  // 3. Pure Node.js Edge-TTS direct synthesis
  let rawBuffer = await tryNodeEdgeTtsToBuffer(activeVoice, cleanedText, prosodyOptions);

  // 3. Fallback to Python edge-tts CLI
  if (!rawBuffer) {
    rawBuffer = await tryEdgeTtsToBuffer(activeVoice, cleanedText, prosodyOptions);
  }

  // 4. Fallback to Server-side Google Translate TTS into memory buffer
  const lang = isKhmer ? 'km' : 'en';
  if (!rawBuffer) {
    rawBuffer = await fetchGoogleTranslateTtsToBuffer(lang, cleanedText);
  }

  if (rawBuffer) {
    const finalBuffer =
      isCloned && clonedProfile
        ? await morphAudioBufferToClonedVoice(rawBuffer, clonedProfile, resolvedSampleDiskPath)
        : rawBuffer;

    ttsMemoryCache.set(cacheKey, {
      buffer: finalBuffer,
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes in RAM, then automatically freed
    });
    return {
      audioUrl: streamUrl,
      buffer: finalBuffer
    };
  }

  // 5. Last resort fallback external URL
  return {
    audioUrl: `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${lang}&q=${encodeURIComponent(
      cleanedText.slice(0, 150)
    )}`
  };
}

export async function synthesizeTTS(params: {
  text: string;
  type?: string;
  clonedVoiceUrl?: string;
  clonedVoiceName?: string;
  pitch?: string;
  rate?: string;
  volume?: string;
  token?: string;
}): Promise<string> {
  const result = await synthesizeTTSWithBuffer(params);
  return result.audioUrl;
}
