import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getSupportTicketsCollection, getTicketMessagesCollection } from '@/server/database/mongo';
import { broadcastTicketStatusChanged, broadcastTicketDeleted } from '@/server/services/socketService';
import { getTicketCaller } from '@/server/services/ticketAuth';

const VALID_STATUSES = ['open', 'claimed', 'resolved', 'closed'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const caller = await getTicketCaller(req);
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
      message: m.message || '',
      ...(Array.isArray(m.attachments) && m.attachments.length > 0 ? { attachments: m.attachments } : {}),
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
    const caller = await getTicketCaller(req);
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
    const currentStatus = String(ticketRow.status || 'open').toLowerCase();
    const currentPriority = String(ticketRow.priority || 'medium').toLowerCase();

    const requestedStatus = body.status !== undefined ? String(body.status).trim().toLowerCase() : currentStatus;
    const requestedPriority = body.priority !== undefined ? String(body.priority).trim().toLowerCase() : currentPriority;

    if (!(VALID_STATUSES as readonly string[]).includes(requestedStatus)) {
      return NextResponse.json({ error: 'Invalid ticket status' }, { status: 400 });
    }
    if (!(VALID_PRIORITIES as readonly string[]).includes(requestedPriority)) {
      return NextResponse.json({ error: 'Invalid ticket priority' }, { status: 400 });
    }

    // Strict RBAC: Only administrators can modify ticket status or priority (including closing/resolving)
    if (!caller.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can modify ticket status or priority' },
        { status: 403 }
      );
    }

    const newStatus = requestedStatus as (typeof VALID_STATUSES)[number];
    const newPriority = requestedPriority as (typeof VALID_PRIORITIES)[number];
    const now = new Date().toISOString();

    await ticketsCol.updateOne(
      { id: ticketId },
      { $set: { status: newStatus, priority: newPriority, updatedAt: now } }
    );

    // If status changed, add system notice
    let systemMessage: any = null;
    if (newStatus !== currentStatus) {
      const msgId = 'msg_sys_' + Date.now();
      const statusNotice = newStatus === 'resolved'
        ? `Ticket marked as Resolved by ${caller.displayName}.`
        : newStatus === 'closed'
        ? `Ticket closed by ${caller.displayName}.`
        : `Ticket status updated to ${newStatus.toUpperCase()} by ${caller.displayName}.`;

      systemMessage = {
        id: msgId,
        ticketId,
        senderId: 'system',
        senderName: 'System',
        senderRole: 'system',
        senderAvatar: '',
        message: statusNotice,
        createdAt: now
      };

      const messagesCol = await getTicketMessagesCollection();
      await messagesCol.insertOne(systemMessage);
    }

    broadcastTicketStatusChanged(
      ticketId,
      { status: newStatus, priority: newPriority, updatedAt: now, systemMessage },
      ticketStreamerId
    );

    const updated = await ticketsCol.findOne({ id: ticketId });
    return NextResponse.json({ success: true, ticket: updated });
  } catch (err: any) {
    console.error('[Ticket PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update ticket' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const caller = await getTicketCaller(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!caller.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete support tickets' },
        { status: 403 }
      );
    }

    const ticketId = params.id;
    const ticketsCol = await getSupportTicketsCollection();
    const ticketRow = await ticketsCol.findOne({ id: ticketId }) as any;
    if (!ticketRow) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
    }

    const ticketStreamerId = ticketRow.streamerId || ticketRow.streamer_id;
    const messagesCol = await getTicketMessagesCollection();

    // Collect every uploaded attachment file path referenced by messages in this ticket before erasing rows
    const ticketMessages = await messagesCol
      .find({ $or: [{ ticketId }, { ticket_id: ticketId }] })
      .toArray();

    const uploadsTicketsRoot = path.resolve(process.cwd(), 'public', 'uploads', 'tickets');
    const attachmentPathsToErase = new Set<string>();
    for (const msg of ticketMessages as any[]) {
      if (!Array.isArray(msg.attachments)) continue;
      for (const att of msg.attachments) {
        const rawUrl = String(att?.url || '').trim();
        if (!rawUrl.startsWith('/uploads/tickets/')) continue;
        const resolved = path.resolve(process.cwd(), 'public', rawUrl.replace(/^\/+/, ''));
        if (resolved.startsWith(uploadsTicketsRoot + path.sep)) {
          attachmentPathsToErase.add(resolved);
        }
      }
    }

    // Erase all messages and the ticket document itself
    await messagesCol.deleteMany({ $or: [{ ticketId }, { ticket_id: ticketId }] });
    await ticketsCol.deleteMany({ id: ticketId });

    // Erase individual attachment files and the ticket upload folder on disk
    for (const filePath of attachmentPathsToErase) {
      await fs.rm(filePath, { force: true }).catch(() => {});
    }

    const safeTicketDir = ticketId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (safeTicketDir) {
      const ticketDirResolved = path.resolve(uploadsTicketsRoot, safeTicketDir);
      if (ticketDirResolved.startsWith(uploadsTicketsRoot + path.sep)) {
        await fs.rm(ticketDirResolved, { recursive: true, force: true }).catch(() => {});
      }
    }

    broadcastTicketDeleted(ticketId, ticketStreamerId);

    return NextResponse.json({ success: true, deletedTicketId: ticketId });
  } catch (err: any) {
    console.error('[Ticket DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete ticket' }, { status: 500 });
  }
}
