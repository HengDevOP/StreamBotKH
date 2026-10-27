import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';
import { broadcastAlertToOverlay } from '@/server/services/socketService';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const donation = db.prepare('SELECT * FROM donations WHERE id = ? AND streamer_id = ?').get(id, user.id) as any;
    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    const streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(user.id) as any;
    const alertSettings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(user.id) as any;

    const payload = {
      donationId: donation.id,
      donorName: donation.donor_name,
      donorMessage: donation.donor_message,
      amount: donation.amount,
      currency: donation.currency,
      bankingName: donation.banking_name || 'Bakong KHQR',
      templateStyle: alertSettings?.template_style || 'neon-box',
      glowColor: alertSettings?.glow_color || '#00F0FF',
      soundUrl: alertSettings?.sound_url || '/sounds/neon-chime.mp3',
      soundVolume: alertSettings?.sound_volume ?? 0.8,
      durationSeconds: alertSettings?.duration_seconds ?? 8,
      ttsEnabled: alertSettings?.tts_enabled === 1,
      ttsVoice: alertSettings?.tts_voice || 'Google US English',
      customGifUrl: alertSettings?.custom_gif_url,
      isTest: false
    };

    broadcastAlertToOverlay(streamer.overlay_token, payload);

    return NextResponse.json({ success: true, message: 'Alert replayed to OBS overlay' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
