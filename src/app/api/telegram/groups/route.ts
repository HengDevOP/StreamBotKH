import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { getMonitoredGroups, addMonitoredGroup, deleteMonitoredGroup } from '@/server/database/db';
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

    let groups: any[] = [];
    try {
      const mongoGroups = await getMongoMonitoredGroups(streamerId);
      const sqlGroups = getMonitoredGroups(streamerId) || [];
      const seenChatIds = new Set<string>();

      const addGroup = (g: any) => {
        const rawCid = String(g.chat_id || g.chatId || '').trim();
        const norm = rawCid.replace(/^-100/, '').replace(/^-/, '');
        if (norm && !seenChatIds.has(norm)) {
          seenChatIds.add(norm);
          groups.push({
            id: g.id,
            streamer_id: g.streamer_id || g.streamerId || streamerId,
            chat_id: rawCid,
            title: g.title,
            username: g.username,
            created_at: g.created_at || (g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString())
          });
        }
      };

      if (mongoGroups && mongoGroups.length > 0) {
        mongoGroups.forEach(addGroup);
      }
      if (sqlGroups && sqlGroups.length > 0) {
        sqlGroups.forEach(addGroup);
      }
    } catch (e) {
      const sqlGroups = getMonitoredGroups(streamerId) || [];
      groups = sqlGroups.map((g: any) => ({
        id: g.id,
        streamer_id: g.streamer_id || streamerId,
        chat_id: String(g.chat_id || '').trim(),
        title: g.title,
        username: g.username,
        created_at: g.created_at || new Date().toISOString()
      }));
    }
    let availableDialogs: any[] = [];
    try {
      availableDialogs = await telegramUserManager.getAvailableDialogs(streamerId);
    } catch (e) {
      // Ignored if client is not connected
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
    const streamerId = authUser?.id || req.nextUrl.searchParams.get('streamerId') || req.nextUrl.searchParams.get('streamer_id') || 'demo-streamer-id-1001';

    const status = await telegramUserManager.getStatus(streamerId);
    if (!status.isConnected) {
      return NextResponse.json(
        { error: 'GramJS is not connected. Please connect your Telegram account in Step 1 first.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let { chatId, title, username, groupLink } = body;

    const rawTarget = (groupLink || chatId || '').trim();

    if (!rawTarget) {
      return NextResponse.json(
        { error: 'Telegram group link or Chat ID is required (e.g. https://t.me/yourgroup or -1001234567890).' },
        { status: 400 }
      );
    }

    let finalChatId = rawTarget;
    let finalTitle = (title && typeof title === 'string' && title.trim()) ? title.trim() : '';
    let finalUsername = username && typeof username === 'string' ? username.trim() : undefined;

    // Try resolving link / entity via GramJS if active
    try {
      const resolved = await telegramUserManager.resolveGroupEntity(streamerId, rawTarget);
      if (resolved) {
        if (resolved.id) finalChatId = resolved.id;
        if (!finalTitle && resolved.title) finalTitle = resolved.title;
        if (!finalUsername && resolved.username) finalUsername = resolved.username;
      }
    } catch (e) {
      // safe fallback
    }

    // Clean up link if still full URL
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

    // Generate unified ID for both MongoDB and SQLite
    const targetGroupId = uuidv4();

    // Save to MongoDB Primary
    let group: any = null;
    try {
      group = await addMongoMonitoredGroup(streamerId, finalChatId, finalTitle, finalUsername, targetGroupId);
    } catch (mongoErr) {
      console.warn('[MongoDB] Failed adding monitored group, using sqlite fallback:', mongoErr);
    }

    // Safe SQLite backup using the same unified ID
    try {
      const unifiedId = group?.id || targetGroupId;
      const sqlGroup = addMonitoredGroup(streamerId, finalChatId, finalTitle, finalUsername, unifiedId);
      if (!group) group = sqlGroup;
    } catch (e) {}

    // Send instant notification to streamer Mailbox
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

    // Immediately notify GramJS to update target groups filter
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

    // Resolve all representations (id, chat_id) across MongoDB & SQLite before deleting
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

      try {
        const sqlGroups = getMonitoredGroups(streamerId) || [];
        const matchedSql = sqlGroups.find((g: any) => g.id === t || g.chat_id === t);
        if (matchedSql) {
          if (matchedSql.id) allTargets.add(matchedSql.id);
          if (matchedSql.chat_id) allTargets.add(matchedSql.chat_id);
        }
      } catch (e) {}
    }

    for (const target of allTargets) {
      try {
        await deleteMongoMonitoredGroup(target, streamerId);
      } catch (e) {}

      try {
        deleteMonitoredGroup(target, streamerId);
      } catch (e) {}
    }

    // Immediately notify GramJS to update monitored groups filter
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
