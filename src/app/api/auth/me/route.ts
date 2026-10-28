import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db, isAdminEmail } from '@/server/database/db';

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
