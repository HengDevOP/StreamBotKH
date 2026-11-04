import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to connect Telegram account.' },
        { status: 401 }
      );
    }
    const streamerId = authUser.id;

    const body = await req.json();
    const { phoneNumber, apiId, apiHash } = body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required (e.g. +85512345678)' },
        { status: 400 }
      );
    }

    const result = await telegramUserManager.sendVerificationCode({
      streamerId,
      phoneNumber,
      apiId: apiId ? parseInt(apiId, 10) : undefined,
      apiHash: apiHash || undefined
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /telegram/user/send-code error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
