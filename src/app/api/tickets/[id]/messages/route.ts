import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getUsersCollection, getSupportTicketsCollection, getTicketMessagesCollection } from '@/server/database/mongo';
import { broadcastTicketMessage } from '@/server/services/socketService';

async function getCallerWithRole(req: NextRequest) {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) return null;

  let row: any = null;
  try {
    const usersCol = await getUsersCollection();
    row = await usersCol.findOne({ userId: authUser.id });
  } catch (e) {}

  const email = row?.email || authUser.email || '';
  return {
    id: authUser.id,
    email,
    username: row?.username || authUser.username || 'streamer',
    displayName: row?.displayName || authUser.username || 'Streamer',
    avatarUrl: row?.avatarUrl || '',
    isAdmin: isAdminEmail(email)
  };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const caller = await getCallerWithRole(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = params.id;
    const ticketsCol = await getSupportTicketsCollection();
    const ticketRow = await ticketsCol.findOne({ id: ticketId }) as any;
    if (!ticketRow) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
    }

    const ticketStreamerId = ticketRow.streamerId || ticketRow.streamer_id;
    if (!caller.isAdmin && ticketStreamerId !== caller.id) {
      return NextResponse.json({ error: 'Access denied: not authorized to message this ticket' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.message || '').trim();
    if (!text) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const msgId = 'msg_' + uuidv4().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();
    const senderRole = caller.isAdmin ? 'admin' : 'user';

    const messagesCol = await getTicketMessagesCollection();
    await messagesCol.insertOne({
      id: msgId,
      ticketId,
      senderId: caller.id,
      senderName: caller.displayName,
      senderRole,
      senderAvatar: caller.avatarUrl,
      message: text,
      createdAt: now
    });

    let newStatus = ticketRow.status;
    if (newStatus === 'resolved' || newStatus === 'closed') {
      newStatus = caller.isAdmin ? 'claimed' : 'open';
    }

    await ticketsCol.updateOne(
      { id: ticketId },
      {
        $set: {
          lastMessage: text.slice(0, 160),
          lastMessageAt: now,
          status: newStatus,
          updatedAt: now
        }
      }
    );

    const messagePayload = {
      id: msgId,
      ticketId,
      senderId: caller.id,
      senderName: caller.displayName,
      senderRole,
      senderAvatar: caller.avatarUrl,
      message: text,
      createdAt: now
    };

    broadcastTicketMessage(ticketId, messagePayload);

    return NextResponse.json({
      success: true,
      message: messagePayload,
      ticketStatus: newStatus
    });
  } catch (err: any) {
    console.error('[Ticket Message POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}
