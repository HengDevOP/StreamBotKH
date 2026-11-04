import { NextRequest, NextResponse } from 'next/server';
import { telegramGroupListener } from '@backend/telegram/telegramListener';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    if (!isAdminEmail(authUser.email)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { token } = body;

    const result = await telegramGroupListener.start(token);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
