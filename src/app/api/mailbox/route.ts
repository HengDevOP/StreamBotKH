import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';
import {
  getMongoMailboxMessages,
  addMongoMailboxMessage,
  deleteMongoMailboxMessage,
  seedDefaultMailboxMessages
} from '@/server/database/mongo';

function getCallerId(req: NextRequest): string {
  const user = getAuthenticatedUser(req);
  if (user?.id) return user.id;

  // Fallback for session query param or default demo ID in development
  const queryToken = req.nextUrl.searchParams.get('streamerId') || req.nextUrl.searchParams.get('userId');
  if (queryToken) return queryToken;

  return 'demo-streamer-id-1001';
}

export async function GET(req: NextRequest) {
  try {
    const streamerId = getCallerId(req);

    // Auto-seed default starter messages if mailbox is fresh
    try {
      await seedDefaultMailboxMessages(streamerId);
    } catch (e) {
      // ignore seed error
    }

    // Primary: fetch from MongoDB
    let messages: any[] = [];
    try {
      messages = await getMongoMailboxMessages(streamerId);
    } catch (mongoErr) {
      console.warn('[Mailbox GET] MongoDB failed, falling back to SQLite:', mongoErr);
    }

    // Fallback: fetch from SQLite if MongoDB returned empty
    if (!messages || messages.length === 0) {
      try {
        const rows = db
          .prepare(
            `SELECT * FROM mailbox_messages 
             WHERE streamer_id = ? OR streamer_id = 'all' 
             ORDER BY datetime(created_at) DESC 
             LIMIT 100`
          )
          .all(streamerId) as any[];

        messages = rows.map((r) => ({
          id: r.id,
          streamerId: r.streamer_id,
          title: r.title,
          senderName: r.sender_name || 'StreamBotKH System',
          senderAvatar: r.sender_avatar || '',
          category: r.category || 'system',
          content: r.content,
          preview: r.preview || (r.content ? r.content.slice(0, 100) : ''),
          isRead: Boolean(r.is_read),
          actionUrl: r.action_url || '',
          actionLabel: r.action_label || '',
          priority: r.priority || 'normal',
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
      } catch (sqliteErr) {
        // safe fallback
      }
    }

    const unreadCount = messages.filter((m) => !m.isRead).length;

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

    let createdMessage: any = null;
    try {
      createdMessage = await addMongoMailboxMessage({
        streamerId: destStreamerId,
        title,
        content,
        senderName: senderName || 'StreamBotKH System',
        category: category || 'system',
        actionUrl,
        actionLabel,
        priority: priority || 'normal'
      });
    } catch (mongoErr) {
      console.warn('[Mailbox POST] MongoDB insert failed, trying SQLite:', mongoErr);
    }

    // Mirror to SQLite
    try {
      if (createdMessage) {
        db.prepare(
          `INSERT OR REPLACE INTO mailbox_messages (
            id, streamer_id, title, sender_name, category, content, preview, is_read, action_url, action_label, priority, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          createdMessage.id,
          createdMessage.streamerId,
          createdMessage.title,
          createdMessage.senderName,
          createdMessage.category,
          createdMessage.content,
          createdMessage.preview,
          0,
          createdMessage.actionUrl || null,
          createdMessage.actionLabel || null,
          createdMessage.priority,
          createdMessage.createdAt,
          createdMessage.updatedAt
        );
      }
    } catch (sqliteErr) {}

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
    const { messageId, allRead } = body;

    // Delete in MongoDB
    try {
      await deleteMongoMailboxMessage(streamerId, messageId, allRead);
    } catch (e) {
      console.warn('[Mailbox DELETE] Mongo error:', e);
    }

    // Mirror in SQLite
    try {
      if (allRead) {
        db.prepare(`DELETE FROM mailbox_messages WHERE (streamer_id = ? OR streamer_id = 'all') AND is_read = 1`).run(streamerId);
      } else if (messageId) {
        db.prepare(`DELETE FROM mailbox_messages WHERE id = ?`).run(messageId);
      }
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Mailbox DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete message' }, { status: 500 });
  }
}
