import { NextRequest, NextResponse } from 'next/server';
import { handleSuccessfulPayment } from '@/server/services/paywayService';
import { getDonationsCollection } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tran_id, status, apv, payment_status } = body;
    console.log('[PayWay Webhook] Received callback:', body);

    if (status === 0 || status === '0' || payment_status === 'APPROVED') {
      const donationsCol = await getDonationsCollection();
      const donation = await donationsCol.findOne({
        $or: [
          { id: tran_id },
          { paywayTranId: tran_id },
          { payway_tran_id: tran_id as any }
        ]
      }) as any;

      if (donation) {
        await handleSuccessfulPayment({
          donationId: donation.id || String(donation._id),
          paywayTranId: tran_id,
          bakongHash: apv || `ABA-APV-${Date.now()}`
        });
      }
    }

    return NextResponse.json({ status: 0, message: 'Webhook processed' });
  } catch (err: any) {
    console.error('[PayWay Webhook] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
