import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getSupportTicketsCollection,
  getTicketMessagesCollection,
  TicketAttachmentDoc
} from '@/server/database/mongo';
import { broadcastTicketMessage } from '@/server/services/socketService';
import { getTicketCaller } from '@/server/services/ticketAuth';

const ALLOWED_KINDS = new Set(['file', 'image', 'video', 'voice', 'link']);

function sanitizeAttachments(rawList: unknown): TicketAttachmentDoc[] {
  if (!Array.isArray(rawList)) return [];

  const result: TicketAttachmentDoc[] = [];
  for (const item of rawList.slice(0, 6)) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, any>;
    const kind = String(raw.kind || '').trim().toLowerCase();
    if (!ALLOWED_KINDS.has(kind)) continue;

    const rawUrl = String(raw.url || '').trim();
    if (!rawUrl || rawUrl.length > 2048) continue;

    // Validate safe URL: uploaded local path under /uploads/tickets/ or strict http(s) URL
    let safeUrl = '';
    if (kind !== 'link' && rawUrl.startsWith('/uploads/tickets/')) {
      safeUrl = rawUrl;
    } else {
      try {
        const parsed = new URL(rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          safeUrl = parsed.toString();
        }
      } catch {
        continue;
      }
    }

    if (!safeUrl) continue;

    const rawName = String(raw.name || safeUrl).trim().slice(0, 160) || 'Attachment';
    const size = typeof raw.size === 'number' && Number.isFinite(raw.size) && raw.size > 0 ? Math.round(raw.size) : undefined;
    const durationSec =
      typeof raw.durationSec === 'number' && Number.isFinite(raw.durationSec) && raw.durationSec > 0
        ? Math.round(raw.durationSec)
        : undefined;
    const mimeType = raw.mimeType ? String(raw.mimeType).trim().slice(0, 80) : undefined;
    const waveform = Array.isArray(raw.waveform)
      ? raw.waveform
          .slice(0, 48)
          .map((n: any) => Number(n))
          .filter((n: number) => Number.isFinite(n))
          .map((n: number) => Math.round(Math.min(1, Math.max(0.1, n)) * 100) / 100)
      : undefined;

    result.push({
      id: String(raw.id || 'att_' + uuidv4().replace(/-/g, '').slice(0, 12)),
      kind: kind as TicketAttachmentDoc['kind'],
      name: rawName,
      url: safeUrl,
      ...(mimeType ? { mimeType } : {}),
      ...(size !== undefined ? { size } : {}),
      ...(durationSec !== undefined ? { durationSec } : {}),
      ...(waveform && waveform.length > 0 ? { waveform } : {})
    });
  }

  return result;
}

function buildLastMessagePreview(text: string, attachments: TicketAttachmentDoc[]): string {
  if (text) return text.slice(0, 160);
  if (attachments.length === 0) return '';
  const first = attachments[0];
  if (first.kind === 'voice') return '🎤 Voice message';
  if (first.kind === 'image') return `🖼️ ${first.name}`.slice(0, 160);
  if (first.kind === 'video') return `🎬 ${first.name}`.slice(0, 160);
  if (first.kind === 'link') return `🔗 ${first.name}`.slice(0, 160);
  return `📎 ${first.name}`.slice(0, 160);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ error: 'Access denied: not authorized to message this ticket' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.message || '').trim();
    const attachments = sanitizeAttachments(body.attachments);

    if (!text && attachments.length === 0) {
      return NextResponse.json({ error: 'Message or attachment is required' }, { status: 400 });
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
      ...(attachments.length > 0 ? { attachments } : {}),
      createdAt: now
    });

    let newStatus = ticketRow.status;
    if (newStatus === 'resolved' || newStatus === 'closed') {
      newStatus = caller.isAdmin ? 'claimed' : 'open';
    }

    const preview = buildLastMessagePreview(text, attachments);

    await ticketsCol.updateOne(
      { id: ticketId },
      {
        $set: {
          lastMessage: preview,
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
      ...(attachments.length > 0 ? { attachments } : {}),
      createdAt: now
    };

    broadcastTicketMessage(ticketId, messagePayload, ticketStreamerId);

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
