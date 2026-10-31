import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getUsersCollection, getSupportTicketsCollection, getTicketMessagesCollection } from '@/server/database/mongo';
import { broadcastTicketClaimed, broadcastTicketStatusChanged } from '@/server/services/socketService';

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

    if (!caller.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can claim support tickets' }, { status: 403 });
    }

    const ticketId = params.id;
    const ticketsCol = await getSupportTicketsCollection();
    const ticketRow = await ticketsCol.findOne({ id: ticketId }) as any;
    if (!ticketRow) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action === 'unclaim' ? 'unclaim' : 'claim';
    const now = new Date().toISOString();
    const msgId = 'msg_' + uuidv4().replace(/-/g, '').slice(0, 16);

    const messagesCol = await getTicketMessagesCollection();

    if (action === 'claim') {
      await ticketsCol.updateOne(
        { id: ticketId },
        {
          $set: {
            status: 'claimed',
            claimedById: caller.id,
            claimedByName: caller.displayName,
            claimedByAvatar: caller.avatarUrl,
            claimedAt: now,
            updatedAt: now
          }
        }
      );

      const claimText = `Support Agent ${caller.displayName} has claimed this ticket. Live chat is now active.`;
      await messagesCol.insertOne({
        id: msgId,
        ticketId,
        senderId: caller.id,
        senderName: caller.displayName,
        senderRole: 'system',
        senderAvatar: caller.avatarUrl,
        message: claimText,
        createdAt: now
      });

      broadcastTicketClaimed(ticketId, {
        status: 'claimed',
        claimedById: caller.id,
        claimedByName: caller.displayName,
        claimedByAvatar: caller.avatarUrl,
        claimedAt: now,
        systemMessage: {
          id: msgId,
          ticketId,
          senderId: caller.id,
          senderName: caller.displayName,
          senderRole: 'system',
          senderAvatar: caller.avatarUrl,
          message: claimText,
          createdAt: now
        }
      });

      return NextResponse.json({
        success: true,
        action: 'claimed',
        claimedBy: {
          id: caller.id,
          name: caller.displayName,
          avatar: caller.avatarUrl,
          claimedAt: now
        }
      });
    } else {
      await ticketsCol.updateOne(
        { id: ticketId },
        {
          $set: {
            status: 'open',
            claimedById: null,
            claimedByName: null,
            claimedByAvatar: null,
            claimedAt: null,
            updatedAt: now
          }
        }
      );

      const unclaimText = `Ticket was unassigned by ${caller.displayName} and returned to the open queue.`;
      await messagesCol.insertOne({
        id: msgId,
        ticketId,
        senderId: caller.id,
        senderName: caller.displayName,
        senderRole: 'system',
        senderAvatar: caller.avatarUrl,
        message: unclaimText,
        createdAt: now
      });

      broadcastTicketStatusChanged(ticketId, {
        status: 'open',
        claimedById: null,
        claimedByName: null,
        claimedByAvatar: null,
        claimedAt: null
      });

      return NextResponse.json({ success: true, action: 'unclaimed' });
    }
  } catch (err: any) {
    console.error('[Ticket Claim POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to process claim' }, { status: 500 });
  }
}
