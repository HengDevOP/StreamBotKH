import { NextRequest, NextResponse } from 'next/server';
import {
  getDonationsCollection,
  getTemporaryDonationsCollection,
  cleanupExpiredPendingDonationsMongo
} from '@/server/database/mongo';

export async function GET(_req: NextRequest) {
  try {
    // Run 5-minute cleanup first in MongoDB
    await cleanupExpiredPendingDonationsMongo();

    const donationsCol = await getDonationsCollection();
    const count = await donationsCol.countDocuments({ status: 'PENDING' });

    const pendingList = await donationsCol
      .find({ status: 'PENDING' })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const formattedList = pendingList.map((d) => ({
      id: d.id,
      donor_name: d.donorName || (d as any).donor_name,
      banking_name: d.bankingName || (d as any).banking_name,
      amount: d.amount,
      currency: d.currency,
      created_at: d.createdAt
    }));

    return NextResponse.json({
      success: true,
      pendingCount: count,
      pendingDonations: formattedList
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    const donationsCol = await getDonationsCollection();
    const updateResult = await donationsCol.updateMany(
      { status: 'PENDING' },
      { $set: { status: 'CANCELLED', updatedAt: new Date() } }
    );

    let mongoCleared = 0;
    try {
      const col = await getTemporaryDonationsCollection();
      const res = await col.deleteMany({});
      mongoCleared = res.deletedCount || 0;
    } catch (e) {}

    const totalCleared = (updateResult.modifiedCount || 0) + mongoCleared;
    console.log(`🧹 [Dashboard Reset] Streamer reset all pending sessions in MongoDB. Cleared: ${updateResult.modifiedCount} donations, ${mongoCleared} temporary records.`);

    return NextResponse.json({
      success: true,
      clearedDonations: updateResult.modifiedCount || 0,
      clearedTemporary: mongoCleared,
      message: `Successfully reset ${updateResult.modifiedCount || 0} pending session(s). Unwanted alerts prevented.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
