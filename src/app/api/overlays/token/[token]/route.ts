import { NextRequest, NextResponse } from 'next/server';
import { getOverlaysCollection } from '@/server/database/mongo';
import { db } from '@/server/database/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const overlaysCol = await getOverlaysCollection();
    const overlay = await overlaysCol.findOne({ overlayToken: token });

    if (!overlay) {
      // Check if token belongs to a streamer in SQLite database or is a valid overlay token format
      const streamer = db.prepare('SELECT * FROM streamers WHERE overlay_token = ?').get(token) as any;
      const videoSettings = streamer ? (db.prepare('SELECT * FROM video_alert_settings WHERE streamer_id = ?').get(streamer.id) as any) : null;
      if (streamer || token.startsWith('ovl_') || token === 'demo-token' || token === 'ovl_token_neon_demo_9921') {
        return NextResponse.json({
          success: true,
          overlay: {
            name: `${streamer?.display_name || streamer?.username || 'Streamer'}'s Overlay`,
            overlayToken: token,
            mediaUrl: 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
            soundUrl: '/sounds/neon-chime.mp3',
            soundVolume: 0.85,
            glowColor: '#00F0FF',
            templateStyle: 'neon-box',
            durationSeconds: 8,
            minAmountAlert: 1.0,
            ttsEnabled: true,
            videoAlertEnabled: videoSettings ? (videoSettings.is_enabled === 1) : true,
            videoMinTipAmount: videoSettings ? Number(videoSettings.min_tip_amount) : 0.25,
            videoMaxDurationSeconds: videoSettings ? Number(videoSettings.max_duration_seconds) : 300,
            videoVolume: videoSettings ? Number(videoSettings.video_volume) : 80,
            width: 1080,
            height: 720
          }
        });
      }

      return NextResponse.json({ error: 'Overlay not found' }, { status: 404 });
    }

    const streamer = db.prepare('SELECT * FROM streamers WHERE overlay_token = ?').get(token) as any;
    const videoSettings = streamer ? (db.prepare('SELECT * FROM video_alert_settings WHERE streamer_id = ?').get(streamer.id) as any) : null;

    return NextResponse.json({
      success: true,
      overlay: {
        ...overlay,
        videoAlertEnabled: overlay.videoAlertEnabled !== undefined ? overlay.videoAlertEnabled : (videoSettings ? videoSettings.is_enabled === 1 : true),
        videoMinTipAmount: overlay.videoMinTipAmount !== undefined ? overlay.videoMinTipAmount : (videoSettings ? Number(videoSettings.min_tip_amount) : 0.25),
        videoMaxDurationSeconds: overlay.videoMaxDurationSeconds !== undefined ? overlay.videoMaxDurationSeconds : (videoSettings ? Number(videoSettings.max_duration_seconds) : 300),
        videoVolume: overlay.videoVolume !== undefined ? overlay.videoVolume : (videoSettings ? Number(videoSettings.video_volume) : 80)
      }
    });
  } catch (err: any) {
    console.error('API /api/overlays/token/[token] error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch overlay' },
      { status: 500 }
    );
  }
}
