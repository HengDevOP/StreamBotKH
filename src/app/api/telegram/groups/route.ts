import { NextRequest, NextResponse } from 'next/server';
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
    const streamerId = authUser?.id || 'demo-streamer-id-1001';

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
      if (mongoGroups && mongoGroups.length > 0) {
        groups = mongoGroups.map(g => ({
          id: g.id,
          streamer_id: g.streamerId,
          chat_id: g.chatId,
          title: g.title,
          username: g.username,
          created_at: g.createdAt ? g.createdAt.toISOString() : new Date().toISOString()
        }));
      } else {
        groups = getMonitoredGroups(streamerId);
      }
    } catch (e) {
      groups = getMonitoredGroups(streamerId);
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
    const streamerId = authUser?.id || 'demo-streamer-id-1001';

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

    // Save to MongoDB Primary
    let group: any = null;
    try {
      group = await addMongoMonitoredGroup(streamerId, finalChatId, finalTitle, finalUsername);
    } catch (mongoErr) {
      console.warn('[MongoDB] Failed adding monitored group, using sqlite fallback:', mongoErr);
    }

    // Safe SQLite backup
    try {
      const sqlGroup = addMonitoredGroup(streamerId, finalChatId, finalTitle, finalUsername);
      if (!group) group = sqlGroup;
    } catch (e) {}

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
    const streamerId = authUser?.id || 'demo-streamer-id-1001';

    const url = new URL(req.url);
    let id = url.searchParams.get('id');

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Target group ID is required to remove.' },
        { status: 400 }
      );
    }

    try {
      await deleteMongoMonitoredGroup(id, streamerId);
    } catch (e) {}

    try {
      deleteMonitoredGroup(id, streamerId);
    } catch (e) {}

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
