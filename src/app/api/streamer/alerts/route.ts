import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getAlertSettingsCollection } from '@/server/database/mongo';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alertCol = await getAlertSettingsCollection();
    let settings = await alertCol.findOne({
      $or: [{ streamerId: user.id }, { streamer_id: user.id as any }]
    }) as any;

    if (!settings) {
      const now = new Date();
      await alertCol.insertOne({
        streamerId: user.id,
        templateStyle: 'neon-box',
        glowColor: '#00F0FF',
        soundUrl: '/sounds/neon-chime.mp3',
        soundVolume: 0.85,
        minAmountAlert: 1.0,
        durationSeconds: 8,
        ttsEnabled: true,
        textTemplate: '{name} dropped {amount} on the stream! 💥',
        createdAt: now,
        updatedAt: now
      });
      settings = await alertCol.findOne({ streamerId: user.id });
    }

    if (settings) {
      const v = (settings.ttsVoice || settings.tts_voice || '').toLowerCase();
      settings.ttsType =
        v === 'google-male' || v.includes('christopher') ? 'google-male'
        : v.includes('female') || v.includes('sreymom') ? 'kiritts-female'
        : v.includes('male') || v.includes('piseth') ? 'kiritts-male'
        : v.includes('cloned') ? 'cloned'
        : (settings.ttsType || 'google');
    }

    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      template_style,
      glow_color,
      sound_url,
      sound_volume,
      min_amount_alert,
      duration_seconds,
      tts_enabled,
      tts_min_amount,
      tts_voice,
      custom_gif_url,
      text_template
    } = body;

    const resolvedVoice = body.ttsType || body.tts_type || body.tts_voice || tts_voice || 'Google US English';
    const now = new Date();
    const alertCol = await getAlertSettingsCollection();

    await alertCol.updateOne(
      { streamerId: user.id },
      {
        $set: {
          streamerId: user.id,
          templateStyle: template_style ?? 'neon-box',
          template_style: template_style ?? 'neon-box',
          glowColor: glow_color ?? '#00F0FF',
          glow_color: glow_color ?? '#00F0FF',
          soundUrl: sound_url ?? '/sounds/neon-chime.mp3',
          sound_url: sound_url ?? '/sounds/neon-chime.mp3',
          soundVolume: sound_volume !== undefined ? Number(sound_volume) : 0.85,
          sound_volume: sound_volume !== undefined ? Number(sound_volume) : 0.85,
          minAmountAlert: min_amount_alert !== undefined ? Number(min_amount_alert) : 1.0,
          min_amount_alert: min_amount_alert !== undefined ? Number(min_amount_alert) : 1.0,
          durationSeconds: duration_seconds !== undefined ? Number(duration_seconds) : 8,
          duration_seconds: duration_seconds !== undefined ? Number(duration_seconds) : 8,
          ttsEnabled: tts_enabled !== undefined ? Boolean(tts_enabled) : true,
          tts_enabled: tts_enabled !== undefined ? (tts_enabled ? 1 : 0) : 1,
          ttsVoice: resolvedVoice,
          tts_voice: resolvedVoice,
          ttsType: resolvedVoice,
          customGifUrl: custom_gif_url || null,
          custom_gif_url: custom_gif_url || null,
          textTemplate: text_template ?? '{name} dropped {amount} on the stream! 💥',
          text_template: text_template ?? '{name} dropped {amount} on the stream! 💥',
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );

    const updated = await alertCol.findOne({ streamerId: user.id });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
