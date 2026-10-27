import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const TTS_CACHE_DIR = path.join(process.cwd(), 'public', 'uploads', 'tts');

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

export async function synthesizeTTS(params: {
  text: string;
  type?: string;
  clonedVoiceUrl?: string;
}): Promise<string> {
  const { text, type = 'google', clonedVoiceUrl } = params;

  if (type === 'cloned' && clonedVoiceUrl) {
    return clonedVoiceUrl;
  }

  // Clean emoji and surrogate pairs from text
  const cleanedText = text
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .trim()
    .slice(0, 300);

  if (!cleanedText) {
    return '/sounds/neon-chime.mp3';
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

  // If already cached on disk, return immediately
  if (fs.existsSync(filePath)) {
    return publicUrl;
  }

  try {
    // Run edge-tts to generate high quality neural audio
    await execFileAsync('edge-tts', [
      '--voice', voice,
      '--text', cleanedText,
      '--write-media', filePath
    ]);

    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
      return publicUrl;
    }
  } catch (err: any) {
    console.warn('[TTS Service] edge-tts binary execution failed, falling back to Google Translate:', err?.message || err);
  }

  // Fallback: Google Translate audio endpoint
  const lang = hasKhmer || type.startsWith('kiritts') ? 'km' : 'en';
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(cleanedText.slice(0, 150))}`;
}
