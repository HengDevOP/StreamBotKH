import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/server/database/db';
import { ENV } from '@/server/config/env';

function generateToken(user: { id: string; username: string; email: string }) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    ENV.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credential, email: inputEmail, name: inputName, picture } = body;

    let email = inputEmail;
    let name = inputName || 'Streamer';
    let avatarUrl = picture;

    // Decode basic JWT payload from Google credential if provided
    if (credential) {
      try {
        const payloadBase64 = credential.split('.')[1];
        const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
        const googlePayload = JSON.parse(payloadJson);
        email = googlePayload.email || email;
        name = googlePayload.name || name;
        avatarUrl = googlePayload.picture || avatarUrl;
      } catch (e) {
        console.warn('Could not parse Google credential JWT, using body fallbacks');
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required for Google login' }, { status: 400 });
    }

    // Check if streamer exists
    let streamer = db.prepare('SELECT * FROM streamers WHERE email = ?').get(email) as any;

    if (!streamer) {
      const id = uuidv4();
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);
      const overlayToken = 'ovl_' + uuidv4().replace(/-/g, '').slice(0, 24);
      const pairingCode = 'NEON-' + Math.floor(1000 + Math.random() * 9000);

      db.prepare(`
        INSERT INTO streamers (id, email, username, display_name, avatar_url, overlay_token, telegram_pairing_code)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, email, username, name, avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`, overlayToken, pairingCode);

      db.prepare(`
        INSERT INTO alert_settings (streamer_id, glow_color, sound_url)
        VALUES (?, '#00F0FF', '/sounds/neon-chime.mp3')
      `).run(id);

      db.prepare(`
        INSERT INTO payment_settings (streamer_id, bakong_account_id, bakong_account_name)
        VALUES (?, ?, ?)
      `).run(id, `${username}@abaa`, name.toUpperCase());

      streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(id) as any;
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
        overlayToken: streamer.overlay_token,
        telegramPairingCode: streamer.telegram_pairing_code
      }
    });
  } catch (err: any) {
    console.error('[Auth] Google login error:', err);
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
