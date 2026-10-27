import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const streamer = db.prepare(`
    SELECT id, email, username, display_name, avatar_url, bio, plan, overlay_token,
           telegram_chat_id, telegram_pairing_code
    FROM streamers WHERE id = ?
  `).get(user.id) as any;

  if (!streamer) {
    return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: streamer.id,
    email: streamer.email,
    username: streamer.username,
    displayName: streamer.display_name,
    avatarUrl: streamer.avatar_url,
    bio: streamer.bio,
    plan: streamer.plan || 'free',
    overlayToken: streamer.overlay_token,
    telegramChatId: streamer.telegram_chat_id,
    telegramPairingCode: streamer.telegram_pairing_code
  });
}
