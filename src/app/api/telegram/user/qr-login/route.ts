import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId =
      authUser?.id ||
      req.nextUrl.searchParams.get('streamerId') ||
      req.nextUrl.searchParams.get('streamer_id') ||
      'demo-streamer-id-1001';

    const result = await telegramUserManager.pollQrLogin(streamerId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API GET /telegram/user/qr-login error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to check QR login status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId = authUser?.id || 'demo-streamer-id-1001';
    const body = await req.json().catch(() => ({}));

    if (body?.action === 'password') {
      if (!body.password || typeof body.password !== 'string') {
        return NextResponse.json(
          { error: '2FA password is required' },
          { status: 400 }
        );
      }

      const result = await telegramUserManager.submitQrPassword({
        streamerId,
        password: body.password
      });
      return NextResponse.json(result);
    }

    const result = await telegramUserManager.startQrLogin({
      streamerId,
      apiId: body?.apiId ? parseInt(body.apiId, 10) : undefined,
      apiHash: body?.apiHash || undefined,
      forceRefresh: Boolean(body?.forceRefresh)
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API POST /telegram/user/qr-login error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate Telegram QR code' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const streamerId = authUser?.id || 'demo-streamer-id-1001';

    const result = await telegramUserManager.cancelQrLogin(streamerId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API DELETE /telegram/user/qr-login error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to cancel QR login session' },
      { status: 500 }
    );
  }
}
