import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSupportTicketsCollection, getTicketMessagesCollection } from '@/server/database/mongo';
import { getTicketCaller } from '@/server/services/ticketAuth';
import { broadcastTicketClaimed, broadcastTicketStatusChanged } from '@/server/services/socketService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const caller = await getTicketCaller(req);
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

      broadcastTicketClaimed(
        ticketId,
        {
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
        },
        ticketRow.streamerId || ticketRow.streamer_id
      );

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
            updatedAt: now
          },
          $unset: {
            claimedById: '',
            claimedByName: '',
            claimedByAvatar: '',
            claimedAt: ''
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

      broadcastTicketStatusChanged(
        ticketId,
        {
          status: 'open',
          claimedById: null,
          claimedByName: null,
          claimedByAvatar: null,
          claimedAt: null
        },
        ticketRow.streamerId || ticketRow.streamer_id
      );

      return NextResponse.json({ success: true, action: 'unclaimed' });
    }
  } catch (err: any) {
    console.error('[Ticket Claim POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to process claim' }, { status: 500 });
  }
}
