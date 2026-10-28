import { NextRequest, NextResponse } from 'next/server';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/server/database/db';
import { getUsersCollection, getOverlaysCollection } from '@/server/database/mongo';

function reloadEnv() {
  const savedPort = process.env.PORT;
  dotenv.config({ override: true });
  if (savedPort) {
    process.env.PORT = savedPort;
  }
}

export function generateToken(user: { id: string; username: string; email: string }) {
  reloadEnv();
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET || 'streamneon_super_secret_jwt_key_2026',
    { expiresIn: '30d' }
  );
}

export function isGoogleOAuthConfigured(): boolean {
  reloadEnv();
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  return (
    Boolean(clientId) &&
    clientId !== 'your_google_client_id_here' &&
    Boolean(clientSecret) &&
    clientSecret !== 'your_google_client_secret_here'
  );
}

export function resolveFrontendOrigin(req: NextRequest): string {
  const queryOrigin = req.nextUrl.searchParams.get('origin');
  if (queryOrigin && /^https?:\/\//i.test(queryOrigin)) {
    return queryOrigin.replace(/\/$/, '');
  }

  const headerOrigin = req.headers.get('origin');
  if (headerOrigin && /^https?:\/\//i.test(headerOrigin)) {
    return headerOrigin.replace(/\/$/, '');
  }

  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '') || 'http';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host || 'localhost:3000';

  // In dev mode, if Express is hit on :5001 directly, prefer :3000 for frontend redirect
  if (host.includes('127.0.0.1:5001') || host.includes('localhost:5001')) {
    return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  return `${proto}://${host}`.replace(/\/$/, '');
}

export function resolveRedirectUri(frontendOrigin: string): string {
  const envCallback = (process.env.GOOGLE_CALLBACK_URL || '').trim();
  if (envCallback && !envCallback.includes('your_')) {
    const isFrontendLocal = frontendOrigin.includes('localhost') || frontendOrigin.includes('127.0.0.1');
    const isCallbackLocal = envCallback.includes('localhost') || envCallback.includes('127.0.0.1');
    // Use GOOGLE_CALLBACK_URL if both are local or if GOOGLE_CALLBACK_URL is set to a production URL
    if (isFrontendLocal === isCallbackLocal || !isCallbackLocal) {
      return envCallback;
    }
  }
  return `${frontendOrigin}/api/auth/google/callback`;
}

export async function upsertGoogleStreamer(profile: {
  email: string;
  name?: string;
  picture?: string;
}) {
  const email = profile.email.trim().toLowerCase();
  const name = (profile.name || email.split('@')[0] || 'Streamer').trim();
  const avatarUrl = profile.picture || '';

  let streamer = db.prepare('SELECT * FROM streamers WHERE LOWER(email) = LOWER(?)').get(email) as any;

  if (!streamer) {
    const id = uuidv4();
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'streamer';
    let username = baseUsername;
    const existingUsername = db.prepare('SELECT id FROM streamers WHERE LOWER(username) = LOWER(?)').get(username);
    if (existingUsername) {
      username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;
    }

    const overlayToken = 'ovl_' + uuidv4().replace(/-/g, '').slice(0, 24);
    const pairingCode = 'NEON-' + Math.floor(1000 + Math.random() * 9000);
    const resolvedAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    db.prepare(`
      INSERT INTO streamers (id, email, username, display_name, avatar_url, overlay_token, telegram_pairing_code, plan)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'free')
    `).run(id, email, username, name, resolvedAvatar, overlayToken, pairingCode);

    db.prepare(`
      INSERT INTO alert_settings (streamer_id, glow_color, sound_url)
      VALUES (?, '#00F0FF', '/sounds/neon-chime.mp3')
    `).run(id);

    db.prepare(`
      INSERT INTO payment_settings (streamer_id, bakong_account_id, bakong_account_name)
      VALUES (?, ?, ?)
    `).run(id, `${username}@abaa`, name.toUpperCase());

    streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(id) as any;
  } else if (avatarUrl && streamer.avatar_url !== avatarUrl) {
    db.prepare('UPDATE streamers SET avatar_url = ? WHERE id = ?').run(avatarUrl, streamer.id);
    streamer.avatar_url = avatarUrl;
  }

  // Sync authenticated Google user to MongoDB Atlas
  try {
    const usersCol = await getUsersCollection();
    await usersCol.updateOne(
      { userId: streamer.id },
      {
        $set: {
          username: streamer.username,
          displayName: streamer.display_name,
          email: streamer.email,
          avatarUrl: streamer.avatar_url,
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId: streamer.id,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    const overlaysCol = await getOverlaysCollection();
    const existingOverlay = await overlaysCol.findOne({ userId: streamer.id });
    if (!existingOverlay && streamer.overlay_token) {
      await overlaysCol.insertOne({
        userId: streamer.id,
        name: 'Default Neon Alert Overlay',
        overlayToken: streamer.overlay_token,
        mediaUrl: 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
        soundUrl: '/sounds/neon-chime.mp3',
        soundVolume: 0.85,
        glowColor: '#00F0FF',
        templateStyle: 'neon-box',
        durationSeconds: 8,
        minAmountAlert: 1.0,
        ttsEnabled: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (mongoErr) {
    console.warn('[Auth] Non-fatal MongoDB user sync warning:', mongoErr);
  }

  return streamer;
}

/**
 * GET /api/auth/google
 * Initiates the full Google OAuth 2.0 Authorization Code flow by redirecting to Google's consent screen.
 */
export async function GET(req: NextRequest) {
  const frontendOrigin = resolveFrontendOrigin(req);
  const redirectUri = resolveRedirectUri(frontendOrigin);
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();

  // Optional status check endpoint (?config=1)
  if (req.nextUrl.searchParams.get('config') === '1') {
    return NextResponse.json({
      configured: isGoogleOAuthConfigured(),
      redirectUri
    });
  }

  if (!isGoogleOAuthConfigured()) {
    const errorMsg = 'Google OAuth is not configured yet. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.';
    return NextResponse.redirect(`${frontendOrigin}/login?error=${encodeURIComponent(errorMsg)}`, 302);
  }

  const statePayload = Buffer.from(
    JSON.stringify({
      origin: frontendOrigin,
      redirectUri
    })
  ).toString('base64url');

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('state', statePayload);

  return NextResponse.redirect(googleAuthUrl.toString(), 302);
}

/**
 * POST /api/auth/google
 * Verifies a real Google OAuth authorization code or signed Google ID token (credential).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credential, code } = body;

    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        { error: 'Google OAuth is not configured on the server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.' },
        { status: 500 }
      );
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    const frontendOrigin = resolveFrontendOrigin(req);
    const redirectUri = resolveRedirectUri(frontendOrigin);

    let email = '';
    let name = '';
    let avatarUrl = '';

    if (code) {
      // Exchange authorization code with Google OAuth2 token endpoint
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }).toString()
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return NextResponse.json(
          { error: tokenData.error_description || tokenData.error || 'Failed to exchange Google authorization code' },
          { status: 401 }
        );
      }

      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userRes.json();
      if (!userRes.ok || !userData.email) {
        return NextResponse.json({ error: 'Failed to retrieve user profile from Google' }, { status: 401 });
      }

      email = userData.email;
      name = userData.name || userData.given_name || 'Streamer';
      avatarUrl = userData.picture || '';
    } else if (credential) {
      // Verify Google ID token with Google's tokeninfo endpoint
      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      const tokenInfo = await verifyRes.json();

      if (!verifyRes.ok || !tokenInfo.email) {
        return NextResponse.json({ error: 'Invalid or expired Google ID token' }, { status: 401 });
      }

      if (tokenInfo.aud !== clientId) {
        return NextResponse.json({ error: 'Google token audience mismatch' }, { status: 401 });
      }

      email = tokenInfo.email;
      name = tokenInfo.name || tokenInfo.given_name || 'Streamer';
      avatarUrl = tokenInfo.picture || '';
    } else {
      return NextResponse.json({ error: 'Google authorization code or credential is required' }, { status: 400 });
    }

    const streamer = await upsertGoogleStreamer({ email, name, picture: avatarUrl });
    const token = generateToken(streamer);

    return NextResponse.json({
      token,
      user: {
        id: streamer.id,
        username: streamer.username,
        displayName: streamer.display_name,
        email: streamer.email,
        avatarUrl: streamer.avatar_url,
        plan: streamer.plan || 'free',
        overlayToken: streamer.overlay_token,
        telegramPairingCode: streamer.telegram_pairing_code
      }
    });
  } catch (err: any) {
    console.error('[Auth] Google login error:', err);
    return NextResponse.json({ error: err.message || 'Google authentication failed' }, { status: 500 });
  }
}
