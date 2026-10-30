import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { 
  getMongoMonitoredGroups, 
  addMongoMonitoredGroup, 
  deleteMongoMonitoredGroup 
} from '@/server/database/mongo';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId = authUser?.id || req.nextUrl.searchParams.get('streamerId') || req.nextUrl.searchParams.get('streamer_id') || 'demo-streamer-id-1001';

    const status = await telegramUserManager.getStatus(streamerId);
    if (!status.isConnected) {
      return NextResponse.json({
        success: true,
        groups: [],
        availableDialogs: []
      });
    }

    const mongoGroups = await getMongoMonitoredGroups(streamerId);
    const seenChatIds = new Set<string>();
    const groups: any[] = [];

    for (const g of mongoGroups || []) {
      const rawCid = String(g.chat_id || (g as any).chatId || '').trim();
      const norm = rawCid.replace(/^-100/, '').replace(/^-/, '');
      if (norm && !seenChatIds.has(norm)) {
        seenChatIds.add(norm);
        groups.push({
          id: g.id,
          streamer_id: g.streamer_id || streamerId,
          chat_id: rawCid,
          title: g.title,
          username: g.username,
          created_at: g.created_at || new Date().toISOString()
        });
      }
    }

    let availableDialogs: any[] = [];
    try {
      availableDialogs = await telegramUserManager.getAvailableDialogs(streamerId);
    } catch (e) {
      console.warn('[Telegram] Failed fetching dialogs:', e);
    }

    return NextResponse.json({
      success: true,
      groups,
      availableDialogs
    });
  } catch (err: any) {
    console.error('API /telegram/groups GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch monitored groups' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId = authUser?.id || 'demo-streamer-id-1001';

    const body = await req.json().catch(() => ({}));
    const { chatId, title, username } = body;

    if (!chatId || typeof chatId !== 'string' || !chatId.trim()) {
      return NextResponse.json(
        { error: 'Group link, Chat ID, or username is required.' },
        { status: 400 }
      );
    }

    let finalChatId = chatId.trim();
    let finalTitle = title ? String(title).trim() : '';
    let finalUsername = username ? String(username).trim() : undefined;

    try {
      const resolved = await telegramUserManager.resolveGroupEntity(streamerId, finalChatId);
      if (resolved) {
        finalChatId = resolved.id;
        if (!finalTitle && resolved.title) finalTitle = resolved.title;
        if (!finalUsername && resolved.username) finalUsername = resolved.username;
      }
    } catch (e) {}

    if (finalChatId.startsWith('http://') || finalChatId.startsWith('https://') || finalChatId.startsWith('t.me/')) {
      const cleanHandle = finalChatId.replace(/^https?:\/\/t\.me\//i, '').replace(/^t\.me\//i, '').replace(/^\+/, '');
      if (cleanHandle) {
        if (!finalUsername) finalUsername = `@${cleanHandle.replace(/^@/, '')}`;
        if (!finalTitle) finalTitle = `Telegram Group (${finalUsername})`;
      }
    }

    if (!finalTitle) {
      finalTitle = `Telegram Group (${finalChatId})`;
    }

    const targetGroupId = uuidv4();
    const group = await addMongoMonitoredGroup(streamerId, finalChatId, finalTitle, finalUsername, targetGroupId);

    try {
      const { addMongoMailboxMessage } = await import('@/server/database/mongo');
      await addMongoMailboxMessage({
        streamerId,
        title: `Connected "${finalTitle}" to Bank Listener! ⚡`,
        senderName: 'GramJS Telegram Listener',
        category: 'security',
        content: `Your Telegram bank notification group "${finalTitle}" (${finalChatId}) was successfully connected. GramJS is now actively monitoring incoming transaction receipts in real time to trigger live OBS alerts.`,
        actionUrl: '/dashboard?tab=payments',
        actionLabel: 'Payment Gateway',
        priority: 'high'
      });
    } catch (mailErr) {}

    try {
      await telegramUserManager.notifyGroupsChanged(streamerId);
    } catch (e) {
      console.warn('[Telegram] Failed notifying groups changed after POST:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Group "${finalTitle}" successfully connected to GramJS target listener.`,
      group
    });
  } catch (err: any) {
    console.error('API /telegram/groups POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to add monitored group' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId = authUser?.id || req.nextUrl.searchParams.get('streamerId') || req.nextUrl.searchParams.get('streamer_id') || 'demo-streamer-id-1001';

    const url = new URL(req.url);
    let id = url.searchParams.get('id');
    let chatId = url.searchParams.get('chatId') || url.searchParams.get('chat_id');

    if (!id && !chatId) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
      chatId = body.chatId || body.chat_id;
    }

    const targets = [id, chatId].filter((v): v is string => Boolean(v && typeof v === 'string' && v.trim()));

    if (targets.length === 0) {
      return NextResponse.json(
        { error: 'Target group ID or Chat ID is required to remove.' },
        { status: 400 }
      );
    }

    const allTargets = new Set<string>();
    for (const t of targets) {
      allTargets.add(t);
      try {
        const mongoGroups = await getMongoMonitoredGroups(streamerId);
        const matchedMongo = (mongoGroups || []).find((g: any) => g.id === t || g.chat_id === t);
        if (matchedMongo) {
          if (matchedMongo.id) allTargets.add(matchedMongo.id);
          if (matchedMongo.chat_id) allTargets.add(matchedMongo.chat_id);
        }
      } catch (e) {}
    }

    for (const target of allTargets) {
      try {
        await deleteMongoMonitoredGroup(target, streamerId);
      } catch (e) {}
    }

    try {
      await telegramUserManager.notifyGroupsChanged(streamerId);
    } catch (e) {
      console.warn('[Telegram] Failed notifying groups changed after DELETE:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Target group removed from monitored list.'
    });
  } catch (err: any) {
    console.error('API /telegram/groups DELETE error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete monitored group' },
      { status: 500 }
    );
  }
}
