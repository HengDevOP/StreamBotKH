import { NextRequest, NextResponse } from 'next/server';
import { synthesizeTTS } from '@/server/services/ttsService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || 'Thank you for supporting the stream!';
    const type = searchParams.get('type') || searchParams.get('ttsType') || 'google';
    const clonedVoiceUrl = searchParams.get('clonedVoiceUrl') || searchParams.get('clonedVoiceSampleUrl') || undefined;

    const audioUrl = await synthesizeTTS({
      text,
      type,
      clonedVoiceUrl
    });

    if (audioUrl.startsWith('/')) {
      return NextResponse.redirect(new URL(audioUrl, req.url));
    }
    return NextResponse.redirect(audioUrl);
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

    const audioUrl = await synthesizeTTS({
      text,
      type,
      clonedVoiceUrl
    });

    return NextResponse.json({
      success: true,
      text,
      type,
      audioUrl
    });
  } catch (err: any) {
    console.error('API /api/tts POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
