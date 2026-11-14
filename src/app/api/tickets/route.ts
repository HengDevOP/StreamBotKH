import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSupportTicketsCollection, getTicketMessagesCollection } from '@/server/database/mongo';
import { getOnlineAdminPresence } from '@/server/services/socketService';
import { getRecentHttpActiveAdminKeys, recordAdminHeartbeat } from '@/server/utils/rateLimiter';
import { getTicketCaller, getSupportAdminDirectory } from '@/server/services/ticketAuth';

export async function GET(req: NextRequest) {
  try {
    const caller = await getTicketCaller(req);
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
      if (st === 'open' && !t.claimedById && !(t as any).claimed_by_id) {
        summary.unclaimed++;
      }
    }

    if (caller.isAdmin) {
      recordAdminHeartbeat(caller.id, caller.email);
    }

    // Detect currently online Admin Support profiles (active Socket.IO admin session or recent HTTP activity within 60s)
    let activeSupports: Array<{
      id: string;
      username: string;
      displayName: string;
      email: string;
      avatarUrl: string;
      bio: string;
      isVerified: boolean;
      role: string;
      isOnline: boolean;
      lastActiveAt: string;
    }> = [];

    let availableAdmins: any[] = [];
    try {
      const socketPresence = getOnlineAdminPresence();
      const httpPresence = getRecentHttpActiveAdminKeys(60000);
      const adminDir = await getSupportAdminDirectory();

      for (const u of adminDir) {
        const emailLower = u.email.trim().toLowerCase();
        const isSocketOnline =
          (u.id && socketPresence.userIds.has(u.id)) ||
          (emailLower && socketPresence.emails.has(emailLower));
        const isHttpOnline =
          (u.id && httpPresence.userIds.has(u.id)) ||
          (emailLower && httpPresence.emails.has(emailLower));

        if (caller.isAdmin) {
          availableAdmins.push({
            ...u,
            isOnline: Boolean(isSocketOnline || isHttpOnline)
          });
        }

        if (isSocketOnline || isHttpOnline) {
          activeSupports.push({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            email: u.email,
            avatarUrl: u.avatarUrl,
            bio: u.bio,
            isVerified: true,
            role: u.role,
            isOnline: true,
            lastActiveAt: u.lastActiveAt || new Date().toISOString()
          });
        }
      }
    } catch {
      // Non-fatal if admin presence lookup fails
    }

    return NextResponse.json({
      tickets,
      summary,
      activeSupports,
      ...(caller.isAdmin ? { availableAdmins } : {}),
      isAdmin: caller.isAdmin
    });
  } catch (err: any) {
    console.error('[Tickets GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await getTicketCaller(req);
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
