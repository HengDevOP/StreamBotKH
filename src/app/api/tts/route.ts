import { NextRequest, NextResponse } from 'next/server';
import { synthesizeTTSWithBuffer } from '@/server/services/ttsService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || 'Thank you for supporting the stream!';
    const type = searchParams.get('type') || searchParams.get('ttsType') || 'google';
    const clonedVoiceUrl =
      searchParams.get('clonedVoiceUrl') || searchParams.get('clonedVoiceSampleUrl') || undefined;

    const result = await synthesizeTTSWithBuffer({
      text,
      type,
      clonedVoiceUrl
    });

    // Stream raw audio/mpeg bytes directly from /api/tts so Nginx, browsers, and OBS Studio
    // never hit 404 on /uploads/tts or 403 Referer blocks on translate.google.com
    if (result.buffer && result.buffer.length > 0) {
      return new NextResponse(result.buffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(result.buffer.length),
          'Cache-Control': 'public, max-age=86400',
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
    const body = await req.json().catch(() => ({}));
    const text = body.text || 'Thank you for your tip!';
    const type = body.ttsType || body.type || 'google';
    const clonedVoiceUrl = body.clonedVoiceSampleUrl || body.clonedVoiceUrl || undefined;

    const result = await synthesizeTTSWithBuffer({
      text,
      type,
      clonedVoiceUrl
    });

    const directStreamUrl = `/api/tts?type=${encodeURIComponent(type)}&text=${encodeURIComponent(
      text.slice(0, 250)
    )}`;

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
