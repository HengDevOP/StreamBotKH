import { NextRequest, NextResponse } from 'next/server';
import { synthesizeTTSWithBuffer } from '@/server/services/ttsService';
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
    const clonedVoiceUrl =
      searchParams.get('clonedVoiceUrl') || searchParams.get('clonedVoiceSampleUrl') || undefined;
    const clonedVoiceName = searchParams.get('clonedVoiceName') || undefined;
    const pitch = searchParams.get('pitch') || undefined;
    const rate = searchParams.get('rate') || undefined;
    const volume = searchParams.get('volume') || undefined;

    const result = await synthesizeTTSWithBuffer({
      text,
      type,
      clonedVoiceUrl,
      clonedVoiceName,
      pitch,
      rate,
      volume
    });

    // Stream raw audio/mpeg bytes directly from /api/tts in-memory (no files stored on disk)
    if (result.buffer && result.buffer.length > 0) {
      return new NextResponse(result.buffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(result.buffer.length),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (result.audioUrl.startsWith('/')) {
      return NextResponse.redirect(new URL(result.audioUrl, req.url));
    }
    return NextResponse.redirect(result.audioUrl);
  } catch (err: any) {
    console.error('API /api/tts GET error:', err);
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

    const result = await synthesizeTTSWithBuffer({
      text,
      type,
      clonedVoiceUrl,
      clonedVoiceName,
      pitch,
      rate,
      volume
    });

    const safeSampleUrl =
      clonedVoiceUrl && !clonedVoiceUrl.startsWith('data:') && clonedVoiceUrl.length < 250
        ? clonedVoiceUrl
        : '';

    const directStreamUrl = `/api/tts?type=${encodeURIComponent(type)}&clonedVoiceSampleUrl=${encodeURIComponent(
      safeSampleUrl
    )}&clonedVoiceName=${encodeURIComponent(clonedVoiceName || '')}&pitch=${encodeURIComponent(
      pitch || '+0Hz'
    )}&rate=${encodeURIComponent(rate || '+0%')}&text=${encodeURIComponent(text.slice(0, 250))}`;

    return NextResponse.json({
      success: true,
      text,
      type,
      audioUrl: directStreamUrl,
      staticUrl: result.audioUrl
    });
  } catch (err: any) {
    console.error('API /api/tts POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
