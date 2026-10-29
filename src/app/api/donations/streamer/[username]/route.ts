import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const rawUsername = params.username || '';
    const cleanUsername = decodeURIComponent(rawUsername).replace(/^@/, '').toLowerCase();

    let streamer = db.prepare(`
      SELECT s.id, s.username, s.display_name, s.avatar_url, s.bio, s.custom_thanks_message, s.is_verified,
             s.plan, s.plan_expires_at, s.social_links,
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

    // Fallback: If not found in SQLite, check MongoDB users collection and auto-sync
    if (!streamer) {
      try {
        const usersCol = await getUsersCollection();
        const escaped = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const mongoUser = await usersCol.findOne({
          $or: [
            { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
            { userId: cleanUsername }
          ]
        });

        if (mongoUser) {
          const overlayToken = 'ovl_' + uuidv4().replace(/-/g, '').slice(0, 24);
          try {
            db.prepare(`
              INSERT OR REPLACE INTO streamers (
                id, username, display_name, email, avatar_url, bio, custom_thanks_message, is_verified, plan, overlay_token
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              mongoUser.userId,
              mongoUser.username || cleanUsername,
              mongoUser.displayName || mongoUser.username || 'Streamer',
              mongoUser.email || `${cleanUsername}@streambotkh.com`,
              mongoUser.avatarUrl || '',
              mongoUser.bio || '',
              mongoUser.customThanksMessage || '',
              mongoUser.isVerified ? 1 : 0,
              mongoUser.plan || 'free',
              overlayToken
            );
          } catch (e) {
            console.warn('[donations/streamer] SQLite sync error:', e);
          }

          streamer = db.prepare(`
            SELECT s.id, s.username, s.display_name, s.avatar_url, s.bio, s.custom_thanks_message, s.is_verified,
                   s.plan, s.plan_expires_at, s.social_links,
                   a.glow_color, a.template_style, a.min_amount_alert, a.tts_min_amount,
                   p.bakong_account_name, p.is_sandbox,
                   v.is_enabled as video_enabled,
                   v.min_tip_amount as video_min_tip,
                   v.max_duration_seconds as video_max_duration
            FROM streamers s
            LEFT JOIN alert_settings a ON s.id = a.streamer_id
            LEFT JOIN payment_settings p ON s.id = p.streamer_id
            LEFT JOIN video_alert_settings v ON s.id = v.streamer_id
            WHERE s.id = ?
          `).get(mongoUser.userId) as any;
        }
      } catch (e) {}
    }

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

    let userSocialLinks: any[] = [];
    if (streamer.social_links) {
      try {
        userSocialLinks = JSON.parse(streamer.social_links);
      } catch (e) {}
    }

    try {
      const usersCol = await getUsersCollection();
      const mongoUser = await usersCol.findOne({
        $or: [{ userId: streamer.id }, { username: cleanUsername }]
      });
      if (Array.isArray(mongoUser?.socialLinks) && mongoUser.socialLinks.length > 0) {
        userSocialLinks = mongoUser.socialLinks;
      }
    } catch (e) {}

    const videoAlertEnabled = streamer.video_enabled === 1;

    // Check if streamer has an active uploaded Master KHQR code
    let khqrImageUrl = '';
    try {
      const { getGatewayConfigCollection } = await import('@/server/database/mongo');
      const gatewayCol = await getGatewayConfigCollection();
      const gatewayDoc = await gatewayCol.findOne({
        $and: [
          {
            $or: [
              { _id: `khqr_${streamer.id}` },
              { streamerId: streamer.id },
              { _id: `khqr_${cleanUsername}` },
              { streamerId: cleanUsername }
            ]
          },
          { khqrImageUrl: { $exists: true, $ne: '' } }
        ]
      });
      if (gatewayDoc?.khqrImageUrl) {
        khqrImageUrl = gatewayDoc.khqrImageUrl;
      }
    } catch (e) {}

    if (!khqrImageUrl) {
      try {
        const pRow = db.prepare('SELECT master_khqr_image FROM payment_settings WHERE streamer_id = ? AND master_khqr_image IS NOT NULL AND master_khqr_image != ""').get(streamer.id) as any;
        if (pRow?.master_khqr_image) khqrImageUrl = pRow.master_khqr_image;
      } catch (e) {}
    }

    return NextResponse.json({
      id: streamer.id,
      username: streamer.username,
      displayName: streamer.display_name,
      avatarUrl: streamer.avatar_url,
      bio: streamer.bio,
      customThanksMessage: streamer.custom_thanks_message || undefined,
      socialLinks: userSocialLinks,
      links: userSocialLinks,
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
      videoMaxDurationSeconds: Number(streamer.video_max_duration ?? 30),
      hasMasterKhqr: Boolean(khqrImageUrl),
      khqrImageUrl: khqrImageUrl || undefined
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
