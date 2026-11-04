import { NextRequest, NextResponse } from 'next/server';
import { synthesizeTTS } from '@/server/services/ttsService';
import { checkRateLimit, getClientIp } from '@/server/utils/rateLimiter';

export const dynamic = 'force-dynamic';

const MAX_TEXT_LENGTH = 500;
const TTS_RATE_LIMIT = 35; // max 35 syntheses per minute per IP
const TTS_RATE_WINDOW_MS = 60000;

export async function GET(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`tts:${clientIp}`, TTS_RATE_LIMIT, TTS_RATE_WINDOW_MS);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many TTS requests. Please slow down.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) }
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawText = searchParams.get('text') || 'Thank you for supporting the stream!';
    const text = rawText.slice(0, MAX_TEXT_LENGTH);
    const type = searchParams.get('type') || searchParams.get('ttsType') || 'google';
    const clonedVoiceUrl = searchParams.get('clonedVoiceUrl') || searchParams.get('clonedVoiceSampleUrl') || undefined;
    const clonedVoiceName = searchParams.get('clonedVoiceName') || undefined;
    const pitch = searchParams.get('pitch') || undefined;
    const rate = searchParams.get('rate') || undefined;
    const volume = searchParams.get('volume') || undefined;

    const audioUrl = await synthesizeTTS({
      text,
      type,
      clonedVoiceUrl,
      clonedVoiceName,
      pitch,
      rate,
      volume
    });

    if (audioUrl.startsWith('/')) {
      return NextResponse.redirect(new URL(audioUrl, req.url));
    }
    return NextResponse.redirect(audioUrl);
  } catch (err: any) {
    console.error('API /api/tts/speak GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`tts:${clientIp}`, TTS_RATE_LIMIT, TTS_RATE_WINDOW_MS);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many TTS requests. Please slow down.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) }
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawText = body.text || 'Thank you for your tip!';
    const text = String(rawText).slice(0, MAX_TEXT_LENGTH);
    const type = body.ttsType || body.type || 'google';
    const clonedVoiceUrl = body.clonedVoiceSampleUrl || body.clonedVoiceUrl || undefined;
    const clonedVoiceName = body.clonedVoiceName || undefined;
    const pitch = body.pitch || undefined;
    const rate = body.rate || undefined;
    const volume = body.volume || undefined;

    const audioUrl = await synthesizeTTS({
      text,
      type,
      clonedVoiceUrl,
      clonedVoiceName,
      pitch,
      rate,
      volume
    });

    return NextResponse.json({
      success: true,
      text,
      type,
      audioUrl
    });
  } catch (err: any) {
    console.error('API /api/tts/speak POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
