import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getMonitoredGroups, addMonitoredGroup, deleteMonitoredGroup } from '@/server/database/db';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId = authUser?.id || 'demo-streamer-id-1001';

    const groups = getMonitoredGroups(streamerId);
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

    const body = await req.json().catch(() => ({}));
    const { chatId, title, username } = body;

    if (!chatId || typeof chatId !== 'string' || !chatId.trim()) {
      return NextResponse.json(
        { error: 'Group Chat ID is required (e.g. -1001234567890).' },
        { status: 400 }
      );
    }

    const cleanTitle = (title && typeof title === 'string' && title.trim()) ? title.trim() : `Telegram Group (${chatId.trim()})`;
    const cleanUsername = username && typeof username === 'string' ? username.trim() : undefined;

    const group = addMonitoredGroup(streamerId, chatId.trim(), cleanTitle, cleanUsername);

    return NextResponse.json({
      success: true,
      message: `Group "${cleanTitle}" added to GramJS target listening list.`,
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

    deleteMonitoredGroup(id, streamerId);

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
