import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';
import { getIO } from '@/server/services/socketService';

export const dynamic = 'force-dynamic';

function resolveStreamer(req: NextRequest, bodyToken?: string) {
  const user = getAuthenticatedUser(req);
  if (user) {
    return { streamerId: user.id, overlayToken: user.overlay_token };
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || bodyToken || searchParams.get('username') || '';

  if (token) {
    const streamer = db.prepare(`
      SELECT id, overlay_token FROM streamers 
      WHERE overlay_token = ? OR id = ? OR username = ?
    `).get(token, token, token) as any;

    if (streamer) {
      return { streamerId: streamer.id, overlayToken: streamer.overlay_token };
    }
  }

  return { streamerId: 'demo-streamer-id-1001', overlayToken: 'ovl_3223c099b5884ff788670103' };
}

export async function GET(req: NextRequest) {
  try {
    const { streamerId } = resolveStreamer(req);

    let row = db.prepare('SELECT * FROM video_alert_settings WHERE streamer_id = ?').get(streamerId) as any;

    if (!row) {
      db.prepare(`
        INSERT INTO video_alert_settings (streamer_id, is_enabled, min_tip_amount, max_duration_seconds, video_volume, auto_ducking)
        VALUES (?, 0, 2.0, 30, 85, 1)
      `).run(streamerId);
      row = db.prepare('SELECT * FROM video_alert_settings WHERE streamer_id = ?').get(streamerId) as any;
    }

    return NextResponse.json({
      success: true,
      settings: {
        streamerId: row.streamer_id,
        isEnabled: row.is_enabled === 1,
        minTipAmount: Number(row.min_tip_amount ?? 2.0),
        maxDurationSeconds: Number(row.max_duration_seconds ?? 30),
        videoVolume: Number(row.video_volume ?? 85),
        autoDucking: row.auto_ducking === 1
      }
    });
  } catch (err: any) {
    console.error('Error in GET /api/streamer/settings/video:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { streamerId, overlayToken } = resolveStreamer(req, body.token);

    const isEnabled = body.isEnabled !== undefined ? (body.isEnabled ? 1 : 0) : 0;
    // Allowed minimum tip start from $0.25 to $50
    const rawMinTip = body.minTipAmount !== undefined ? Number(body.minTipAmount) : 2.0;
    const minTipAmount = Math.max(0.25, Math.min(50.0, isNaN(rawMinTip) ? 2.0 : rawMinTip));

    // Allowed clip duration up to 5 minutes (300 seconds)
    const rawMaxDuration = body.maxDurationSeconds !== undefined ? Number(body.maxDurationSeconds) : 30;
    const maxDurationSeconds = Math.max(10, Math.min(300, isNaN(rawMaxDuration) ? 30 : rawMaxDuration));

    const rawVolume = body.videoVolume !== undefined ? Number(body.videoVolume) : 85;
    const videoVolume = Math.max(0, Math.min(100, isNaN(rawVolume) ? 85 : rawVolume));

    const autoDucking = body.autoDucking !== undefined ? (body.autoDucking ? 1 : 0) : 1;

    db.prepare(`
      INSERT INTO video_alert_settings (
        streamer_id, is_enabled, min_tip_amount, max_duration_seconds, video_volume, auto_ducking, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(streamer_id) DO UPDATE SET
        is_enabled = excluded.is_enabled,
        min_tip_amount = excluded.min_tip_amount,
        max_duration_seconds = excluded.max_duration_seconds,
        video_volume = excluded.video_volume,
        auto_ducking = excluded.auto_ducking,
        updated_at = datetime('now')
    `).run(
      streamerId,
      isEnabled,
      minTipAmount,
      maxDurationSeconds,
      videoVolume,
      autoDucking
    );

    const updated = {
      streamerId,
      isEnabled: isEnabled === 1,
      minTipAmount,
      maxDurationSeconds,
      videoVolume,
      autoDucking: autoDucking === 1
    };

    try {
      const io = getIO();
      if (io && overlayToken) {
        io.to(`overlay:${overlayToken}`).emit('video_settings:update', updated);
      }
    } catch (e) {
      // ignore socket broadcast error if socket not initialized
    }

    return NextResponse.json({
      success: true,
      settings: updated
    });
  } catch (err: any) {
    console.error('Error in POST /api/streamer/settings/video:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
