import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const rawUsername = params.username || '';
    const cleanUsername = decodeURIComponent(rawUsername).replace(/^@/, '').toLowerCase();

    const streamer = db.prepare('SELECT id FROM streamers WHERE LOWER(username) = ?').get(cleanUsername) as any;
    if (!streamer) {
      return NextResponse.json([]);
    }

    const donations = db.prepare(`
      SELECT id, donor_name, donor_message, amount, currency, banking_name, video_url, video_title, created_at, paid_at
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID'
      ORDER BY paid_at DESC, created_at DESC
      LIMIT 8
    `).all(streamer.id);

    return NextResponse.json(donations);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
