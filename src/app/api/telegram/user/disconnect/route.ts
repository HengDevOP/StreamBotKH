import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';
import { clearMongoMonitoredGroups } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId = authUser?.id || 'demo-streamer-id-1001';

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
