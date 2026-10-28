import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';
import { broadcastAlertToOverlay } from '@/server/services/socketService';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(user.id) as any;
    const alertSettings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(user.id) as any;

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    const v = (body.ttsType || body.tts_voice || alertSettings?.tts_voice || '').toLowerCase();
    const resolvedTtsType = v.includes('female') || v.includes('sreymom') ? 'kiritts-female'
      : v.includes('male') || v.includes('piseth') ? 'kiritts-male'
      : v.includes('cloned') ? 'cloned'
      : 'google';

    const testPayload = {
      donationId: 'test-' + Date.now(),
      donorName: body.donorName || 'Neon Supporter 🔥',
      donorMessage: body.donorMessage || 'Awesome stream! Keep up the great energy! ⚡',
      amount: body.amount || 5.0,
      currency: body.currency || 'USD',
      bankingName: body.bankingName || 'ABA Bank',
      templateStyle: alertSettings?.template_style || 'neon-box',
      glowColor: alertSettings?.glow_color || '#00F0FF',
      soundUrl: alertSettings?.sound_url || '/sounds/neon-chime.mp3',
      soundVolume: alertSettings?.sound_volume ?? 0.8,
      durationSeconds: alertSettings?.duration_seconds ?? 8,
      ttsEnabled: alertSettings?.tts_enabled === 1,
      ttsType: resolvedTtsType,
      ttsVoice: alertSettings?.tts_voice || 'Google US English',
      customGifUrl: alertSettings?.custom_gif_url,
      isTest: true
    };

    broadcastAlertToOverlay(streamer.overlay_token, testPayload);

    return NextResponse.json({ success: true, message: 'Test alert sent to OBS overlay' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
