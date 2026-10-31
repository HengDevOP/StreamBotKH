import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getUsersCollection, getSupportTicketsCollection, getTicketMessagesCollection } from '@/server/database/mongo';
import { broadcastTicketStatusChanged } from '@/server/services/socketService';

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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messagesCol = await getTicketMessagesCollection();
    const messageRows = await messagesCol.find({ ticketId }).sort({ createdAt: 1 }).toArray();

    const messages = messageRows.map((m: any) => ({
      id: m.id,
      ticketId: m.ticketId || m.ticket_id,
      senderId: m.senderId || m.sender_id,
      senderName: m.senderName || m.sender_name,
      senderRole: m.senderRole || m.sender_role,
      senderAvatar: m.senderAvatar || m.sender_avatar,
      message: m.message,
      createdAt: m.createdAt || m.created_at
    }));

    const ticket = {
      id: ticketRow.id,
      ticketNumber: ticketRow.ticketNumber || ticketRow.ticket_number,
      streamerId: ticketStreamerId,
      streamerUsername: ticketRow.streamerUsername || ticketRow.streamer_username,
      streamerDisplayName: ticketRow.streamerDisplayName || ticketRow.streamer_display_name,
      streamerEmail: ticketRow.streamerEmail || ticketRow.streamer_email,
      streamerAvatar: ticketRow.streamerAvatar || ticketRow.streamer_avatar,
      title: ticketRow.title,
      category: ticketRow.category || 'general',
      priority: ticketRow.priority || 'medium',
      status: ticketRow.status || 'open',
      claimedById: ticketRow.claimedById || ticketRow.claimed_by_id || null,
      claimedByName: ticketRow.claimedByName || ticketRow.claimed_by_name || null,
      claimedByAvatar: ticketRow.claimedByAvatar || ticketRow.claimed_by_avatar || null,
      claimedAt: ticketRow.claimedAt || ticketRow.claimed_at || null,
      lastMessage: ticketRow.lastMessage || ticketRow.last_message || '',
      lastMessageAt: ticketRow.lastMessageAt || ticketRow.last_message_at || ticketRow.createdAt,
      createdAt: ticketRow.createdAt || ticketRow.created_at,
      updatedAt: ticketRow.updatedAt || ticketRow.updated_at
    };

    return NextResponse.json({ ticket, messages, isAdmin: caller.isAdmin });
  } catch (err: any) {
    console.error('[Ticket GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to retrieve ticket details' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const newStatus = body.status ? String(body.status).toLowerCase() : ticketRow.status;
    const newPriority = body.priority ? String(body.priority).toLowerCase() : ticketRow.priority;
    const now = new Date().toISOString();

    await ticketsCol.updateOne(
      { id: ticketId },
      { $set: { status: newStatus, priority: newPriority, updatedAt: now } }
    );

    // If status changed to resolved or closed, add system notice
    if (newStatus !== ticketRow.status) {
      const msgId = 'msg_sys_' + Date.now();
      const statusNotice = newStatus === 'resolved'
        ? `Ticket marked as Resolved by ${caller.displayName}.`
        : newStatus === 'closed'
        ? `Ticket closed by ${caller.displayName}.`
        : `Ticket status updated to ${newStatus.toUpperCase()} by ${caller.displayName}.`;

      const messagesCol = await getTicketMessagesCollection();
      await messagesCol.insertOne({
        id: msgId,
        ticketId,
        senderId: 'system',
        senderName: 'System',
        senderRole: 'system',
        senderAvatar: '',
        message: statusNotice,
        createdAt: now
      });
    }

    broadcastTicketStatusChanged(ticketId, { status: newStatus, priority: newPriority, updatedAt: now });

    const updated = await ticketsCol.findOne({ id: ticketId });
    return NextResponse.json({ success: true, ticket: updated });
  } catch (err: any) {
    console.error('[Ticket PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update ticket' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messagesCol = await getTicketMessagesCollection();
    await messagesCol.deleteMany({ ticketId });
    await ticketsCol.deleteOne({ id: ticketId });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Ticket DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete ticket' }, { status: 500 });
  }
}
