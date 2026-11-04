import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to verify Telegram code.' },
        { status: 401 }
      );
    }
    const streamerId = authUser.id;

    const body = await req.json();
    const { phoneCode, phoneCodeHash, phoneNumber, password } = body;

    if (!phoneCode || typeof phoneCode !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const result = await telegramUserManager.verifyCode({
      streamerId,
      phoneCode,
      phoneCodeHash,
      phoneNumber,
      password
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /telegram/user/verify-code error:', err);
    return NextResponse.json(
      { error: err.message || 'Invalid or expired verification code' },
      { status: 400 }
    );
  }
}
