import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getUsersCollection, getAlertSettingsCollection } from '@/server/database/mongo';
import { broadcastAlertToOverlay } from '@/server/services/socketService';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usersCol = await getUsersCollection();
    const streamer = await usersCol.findOne({
      $or: [{ userId: user.id }, { id: user.id as any }]
    });

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
    }

    const alertCol = await getAlertSettingsCollection();
    const alertSettings = await alertCol.findOne({
      $or: [
        { streamerId: user.id },
        ...(user.username ? [{ streamerId: user.username }] : [])
      ]
    }) as any;

    const body = await req.json().catch(() => ({}));

    const overlayToken = streamer.overlayToken || streamer.overlay_token;

    const testPayload = {
      donationId: 'test-' + Date.now(),
      donorName: body.donorName || 'Neon Supporter 🔥',
      donorMessage: body.donorMessage || 'Awesome stream! Keep up the great energy! ⚡',
      amount: body.amount || 5.0,
      currency: body.currency || 'USD',
      bankingName: body.bankingName || 'ABA Bank',
      templateStyle: alertSettings?.templateStyle || alertSettings?.template_style || 'neon-box',
      glowColor: alertSettings?.glowColor || alertSettings?.glow_color || '#00F0FF',
      soundUrl: alertSettings?.soundUrl || alertSettings?.sound_url || '/sounds/neon-chime.mp3',
      soundVolume: alertSettings?.soundVolume ?? alertSettings?.sound_volume ?? 0.8,
      durationSeconds: alertSettings?.durationSeconds ?? alertSettings?.duration_seconds ?? 8,
      ttsEnabled: alertSettings ? (alertSettings.ttsEnabled !== undefined ? alertSettings.ttsEnabled : alertSettings.tts_enabled === 1) : true,
      ttsVoice: alertSettings?.ttsVoice || alertSettings?.tts_voice || 'Google US English',
      customGifUrl: alertSettings?.customGifUrl || alertSettings?.custom_gif_url,
      isTest: true
    };

    if (overlayToken) {
      broadcastAlertToOverlay(overlayToken, testPayload);
    }

    return NextResponse.json({ success: true, message: 'Test alert sent to OBS overlay' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
