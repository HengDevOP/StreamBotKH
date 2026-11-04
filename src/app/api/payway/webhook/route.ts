import { NextRequest, NextResponse } from 'next/server';
import { handleSuccessfulPayment, checkPayWayTransaction } from '@/server/services/paywayService';
import { getDonationsCollection, getPaymentSettingsCollection } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = (process.env.PAYWAY_WEBHOOK_SECRET || process.env.PAYMENT_GATEWAY_SECRET || '').trim();
    if (webhookSecret) {
      const providedSecret =
        req.headers.get('x-webhook-secret') ||
        req.headers.get('x-payway-token') ||
        req.nextUrl.searchParams.get('secret');

      if (!providedSecret || providedSecret !== webhookSecret) {
        console.warn('[PayWay Webhook] Rejected unauthorized webhook call: Invalid secret.');
        return NextResponse.json({ error: 'Unauthorized: Invalid webhook secret.' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { tran_id, status, apv, payment_status, hash } = body;
    console.log('[PayWay Webhook] Received callback for tran_id:', tran_id, 'status:', status);

    if (!tran_id) {
      return NextResponse.json({ error: 'Missing tran_id' }, { status: 400 });
    }

    if (status === 0 || status === '0' || payment_status === 'APPROVED') {
      const donationsCol = await getDonationsCollection();
      const donation = await donationsCol.findOne({
        $or: [
          { id: tran_id },
          { paywayTranId: tran_id },
          { payway_tran_id: tran_id as any }
        ]
      }) as any;

      if (!donation) {
        return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
      }

      const streamerId = donation.streamerId || donation.streamer_id;

      // If streamer has ABA credentials configured, verify directly with ABA PayWay API
      if (streamerId) {
        try {
          const paymentSettingsCol = await getPaymentSettingsCollection();
          const paymentSettings = await paymentSettingsCol.findOne({
            $or: [{ streamerId }, { _id: streamerId as any }]
          });

          const merchantId = (paymentSettings as any)?.abaMerchantId || (paymentSettings as any)?.aba_merchant_id;
          const apiKey = (paymentSettings as any)?.abaApiKey || (paymentSettings as any)?.aba_api_key;

          if (merchantId && apiKey) {
            const verifyRes = await checkPayWayTransaction(tran_id, streamerId);
            const isApproved =
              verifyRes &&
              (verifyRes.status === 0 ||
                verifyRes.status === '0' ||
                verifyRes.payment_status === 'APPROVED' ||
                verifyRes.data?.payment_status === 'APPROVED');

            if (!isApproved) {
              console.warn(`[PayWay Webhook] Transaction ${tran_id} failed ABA verification:`, verifyRes);
              return NextResponse.json({ error: 'Transaction verification failed with ABA PayWay' }, { status: 400 });
            }
          }
        } catch (vErr) {
          console.warn('[PayWay Webhook] Could not perform ABA verification check:', vErr);
        }
      }

      await handleSuccessfulPayment({
        donationId: donation.id || String(donation._id),
        paywayTranId: tran_id,
        bakongHash: apv || `ABA-APV-${Date.now()}`
      });
    }

    return NextResponse.json({ status: 0, message: 'Webhook processed' });
  } catch (err: any) {
    console.error('[PayWay Webhook] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
