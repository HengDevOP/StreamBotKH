import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId = authUser?.id || 'demo-streamer-id-1001';

    const status = await telegramUserManager.getStatus(streamerId);
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('API /telegram/user/status error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to get Telegram user status' },
      { status: 500 }
    );
  }
}
