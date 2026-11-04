import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getUsersCollection } from './database/mongo';

let cachedEphemeralSecret: string | null = null;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isDefaultOrInsecure =
    !secret ||
    secret === 'streamneon_super_secret_jwt_key_2026' ||
    secret === 'your_jwt_secret_here';

  if (process.env.NODE_ENV === 'production' && isDefaultOrInsecure) {
    throw new Error(
      '[CRITICAL SECURITY ERROR] Insecure or default JWT_SECRET is not permitted in production. Please set a strong JWT_SECRET in .env.'
    );
  }

  if (isDefaultOrInsecure) {
    if (!cachedEphemeralSecret) {
      cachedEphemeralSecret = crypto.randomBytes(32).toString('hex');
      console.warn(
        '⚠️ [Security Warning] Using generated ephemeral JWT secret because no strong JWT_SECRET was configured in .env.'
      );
    }
    return cachedEphemeralSecret;
  }

  return secret;
}

export function generateToken(user: { id: string; username: string; email: string }) {
  const jwtSecret = getJwtSecret();
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    jwtSecret,
    { expiresIn: '30d' }
  );
}

export function getAuthenticatedUser(req: NextRequest) {
  let token: string | null = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    token = req.cookies.get('streamneon_auth_token')?.value || req.cookies.get('token')?.value || null;
    if (!token) {
      token = req.nextUrl?.searchParams?.get('token') || null;
    }
  }

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded || !decoded.id) {
      return null;
    }

    return {
      id: decoded.id,
      userId: decoded.id,
      username: decoded.username || 'streamer',
      email: decoded.email || '',
      display_name: decoded.displayName || decoded.display_name || decoded.username || 'Streamer',
      displayName: decoded.displayName || decoded.display_name || decoded.username || 'Streamer'
    };
  } catch (err) {
    return null;
  }
}

export async function getAuthenticatedUserAsync(req: NextRequest) {
  const syncUser = getAuthenticatedUser(req);
  if (!syncUser) return null;

  try {
    const usersCol = await getUsersCollection();
    const dbUser = await usersCol.findOne({
      $or: [
        { userId: syncUser.id },
        ...(syncUser.email ? [{ email: syncUser.email }] : [])
      ]
    });

    if (dbUser) {
      return {
        id: dbUser.userId,
        userId: dbUser.userId,
        username: dbUser.username,
        email: dbUser.email || '',
        display_name: dbUser.displayName || dbUser.username,
        displayName: dbUser.displayName || dbUser.username,
        plan: dbUser.plan,
        is_verified: dbUser.isVerified ? 1 : 0,
        avatar_url: dbUser.avatarUrl,
        custom_thanks_message: dbUser.customThanksMessage
      };
    }
  } catch (e) {}

  return syncUser;
}
