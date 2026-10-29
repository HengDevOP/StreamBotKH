import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { db } from './database/db';

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
    const jwtSecret = process.env.JWT_SECRET || 'streamneon_super_secret_jwt_key_2026';
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded || !decoded.id) {
      return null;
    }

    let user = db.prepare('SELECT id, username, email, display_name FROM streamers WHERE id = ?').get(decoded.id) as any;
    if (!user && decoded.email) {
      user = db.prepare('SELECT id, username, email, display_name FROM streamers WHERE LOWER(email) = LOWER(?)').get(decoded.email) as any;
    }

    // Resilient fallback: If user row temporarily missing in local SQLite cache, preserve identity from verified JWT
    if (!user && decoded.id) {
      return {
        id: decoded.id,
        username: decoded.username || 'streamer',
        email: decoded.email || '',
        display_name: decoded.username || 'Streamer'
      };
    }

    return user || null;
  } catch (err) {
    return null;
  }
}
