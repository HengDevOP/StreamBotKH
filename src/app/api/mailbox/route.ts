import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import {
  getMongoMailboxMessages,
  addMongoMailboxMessage,
  deleteMongoMailboxMessage
} from '@/server/database/mongo';

function getCallerId(req: NextRequest): string {
  const user = getAuthenticatedUser(req);
  if (user?.id) return user.id;

  const queryToken = req.nextUrl.searchParams.get('streamerId') || req.nextUrl.searchParams.get('userId');
  if (queryToken) return queryToken;

  return 'demo-streamer-id-1001';
}

export async function GET(req: NextRequest) {
  try {
    const streamerId = getCallerId(req);

    const messages = await getMongoMailboxMessages(streamerId);
    const unreadCount = messages.filter((m: any) => !m.isRead).length;

    return NextResponse.json({
      messages,
      unreadCount,
      totalCount: messages.length
    });
  } catch (err: any) {
    console.error('[Mailbox GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch mailbox messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const streamerId = getCallerId(req);
    const body = await req.json().catch(() => ({}));
    const { title, content, senderName, category, actionUrl, actionLabel, priority, targetStreamerId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Message title and content are required' }, { status: 400 });
    }

    const destStreamerId = targetStreamerId || streamerId;

    const createdMessage = await addMongoMailboxMessage({
      streamerId: destStreamerId,
      title,
      content,
      senderName: senderName || 'StreamBotKH System',
      category: category || 'system',
      actionUrl,
      actionLabel,
      priority: priority || 'normal'
    });

    return NextResponse.json({
      success: true,
      message: createdMessage
    });
  } catch (err: any) {
    console.error('[Mailbox POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create message' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const streamerId = getCallerId(req);
    const body = await req.json().catch(() => ({}));
    const queryMessageId = req.nextUrl.searchParams.get('messageId') || undefined;
    const queryAllRead = req.nextUrl.searchParams.get('allRead') === 'true';

    const messageId = body?.messageId || queryMessageId;
    const allRead = Boolean(body?.allRead || queryAllRead);

    await deleteMongoMailboxMessage(streamerId, messageId, allRead);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Mailbox DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete message' }, { status: 500 });
  }
}
