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
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host || 'localhost:5173';

  // In dev mode, if Express is hit on :5001 directly, prefer :5173 for frontend redirect
  if (host.includes('127.0.0.1:5001') || host.includes('localhost:5001')) {
    return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
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

  // 1. Primary lookup: Check MongoDB Atlas users collection by verified Google email
  let existingMongoUser: any = null;
  try {
    const usersCol = await getUsersCollection();
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = await usersCol.find({
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') }
    }).toArray();

    if (matches.length > 0) {
      existingMongoUser = matches[0];
      // If multiple accounts were created by past transient UUID generations, pick the one with media or custom username
      if (matches.length > 1) {
        try {
          const { getMediaCollection } = await import('@/server/database/mongo');
          const mediaCol = await getMediaCollection();
          for (const m of matches) {
            const count = await mediaCol.countDocuments({ userId: m.userId });
            if (count > 0 || (m.username && !m.username.startsWith('streamer_'))) {
              existingMongoUser = m;
              break;
            }
          }
          // Consolidate any duplicate userId records to the primary userId
          for (const other of matches) {
            if (other.userId !== existingMongoUser.userId) {
              await mediaCol.updateMany({ userId: other.userId }, { $set: { userId: existingMongoUser.userId, userEmail: email } });
              const overlaysCol = await getOverlaysCollection();
              await overlaysCol.updateMany({ userId: other.userId }, { $set: { userId: existingMongoUser.userId } });
            }
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('[Auth] Mongo lookup warning in upsertGoogleStreamer:', err);
  }

  // 2. Secondary lookup: Check local SQLite database by email
  let sqliteStreamer = db.prepare('SELECT * FROM streamers WHERE LOWER(email) = LOWER(?)').get(email) as any;

  let streamerId = '';
  let streamerUsername = '';
  let displayName = name;
  let bio = '';
  let customThanks = '';
  let isVerified = 0;
  let plan = 'free';
  let overlayToken = '';
  let pairingCode = '';
  let socialLinks = '[]';

  if (existingMongoUser) {
    // Preserve permanent Google user ID and customized username
    streamerId = existingMongoUser.userId;
    streamerUsername = existingMongoUser.username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'streamer';
    displayName = existingMongoUser.displayName || name;
    bio = existingMongoUser.bio || '';
    customThanks = existingMongoUser.customThanksMessage || '';
    isVerified = existingMongoUser.isVerified ? 1 : 0;
    plan = existingMongoUser.plan || 'free';
    socialLinks = JSON.stringify(existingMongoUser.socialLinks || []);
  } else if (sqliteStreamer) {
    // Found in SQLite
    streamerId = sqliteStreamer.id;
    streamerUsername = sqliteStreamer.username;
    displayName = sqliteStreamer.display_name || name;
    bio = sqliteStreamer.bio || '';
    customThanks = sqliteStreamer.custom_thanks_message || '';
    isVerified = sqliteStreamer.is_verified || 0;
    plan = sqliteStreamer.plan || 'free';
    socialLinks = sqliteStreamer.social_links || '[]';
  } else {
    // Brand new user: anchor to Google account with a persistent ID
    streamerId = 'streamer_' + uuidv4().replace(/-/g, '').slice(0, 16);
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'streamer';
    streamerUsername = baseUsername;

    const existingSqlite = db.prepare('SELECT id FROM streamers WHERE LOWER(username) = LOWER(?)').get(streamerUsername);
    let existingMongo: any = null;
    try {
      const usersCol = await getUsersCollection();
      existingMongo = await usersCol.findOne({ username: { $regex: new RegExp(`^${streamerUsername}$`, 'i') } });
    } catch (e) {}

    if (existingSqlite || existingMongo) {
      streamerUsername = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;
    }
  }

  // Preserve tokens
  overlayToken = sqliteStreamer?.overlay_token || 'ovl_' + uuidv4().replace(/-/g, '').slice(0, 24);
  pairingCode = sqliteStreamer?.telegram_pairing_code || ('NEON-' + Math.floor(1000 + Math.random() * 9000));
  const resolvedAvatar = avatarUrl || sqliteStreamer?.avatar_url || existingMongoUser?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${streamerUsername}`;

  // 3. Upsert into SQLite streamers table
  db.prepare(`
    INSERT INTO streamers (
      id, email, username, display_name, avatar_url, bio, custom_thanks_message,
      is_verified, plan, overlay_token, telegram_pairing_code, social_links
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      username = excluded.username,
      display_name = excluded.display_name,
      avatar_url = COALESCE(excluded.avatar_url, streamers.avatar_url),
      bio = COALESCE(excluded.bio, streamers.bio),
      plan = COALESCE(excluded.plan, streamers.plan)
  `).run(
    streamerId,
    email,
    streamerUsername,
    displayName,
    resolvedAvatar,
    bio,
    customThanks,
    isVerified,
    plan,
    overlayToken,
    pairingCode,
    socialLinks
  );

  // Ensure default alert & payment settings in SQLite
  try {
    const existingAlert = db.prepare('SELECT streamer_id FROM alert_settings WHERE streamer_id = ?').get(streamerId);
    if (!existingAlert) {
      db.prepare(`
        INSERT INTO alert_settings (streamer_id, glow_color, sound_url)
        VALUES (?, '#00F0FF', '/sounds/neon-chime.mp3')
      `).run(streamerId);
    }
  } catch (e) {}

  try {
    const existingPay = db.prepare('SELECT streamer_id FROM payment_settings WHERE streamer_id = ?').get(streamerId);
    if (!existingPay) {
      db.prepare(`
        INSERT INTO payment_settings (streamer_id, bakong_account_id, bakong_account_name)
        VALUES (?, ?, ?)
      `).run(streamerId, `${streamerUsername}@abaa`, displayName.toUpperCase());
    }
  } catch (e) {}

  let streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(streamerId) as any;

  // 4. Synchronize user and assets to MongoDB Atlas
  try {
    const usersCol = await getUsersCollection();
    await usersCol.updateOne(
      { userId: streamerId },
      {
        $set: {
          username: streamerUsername,
          displayName,
          email,
          avatarUrl: resolvedAvatar,
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId: streamerId,
          bio,
          customThanksMessage: customThanks,
          isVerified: isVerified === 1,
          plan,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    const overlaysCol = await getOverlaysCollection();
    const existingOverlay = await overlaysCol.findOne({ userId: streamerId });
    if (!existingOverlay && overlayToken) {
      await overlaysCol.insertOne({
        userId: streamerId,
        name: 'Default Neon Alert Overlay',
        overlayToken,
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

    // Auto-rescue any media files uploaded under this Google email
    try {
      const { getMediaCollection } = await import('@/server/database/mongo');
      const mediaCol = await getMediaCollection();
      await mediaCol.updateMany(
        { userEmail: email, userId: { $ne: streamerId } },
        { $set: { userId: streamerId } }
      );
    } catch (e) {}
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
