import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { markMongoMailboxRead, getMailboxMessagesCollection } from '@/server/database/mongo';

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

    if (unread && messageId) {
      const col = await getMailboxMessagesCollection();
      await col.updateOne({ id: messageId }, { $set: { isRead: false, updatedAt: new Date() } });
    } else {
      await markMongoMailboxRead(streamerId, messageId, all);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Mailbox Read POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update read status' }, { status: 500 });
  }
}
