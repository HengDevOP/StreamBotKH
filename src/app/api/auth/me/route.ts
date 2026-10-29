import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { db, isAdminEmail } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let streamer = db.prepare(`
    SELECT id, email, username, display_name, avatar_url, bio, plan,
           plan_started_at, plan_expires_at, plan_duration_days,
           overlay_token, telegram_chat_id, telegram_pairing_code, created_at
    FROM streamers WHERE id = ?
  `).get(user.id) as any;

  if (!streamer && user.email) {
    streamer = db.prepare(`
      SELECT id, email, username, display_name, avatar_url, bio, plan,
             plan_started_at, plan_expires_at, plan_duration_days,
             overlay_token, telegram_chat_id, telegram_pairing_code, created_at
      FROM streamers WHERE LOWER(email) = LOWER(?)
    `).get(user.email) as any;
  }

  // Fallback: If not in SQLite (e.g. after container redeploy), restore from MongoDB Atlas
  if (!streamer) {
    try {
      const usersCol = await getUsersCollection();
      const escapedEmail = (user.email || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mongoUser = await usersCol.findOne({
        $or: [
          { userId: user.id },
          ...(escapedEmail ? [{ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] : [])
        ]
      });

      if (mongoUser) {
        const overlayToken = 'ovl_' + uuidv4().replace(/-/g, '').slice(0, 24);
        const pairingCode = 'NEON-' + Math.floor(1000 + Math.random() * 9000);
        db.prepare(`
          INSERT INTO streamers (
            id, email, username, display_name, avatar_url, bio, custom_thanks_message, is_verified, plan, overlay_token, telegram_pairing_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            username = excluded.username,
            display_name = excluded.display_name
        `).run(
          mongoUser.userId,
          mongoUser.email || user.email || '',
          mongoUser.username || user.username || 'streamer',
          mongoUser.displayName || user.display_name || 'Streamer',
          mongoUser.avatarUrl || '',
          mongoUser.bio || '',
          mongoUser.customThanksMessage || '',
          mongoUser.isVerified ? 1 : 0,
          mongoUser.plan || 'free',
          overlayToken,
          pairingCode
        );

        streamer = db.prepare(`
          SELECT id, email, username, display_name, avatar_url, bio, plan,
                 plan_started_at, plan_expires_at, plan_duration_days,
                 overlay_token, telegram_chat_id, telegram_pairing_code, created_at
          FROM streamers WHERE id = ?
        `).get(mongoUser.userId) as any;
      }
    } catch (e) {
      console.warn('[auth/me] Failed to restore streamer from Mongo:', e);
    }
  }

  if (!streamer) {
    return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
  }

  // Automatically check 31-day plan expiration
  if (streamer.plan === 'pro' && streamer.plan_expires_at) {
    const expiresTime = new Date(streamer.plan_expires_at).getTime();
    if (!isNaN(expiresTime) && expiresTime < Date.now()) {
      db.prepare(`
        UPDATE streamers
        SET plan = 'free', plan_started_at = NULL, plan_expires_at = NULL, plan_duration_days = 0
        WHERE id = ?
      `).run(streamer.id);
      streamer.plan = 'free';
      streamer.plan_started_at = null;
      streamer.plan_expires_at = null;
      streamer.plan_duration_days = 0;
    }
  }

  return NextResponse.json({
    id: streamer.id,
    email: streamer.email,
    username: streamer.username,
    displayName: streamer.display_name,
    avatarUrl: streamer.avatar_url,
    bio: streamer.bio,
    plan: streamer.plan || 'free',
    planStartedAt: streamer.plan_started_at || null,
    planExpiresAt: streamer.plan_expires_at || null,
    planDurationDays: streamer.plan_duration_days || 0,
    isAdmin: isAdminEmail(streamer.email),
    overlayToken: streamer.overlay_token,
    telegramChatId: streamer.telegram_chat_id,
    telegramPairingCode: streamer.telegram_pairing_code,
    createdAt: streamer.created_at
  });
}
