import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db, initDatabase } from '@/server/database/db';

function generateToken(user: { id: string; username: string; email: string }) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET || 'streamneon_super_secret_jwt_key_2026',
    { expiresIn: '30d' }
  );
}

async function handleDemoLogin(req: NextRequest) {
  try {
    let requestedUsername = 'neonstreamer';

    if (req.method === 'POST') {
      try {
        const body = await req.json().catch(() => ({}));
        if (body?.username) {
          requestedUsername = String(body.username).trim().replace(/^@/, '');
        }
      } catch {
        // Fallback to default
      }
    }

    let streamer = db.prepare('SELECT * FROM streamers WHERE username = ?').get(requestedUsername) as any;

    if (!streamer) {
      initDatabase();
      streamer = db.prepare('SELECT * FROM streamers WHERE username = ?').get('neonstreamer') as any;
    }

    if (!streamer) {
      return NextResponse.json({ error: 'Demo streamer not found in database' }, { status: 404 });
    }

    const token = generateToken(streamer);

    return NextResponse.json({
      token,
      user: {
        id: streamer.id,
        username: streamer.username,
        displayName: streamer.display_name,
        email: streamer.email,
        avatarUrl: streamer.avatar_url,
        bio: streamer.bio,
        overlayToken: streamer.overlay_token,
        telegramChatId: streamer.telegram_chat_id,
        telegramPairingCode: streamer.telegram_pairing_code
      }
    });
  } catch (err: any) {
    console.error('[Auth] Demo login error:', err);
    return NextResponse.json({ error: err.message || 'Demo login failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleDemoLogin(req);
}

export async function GET(req: NextRequest) {
  return handleDemoLogin(req);
}
