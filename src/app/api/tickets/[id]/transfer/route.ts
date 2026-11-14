import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { isAdminEmail } from '@/server/database/db';
import {
  getUsersCollection,
  getSupportTicketsCollection,
  getTicketMessagesCollection
} from '@/server/database/mongo';
import { getTicketCaller, isUserAdminRecord } from '@/server/services/ticketAuth';
import { broadcastTicketClaimed } from '@/server/services/socketService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const caller = await getTicketCaller(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Strict admin-only authorization check
    if (!caller.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can transfer support tickets' },
        { status: 403 }
      );
    }

    const ticketId = params.id;
    const ticketsCol = await getSupportTicketsCollection();
    const ticketRow = (await ticketsCol.findOne({ id: ticketId })) as any;
    if (!ticketRow) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const targetAdminId = String(body.targetAdminId || '').trim();
    const targetEmail = String(body.targetEmail || '').trim().toLowerCase();
    const targetUsername = String(body.targetUsername || '').trim().replace(/^@+/, '').toLowerCase();
    const transferNote = String(body.note || '').trim();

    if (!targetAdminId && !targetEmail && !targetUsername) {
      return NextResponse.json(
        { error: 'Please select or specify a target administrator to transfer this ticket to.' },
        { status: 400 }
      );
    }

    const usersCol = await getUsersCollection();
    let targetUser: any = null;
    if (targetAdminId) {
      targetUser = await usersCol.findOne({ $or: [{ userId: targetAdminId }, { id: targetAdminId }] });
    } else if (targetEmail) {
      const escaped = targetEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      targetUser = await usersCol.findOne({ email: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    } else if (targetUsername) {
      const escaped = targetUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      targetUser = await usersCol.findOne({ username: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Target support administrator not found' }, { status: 404 });
    }

    if (!isUserAdminRecord(targetUser, targetUser.email) && !isAdminEmail(targetUser.email)) {
      return NextResponse.json(
        { error: 'Forbidden: Tickets can only be transferred to administrator / support agent accounts.' },
        { status: 400 }
      );
    }

    const resolvedTargetId = targetUser.userId || targetUser.id;
    const resolvedTargetName = targetUser.displayName || targetUser.username || 'Support Admin';
    const resolvedTargetAvatar = targetUser.avatarUrl || '';
    const previousAgentName = ticketRow.claimedByName || ticketRow.claimed_by_name || 'Open Queue';

    const now = new Date().toISOString();
    const msgId = 'msg_' + uuidv4().replace(/-/g, '').slice(0, 16);

    await ticketsCol.updateOne(
      { id: ticketId },
      {
        $set: {
          status: 'claimed',
          claimedById: resolvedTargetId,
          claimedByName: resolvedTargetName,
          claimedByAvatar: resolvedTargetAvatar,
          claimedAt: now,
          transferredFromId: ticketRow.claimedById || caller.id,
          transferredFromName: previousAgentName,
          transferredById: caller.id,
          transferredByName: caller.displayName,
          updatedAt: now
        }
      }
    );

    const transferText = transferNote
      ? `Ticket transferred from ${previousAgentName} to ${resolvedTargetName} by ${caller.displayName}. Note: ${transferNote}`
      : `Ticket transferred from ${previousAgentName} to ${resolvedTargetName} by ${caller.displayName}.`;

    const messagesCol = await getTicketMessagesCollection();
    const systemMessage = {
      id: msgId,
      ticketId,
      senderId: caller.id,
      senderName: caller.displayName,
      senderRole: 'system' as const,
      senderAvatar: caller.avatarUrl,
      message: transferText,
      createdAt: now
    };
    await messagesCol.insertOne({ ...systemMessage });

    broadcastTicketClaimed(
      ticketId,
      {
        status: 'claimed',
        claimedById: resolvedTargetId,
        claimedByName: resolvedTargetName,
        claimedByAvatar: resolvedTargetAvatar,
        claimedAt: now,
        transferredFromName: previousAgentName,
        systemMessage
      },
      ticketRow.streamerId || ticketRow.streamer_id
    );

    return NextResponse.json({
      success: true,
      action: 'transferred',
      claimedBy: {
        id: resolvedTargetId,
        name: resolvedTargetName,
        avatar: resolvedTargetAvatar,
        claimedAt: now
      },
      message: transferText
    });
  } catch (err: any) {
    console.error('[Ticket Transfer POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to transfer support ticket' }, { status: 500 });
  }
}
