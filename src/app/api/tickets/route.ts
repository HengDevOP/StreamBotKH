import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getUsersCollection, getSupportTicketsCollection, getTicketMessagesCollection } from '@/server/database/mongo';

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

export async function GET(req: NextRequest) {
  try {
    const caller = await getCallerWithRole(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = req.nextUrl.searchParams.get('scope');
    const statusFilter = req.nextUrl.searchParams.get('status');
    const fetchAll = caller.isAdmin && scope !== 'mine';

    const ticketsCol = await getSupportTicketsCollection();

    const query: any = {};
    if (!fetchAll) {
      query.streamerId = caller.id;
    }
    if (statusFilter && statusFilter !== 'ALL') {
      query.status = statusFilter.toLowerCase();
    }

    const rows = await ticketsCol.find(query).sort({ lastMessageAt: -1, updatedAt: -1, createdAt: -1 }).toArray();

    const tickets = rows.map((r: any) => ({
      id: r.id,
      ticketNumber: r.ticketNumber || r.ticket_number,
      streamerId: r.streamerId || r.streamer_id,
      streamerUsername: r.streamerUsername || r.streamer_username,
      streamerDisplayName: r.streamerDisplayName || r.streamer_display_name,
      streamerEmail: r.streamerEmail || r.streamer_email,
      streamerAvatar: r.streamerAvatar || r.streamer_avatar,
      title: r.title,
      category: r.category || 'general',
      priority: r.priority || 'medium',
      status: r.status || 'open',
      claimedById: r.claimedById || r.claimed_by_id || null,
      claimedByName: r.claimedByName || r.claimed_by_name || null,
      claimedByAvatar: r.claimedByAvatar || r.claimed_by_avatar || null,
      claimedAt: r.claimedAt || r.claimed_at || null,
      lastMessage: r.lastMessage || r.last_message || '',
      lastMessageAt: r.lastMessageAt || r.last_message_at || r.createdAt || r.created_at,
      createdAt: r.createdAt || r.created_at,
      updatedAt: r.updatedAt || r.updated_at
    }));

    // Calculate summary statistics
    const statsQuery: any = fetchAll ? {} : { streamerId: caller.id };
    const allTickets = await ticketsCol.find(statsQuery).toArray();

    const summary: Record<string, number> = {
      total: allTickets.length,
      open: 0,
      claimed: 0,
      resolved: 0,
      closed: 0,
      unclaimed: 0
    };

    for (const t of allTickets) {
      const st = (t.status || 'open').toLowerCase();
      if (summary[st] !== undefined) {
        summary[st]++;
      }
      if (st === 'open' && (!t.claimedById && !t.claimed_by_id)) {
        summary.unclaimed++;
      }
    }

    return NextResponse.json({ tickets, summary, isAdmin: caller.isAdmin });
  } catch (err: any) {
    console.error('[Tickets GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await getCallerWithRole(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body.title || '').trim();
    const message = String(body.message || body.description || '').trim();
    const category = String(body.category || 'general').trim();
    const priority = String(body.priority || 'medium').trim();

    if (!title) {
      return NextResponse.json({ error: 'Ticket title/subject is required' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: 'Please include an initial message describing your issue' }, { status: 400 });
    }

    const id = 'TCK-' + Math.floor(1000 + Math.random() * 9000) + '-' + uuidv4().slice(0, 4).toUpperCase();
    const now = new Date().toISOString();
    const msgId = 'msg_' + uuidv4().replace(/-/g, '').slice(0, 16);

    const ticketsCol = await getSupportTicketsCollection();
    await ticketsCol.insertOne({
      id,
      streamerId: caller.id,
      streamerUsername: caller.username,
      streamerDisplayName: caller.displayName,
      streamerEmail: caller.email,
      streamerAvatar: caller.avatarUrl,
      title,
      category,
      priority,
      status: 'open',
      lastMessage: message.slice(0, 160),
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now
    });

    const messagesCol = await getTicketMessagesCollection();
    await messagesCol.insertOne({
      id: msgId,
      ticketId: id,
      senderId: caller.id,
      senderName: caller.displayName,
      senderRole: 'user',
      senderAvatar: caller.avatarUrl,
      message,
      createdAt: now
    });

    const createdTicket = {
      id,
      streamerId: caller.id,
      streamerUsername: caller.username,
      streamerDisplayName: caller.displayName,
      streamerEmail: caller.email,
      streamerAvatar: caller.avatarUrl,
      title,
      category,
      priority,
      status: 'open',
      claimedById: null,
      claimedByName: null,
      claimedByAvatar: null,
      claimedAt: null,
      lastMessage: message.slice(0, 160),
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now
    };

    return NextResponse.json({
      success: true,
      ticket: createdTicket,
      message: {
        id: msgId,
        ticketId: id,
        senderId: caller.id,
        senderName: caller.displayName,
        senderRole: 'user',
        senderAvatar: caller.avatarUrl,
        message,
        createdAt: now
      }
    });
  } catch (err: any) {
    console.error('[Tickets POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create support ticket' }, { status: 500 });
  }
}
