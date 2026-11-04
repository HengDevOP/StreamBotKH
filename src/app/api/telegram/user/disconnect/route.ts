import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';
import { clearMongoMonitoredGroups } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }
    const streamerId = authUser.id;

    // Disconnect user client and clear monitored groups in MongoDB
    const result = await telegramUserManager.disconnect(streamerId);
    try {
      await clearMongoMonitoredGroups(streamerId);
    } catch (e) {}

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /telegram/user/disconnect error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to disconnect Telegram' },
      { status: 500 }
    );
  }
}
