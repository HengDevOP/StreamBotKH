import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to view Telegram user status.' },
        { status: 401 }
      );
    }

    const streamerId = authUser.id;
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
