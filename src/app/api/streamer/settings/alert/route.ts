import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(user.id);

    if (!settings) {
      db.prepare('INSERT INTO alert_settings (streamer_id) VALUES (?)').run(user.id);
      settings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(user.id);
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

    db.prepare(`
      INSERT INTO alert_settings (
        streamer_id, template_style, glow_color, sound_url, sound_volume,
        min_amount_alert, duration_seconds, tts_enabled, tts_min_amount,
        tts_voice, custom_gif_url, text_template
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(streamer_id) DO UPDATE SET
        template_style = excluded.template_style,
        glow_color = excluded.glow_color,
        sound_url = excluded.sound_url,
        sound_volume = excluded.sound_volume,
        min_amount_alert = excluded.min_amount_alert,
        duration_seconds = excluded.duration_seconds,
        tts_enabled = excluded.tts_enabled,
        tts_min_amount = excluded.tts_min_amount,
        tts_voice = excluded.tts_voice,
        custom_gif_url = excluded.custom_gif_url,
        text_template = excluded.text_template
    `).run(
      user.id,
      template_style || 'neon-box',
      glow_color || '#00F0FF',
      sound_url || '/sounds/neon-chime.mp3',
      sound_volume ?? 0.8,
      min_amount_alert ?? 1.0,
      duration_seconds ?? 8,
      tts_enabled ? 1 : 0,
      tts_min_amount ?? 2.0,
      tts_voice || 'Google US English',
      custom_gif_url || '',
      text_template || '{name} dropped {amount}!'
    );

    const updated = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(user.id);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
