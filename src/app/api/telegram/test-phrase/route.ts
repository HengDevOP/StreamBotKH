import { NextRequest, NextResponse } from 'next/server';
import { telegramGroupListener } from '@backend/telegram/telegramListener';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phraseText, senderName, streamerUsername } = body;

    if (!phraseText || typeof phraseText !== 'string') {
      return NextResponse.json({ error: 'phraseText is required' }, { status: 400 });
    }

    const parsed = await telegramGroupListener.simulateTestPhrase(
      phraseText.trim(),
      senderName?.trim() || 'TelegramFan',
      streamerUsername?.trim() || 'neonstreamer'
    );

    return NextResponse.json({
      success: true,
      matched: parsed.matched,
      parsed,
      message: parsed.matched
        ? `Caught ${parsed.bankingName} tip of ${parsed.currency === 'KHR' ? `${parsed.amount.toLocaleString()} ៛` : `$${parsed.amount.toFixed(2)}`} from ${parsed.donorName} and fired OBS overlay alert!`
        : 'Phrase did not match any banking pattern or donation command.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
