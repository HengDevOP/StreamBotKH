import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import axios from 'axios';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const TTS_CACHE_DIR = path.join(process.cwd(), 'public', 'uploads', 'tts');

// Ensure cache directory exists
try {
  if (!fs.existsSync(TTS_CACHE_DIR)) {
    fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
  }
} catch (e) {
  console.error('[TTS Service] Failed to create TTS cache dir:', e);
}

// Map UI voice models to neural voices
export const VOICE_MAP: Record<string, string> = {
  'kiritts-male': 'km-KH-PisethNeural',
  'kiritts-female': 'km-KH-SreymomNeural',
  'google': 'en-US-JennyNeural',
  'google-male': 'en-US-ChristopherNeural'
};

/**
 * Try executing edge-tts across common Linux/macOS binary locations & python3 module fallback
 */
async function tryEdgeTtsToFile(voice: string, text: string, filePath: string): Promise<boolean> {
  const homeDir = os.homedir() || '/root';
  const candidates: { cmd: string; args: string[] }[] = [
    { cmd: 'edge-tts', args: ['--voice', voice, '--text', text, '--write-media', filePath] },
    { cmd: '/usr/local/bin/edge-tts', args: ['--voice', voice, '--text', text, '--write-media', filePath] },
    { cmd: '/usr/bin/edge-tts', args: ['--voice', voice, '--text', text, '--write-media', filePath] },
    { cmd: path.join(homeDir, '.local', 'bin', 'edge-tts'), args: ['--voice', voice, '--text', text, '--write-media', filePath] },
    { cmd: 'python3', args: ['-m', 'edge_tts', '--voice', voice, '--text', text, '--write-media', filePath] }
  ];

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate.cmd, candidate.args, { timeout: 10000 });
      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
        return true;
      }
    } catch {
      // Try next binary location
    }
  }
  return false;
}

/**
 * Server-side Google Translate TTS Downloader (bypasses browser Referer/CORS blocks on VPS)
 */
async function fetchGoogleTranslateTtsToFile(lang: string, text: string, filePath: string): Promise<boolean> {
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
        fs.writeFileSync(filePath, Buffer.from(response.data));
        return true;
      }
    } catch (err: any) {
      console.warn(`[TTS Service] Google TTS endpoint failed (${url}):`, err?.message || err);
    }
  }
  return false;
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
  const cleanedText = text
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .trim()
    .slice(0, 300);

  if (!cleanedText) {
    const fallbackChime = path.join(process.cwd(), 'public', 'sounds', 'neon-chime.mp3');
    return {
      audioUrl: '/sounds/neon-chime.mp3',
      filePath: fs.existsSync(fallbackChime) ? fallbackChime : undefined,
      buffer: fs.existsSync(fallbackChime) ? fs.readFileSync(fallbackChime) : undefined
    };
  }

  // Detect voice model
  let voice = VOICE_MAP[type] || VOICE_MAP['google'];

  // If text contains Khmer characters and type is google, fallback to Khmer Piseth voice
  const hasKhmer = /[\u1780-\u17FF]/.test(cleanedText);
  if (hasKhmer && type === 'google') {
    voice = 'km-KH-PisethNeural';
  }

  // Generate deterministic filename based on voice and text
  const hash = crypto.createHash('md5').update(`${voice}:${cleanedText}`).digest('hex');
  const filename = `${hash}.mp3`;
  const filePath = path.join(TTS_CACHE_DIR, filename);
  const publicUrl = `/uploads/tts/${filename}`;

  // 1. If already cached on disk, return immediately with buffer
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
    return {
      audioUrl: publicUrl,
      filePath,
      buffer: fs.readFileSync(filePath)
    };
  }

  // 2. Try edge-tts across standard binary paths and python3 -m edge_tts
  const edgeSuccess = await tryEdgeTtsToFile(voice, cleanedText, filePath);
  if (edgeSuccess && fs.existsSync(filePath)) {
    return {
      audioUrl: publicUrl,
      filePath,
      buffer: fs.readFileSync(filePath)
    };
  }

  // 3. Server-side Google Translate TTS download (works on any VPS without Python installed!)
  const lang = hasKhmer || type.startsWith('kiritts') ? 'km' : 'en';
  const googleSuccess = await fetchGoogleTranslateTtsToFile(lang, cleanedText, filePath);
  if (googleSuccess && fs.existsSync(filePath)) {
    return {
      audioUrl: publicUrl,
      filePath,
      buffer: fs.readFileSync(filePath)
    };
  }

  // 4. Last resort fallback URL
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
