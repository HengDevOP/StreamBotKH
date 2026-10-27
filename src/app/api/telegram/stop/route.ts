import { NextRequest, NextResponse } from 'next/server';
import { telegramGroupListener } from '@backend/telegram/telegramListener';

export async function POST(_req: NextRequest) {
  try {
    telegramGroupListener.stop();
    return NextResponse.json({ success: true, message: 'Telegram group listener stopped.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
