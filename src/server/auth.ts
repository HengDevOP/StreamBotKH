import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { ENV } from './config/env';
import { db } from './database/db';

export function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    const user = db.prepare('SELECT id, username, email, display_name FROM streamers WHERE id = ?').get(decoded.id) as any;
    return user || null;
  } catch (err) {
    return null;
  }
}
