import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';
import { markMongoMailboxRead } from '@/server/database/mongo';

function getCallerId(req: NextRequest): string {
  const user = getAuthenticatedUser(req);
  if (user?.id) return user.id;
  const queryToken = req.nextUrl.searchParams.get('streamerId') || req.nextUrl.searchParams.get('userId');
  if (queryToken) return queryToken;
  return 'demo-streamer-id-1001';
}

export async function POST(req: NextRequest) {
  try {
    const streamerId = getCallerId(req);
    const body = await req.json().catch(() => ({}));
    const { messageId, all, unread } = body;

    // In MongoDB
    try {
      if (unread && messageId) {
        // Toggle back to unread
        const col = await (await import('@/server/database/mongo')).getMailboxMessagesCollection();
        await col.updateOne({ id: messageId }, { $set: { isRead: false, updatedAt: new Date() } });
      } else {
        await markMongoMailboxRead(streamerId, messageId, all);
      }
    } catch (e) {
      console.warn('[Mailbox Read] Mongo error:', e);
    }

    // In SQLite
    try {
      if (all) {
        db.prepare(
          `UPDATE mailbox_messages SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE streamer_id = ? OR streamer_id = 'all'`
        ).run(streamerId);
      } else if (messageId) {
        db.prepare(
          `UPDATE mailbox_messages SET is_read = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).run(unread ? 0 : 1, messageId);
      }
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Mailbox Read POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update read status' }, { status: 500 });
  }
}
