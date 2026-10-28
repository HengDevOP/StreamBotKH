import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const rawUsername = params.username || '';
    const cleanUsername = decodeURIComponent(rawUsername).replace(/^@/, '').toLowerCase();

    const streamer = db.prepare(`
      SELECT s.id, s.username, s.display_name, s.avatar_url, s.bio, s.custom_thanks_message, s.is_verified,
             s.plan, s.plan_expires_at,
             a.glow_color, a.template_style, a.min_amount_alert, a.tts_min_amount,
             p.bakong_account_name, p.is_sandbox,
             v.is_enabled as video_enabled,
             v.min_tip_amount as video_min_tip,
             v.max_duration_seconds as video_max_duration
      FROM streamers s
      LEFT JOIN alert_settings a ON s.id = a.streamer_id
      LEFT JOIN payment_settings p ON s.id = p.streamer_id
      LEFT JOIN video_alert_settings v ON s.id = v.streamer_id
      WHERE LOWER(s.username) = ?
    `).get(cleanUsername) as any;

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
    }

    let currentPlan = (streamer.plan || 'free').toLowerCase();
    if (currentPlan === 'pro' && streamer.plan_expires_at) {
      const expiresTime = new Date(streamer.plan_expires_at).getTime();
      if (!isNaN(expiresTime) && expiresTime < Date.now()) {
        db.prepare(`
          UPDATE streamers
          SET plan = 'free', plan_started_at = NULL, plan_expires_at = NULL, plan_duration_days = 0
          WHERE id = ?
        `).run(streamer.id);
        currentPlan = 'free';
      }
    }

    const videoAlertEnabled = streamer.video_enabled === 1;

    return NextResponse.json({
      id: streamer.id,
      username: streamer.username,
      displayName: streamer.display_name,
      avatarUrl: streamer.avatar_url,
      bio: streamer.bio,
      customThanksMessage: streamer.custom_thanks_message || undefined,
      isVerified: streamer.is_verified === 1,
      plan: currentPlan,
      glowColor: streamer.glow_color || '#00F0FF',
      minAmountAlert: streamer.min_amount_alert || 1.0,
      ttsMinAmount: streamer.tts_min_amount || 2.0,
      bakongAccountName: streamer.bakong_account_name || 'StreamNeon Merchant',
      isSandbox: streamer.is_sandbox === 1,
      hasVideoOverlay: videoAlertEnabled,
      videoAlertEnabled: videoAlertEnabled,
      videoMinTipAmount: Number(streamer.video_min_tip ?? 2.0),
      videoMaxDurationSeconds: Number(streamer.video_max_duration ?? 30)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
