import { NextRequest, NextResponse } from 'next/server';
import { handleSuccessfulPayment } from '@/server/services/paywayService';
import { getAuthenticatedUser } from '@/server/auth';
import { getDonationsCollection } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    const simulationSecret = (process.env.PAYMENT_SIMULATION_SECRET || '').trim();
    const providedSecret = req.headers.get('x-simulation-secret') || req.nextUrl.searchParams.get('secret');

    // 1. Verify simulation secret if provided
    const hasValidSecret = Boolean(simulationSecret && providedSecret && providedSecret === simulationSecret);

    // 2. Check authenticated user
    const authUser = getAuthenticatedUser(req);

    // In production, require strict simulation secret (or block completely if not configured)
    if (isProd) {
      if (!hasValidSecret) {
        return NextResponse.json(
          { error: 'Payment simulation is disabled in production.' },
          { status: 403 }
        );
      }
    } else {
      // In development, require either valid simulation secret OR authenticated streamer
      if (!hasValidSecret && !authUser) {
        return NextResponse.json(
          { error: 'Payment simulation requires authorization or simulation secret.' },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const { donationId } = body;

    if (!donationId) {
      return NextResponse.json({ error: 'donationId is required' }, { status: 400 });
    }

    // 3. Verify donation existence and ownership if authenticated without secret
    if (authUser && !hasValidSecret) {
      const donationsCol = await getDonationsCollection();
      const donation = await donationsCol.findOne({
        $or: [{ id: donationId }, { _id: donationId as any }]
      });

      if (!donation) {
        return NextResponse.json({ error: `Donation not found: ${donationId}` }, { status: 404 });
      }

      const donationStreamerId = (donation as any).streamerId || (donation as any).streamer_id;
      const donationStreamerUsername = (donation as any).streamerUsername || (donation as any).streamer_username;
      const isOwner =
        donationStreamerId === authUser.id ||
        (authUser.username && donationStreamerUsername === authUser.username);

      if (!isOwner) {
        return NextResponse.json(
          { error: 'Forbidden: You can only simulate payments for your own channel.' },
          { status: 403 }
        );
      }
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
