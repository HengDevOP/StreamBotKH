import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentStreamer = db.prepare('SELECT overlay_token FROM streamers WHERE id = ?').get(user.id) as any;
    const oldToken = currentStreamer?.overlay_token;

    const newToken = 'ovl_' + uuidv4().replace(/-/g, '').slice(0, 24);

    // Save old and new tokens to history so existing OBS Studio browser source URLs never break
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS overlay_token_history (
          token TEXT PRIMARY KEY,
          streamer_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      if (oldToken) {
        db.prepare('INSERT OR IGNORE INTO overlay_token_history (token, streamer_id) VALUES (?, ?)').run(oldToken, user.id);
      }
      db.prepare('INSERT OR IGNORE INTO overlay_token_history (token, streamer_id) VALUES (?, ?)').run(newToken, user.id);
    } catch (e) {}

    db.prepare('UPDATE streamers SET overlay_token = ? WHERE id = ?').run(newToken, user.id);

    return NextResponse.json({ success: true, overlayToken: newToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
