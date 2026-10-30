import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import axios from 'axios';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { normalizeCurrencyAndSymbols, isKhmerText } from '../../utils/ttsHelper';

export { normalizeCurrencyAndSymbols, isKhmerText };

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
async function tryNodeEdgeTtsToBuffer(voice: string, text: string): Promise<Buffer | null> {
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
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
async function tryEdgeTtsToBuffer(voice: string, text: string): Promise<Buffer | null> {
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

    const candidates: { cmd: string; args: string[] }[] = [
      { cmd: '/opt/homebrew/bin/edge-tts', args: ['--voice', voice, '--text', text, '--write-media', tempFile] },
      { cmd: 'edge-tts', args: ['--voice', voice, '--text', text, '--write-media', tempFile] },
      { cmd: '/usr/local/bin/edge-tts', args: ['--voice', voice, '--text', text, '--write-media', tempFile] },
      { cmd: '/usr/bin/edge-tts', args: ['--voice', voice, '--text', text, '--write-media', tempFile] },
      { cmd: path.join(homeDir, '.local', 'bin', 'edge-tts'), args: ['--voice', voice, '--text', text, '--write-media', tempFile] },
      { cmd: '/opt/homebrew/bin/python3', args: ['-m', 'edge_tts', '--voice', voice, '--text', text, '--write-media', tempFile] },
      { cmd: 'python3', args: ['-m', 'edge_tts', '--voice', voice, '--text', text, '--write-media', tempFile] },
      { cmd: 'python', args: ['-m', 'edge_tts', '--voice', voice, '--text', text, '--write-media', tempFile] }
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

export interface SynthesizedTtsResult {
  audioUrl: string;
  filePath?: string;
  buffer?: Buffer;
}

export async function synthesizeTTSWithBuffer(params: {
  text: string;
  type?: string;
  clonedVoiceUrl?: string;
}): Promise<SynthesizedTtsResult> {
  const { text, type = 'google', clonedVoiceUrl } = params;

  if (type === 'cloned' && clonedVoiceUrl) {
    if (clonedVoiceUrl.startsWith('/')) {
      const localClonedPath = path.join(process.cwd(), 'public', clonedVoiceUrl);
      if (fs.existsSync(localClonedPath)) {
        return {
          audioUrl: clonedVoiceUrl,
          filePath: localClonedPath,
          buffer: fs.readFileSync(localClonedPath)
        };
      }
    }
    return { audioUrl: clonedVoiceUrl };
  }

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

  // Detect voice model accurately - preserves kiritts-male / kiritts-female even if text contains English
  const { voice, isKhmer } = resolveVoice(type, rawClean);

  // Normalize currency symbols ($ -> dollars/ដុល្លារ, ៛ -> riel/រៀល) and chat symbols
  const cleanedText = normalizeCurrencyAndSymbols(rawClean, isKhmer).slice(0, 300);
  const cacheKey = `${voice}:${cleanedText}`;

  // 1. Check in-memory short-lived cache (prevents redundant synthesis during quick replay)
  pruneExpiredCache();
  const cached = ttsMemoryCache.get(cacheKey);
  const streamUrl = `/api/tts?type=${encodeURIComponent(type)}&text=${encodeURIComponent(cleanedText.slice(0, 250))}`;

  if (cached && cached.buffer) {
    return {
      audioUrl: streamUrl,
      buffer: cached.buffer
    };
  }

  // 2. Pure Node.js Edge-TTS direct synthesis (in-memory buffer, zero disk files)
  const nodeBuffer = await tryNodeEdgeTtsToBuffer(voice, cleanedText);
  if (nodeBuffer) {
    ttsMemoryCache.set(cacheKey, {
      buffer: nodeBuffer,
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes in RAM, then automatically freed
    });
    return {
      audioUrl: streamUrl,
      buffer: nodeBuffer
    };
  }

  // 3. Fallback to Python edge-tts CLI (uses temporary file in /tmp and immediately unlinks)
  const edgeBuffer = await tryEdgeTtsToBuffer(voice, cleanedText);
  if (edgeBuffer) {
    ttsMemoryCache.set(cacheKey, {
      buffer: edgeBuffer,
      expiresAt: Date.now() + 2 * 60 * 1000
    });
    return {
      audioUrl: streamUrl,
      buffer: edgeBuffer
    };
  }

  // 4. Server-side Google Translate TTS into memory buffer
  const lang = isKhmer ? 'km' : 'en';
  const googleBuffer = await fetchGoogleTranslateTtsToBuffer(lang, cleanedText);
  if (googleBuffer) {
    ttsMemoryCache.set(cacheKey, {
      buffer: googleBuffer,
      expiresAt: Date.now() + 2 * 60 * 1000
    });
    return {
      audioUrl: streamUrl,
      buffer: googleBuffer
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
}): Promise<string> {
  const result = await synthesizeTTSWithBuffer(params);
  return result.audioUrl;
}
