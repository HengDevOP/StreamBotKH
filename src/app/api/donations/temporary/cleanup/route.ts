import { NextRequest, NextResponse } from 'next/server';
import { getDonationsCollection, getTemporaryDonationsCollection } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const { donationId } = await req.json().catch(() => ({}));
    if (!donationId) {
      return NextResponse.json({ error: 'donationId is required' }, { status: 400 });
    }

    // 1. Mark pending donation as CANCELLED in MongoDB
    try {
      const donationsCol = await getDonationsCollection();
      await donationsCol.updateOne(
        {
          $or: [{ id: donationId }, { donationId }],
          status: 'PENDING'
        },
        { $set: { status: 'CANCELLED', updatedAt: new Date() } }
      );
    } catch (e) {
      console.warn('[Cleanup] Mongo donations error:', e);
    }

    // 2. Delete from MongoDB temporary_donations
    try {
      const col = await getTemporaryDonationsCollection();
      await col.deleteMany({
        $or: [{ id: donationId }, { donationId }]
      });
    } catch (e) {
      console.warn('[Cleanup] Mongo temporary_donations error:', e);
    }

    return NextResponse.json({ success: true, message: 'You have cancelled the donation' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
