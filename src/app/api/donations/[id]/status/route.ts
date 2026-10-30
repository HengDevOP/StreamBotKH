import { NextRequest, NextResponse } from 'next/server';
import { getDonationsCollection, getTemporaryDonationsCollection } from '@/server/database/mongo';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const donationsCol = await getDonationsCollection();
    const doc = await donationsCol.findOne({
      $or: [{ id }, { donationId: id }]
    });

    if (!doc) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    const donation: any = {
      id: doc.id,
      streamer_id: doc.streamerId || (doc as any).streamer_id,
      donor_name: doc.donorName || (doc as any).donor_name,
      donor_message: doc.donorMessage || (doc as any).donor_message || '',
      amount: doc.amount,
      currency: doc.currency,
      banking_name: doc.bankingName || (doc as any).banking_name,
      payment_method: doc.paymentMethod || (doc as any).payment_method,
      video_url: doc.videoUrl || (doc as any).video_url,
      video_title: doc.videoTitle || (doc as any).video_title,
      video_start_time: doc.videoStartTime ?? (doc as any).video_start_time ?? 0,
      video_end_time: doc.videoEndTime ?? (doc as any).video_end_time ?? 0,
      status: doc.status,
      paid_at: doc.paidAt,
      created_at: doc.createdAt
    };

    // 5-Minute Cache Duration Expiration: Auto-expire pending sessions older than 5 minutes
    if (donation.status === 'PENDING' && donation.created_at) {
      const createdTime = new Date(donation.created_at).getTime();
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      if (createdTime <= fiveMinAgo) {
        await donationsCol.updateOne(
          { id: doc.id },
          { $set: { status: 'EXPIRED', updatedAt: new Date() } }
        );
        const tempCol = await getTemporaryDonationsCollection();
        await tempCol.deleteMany({ $or: [{ id }, { donationId: id }] }).catch(() => {});
        donation.status = 'EXPIRED';
      }
    }

    return NextResponse.json(donation);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
