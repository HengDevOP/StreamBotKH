import { NextRequest, NextResponse } from 'next/server';
import { handleSuccessfulPayment } from '@/server/services/paywayService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { donationId } = body;

    if (!donationId) {
      return NextResponse.json({ error: 'donationId is required' }, { status: 400 });
    }

    const result = await handleSuccessfulPayment({
      donationId,
      paywayTranId: `SIM-ABA-${Date.now()}`,
      bakongHash: `SIM-BKG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    });

    return NextResponse.json({
      success: true,
      message: 'Payment simulation succeeded. Alert dispatched to OBS overlay and Telegram bot.',
      result
    });
  } catch (err: any) {
    console.error('[Simulator] Simulation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
