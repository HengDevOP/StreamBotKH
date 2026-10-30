import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getDonationsCollection, getTemporaryDonationsCollection } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to manage your donations' }, { status: 401 });
    }

    const donationsCol = await getDonationsCollection();
    const tempCol = await getTemporaryDonationsCollection();

    // Delete all donations for this streamer from MongoDB
    const deleteResult = await donationsCol.deleteMany({
      $or: [
        { streamerId: user.id },
        { streamer_id: user.id as any },
        ...(user.username ? [{ streamerId: user.username }] : [])
      ]
    });

    await tempCol.deleteMany({
      $or: [
        { streamerId: user.id },
        ...(user.username ? [{ streamerId: user.username }] : [])
      ]
    });

    return NextResponse.json({
      success: true,
      count: deleteResult.deletedCount || 0,
      message: `Successfully cleared ${deleteResult.deletedCount || 0} donation record(s)`
    });
  } catch (err: any) {
    console.error('[API Clear All Donations] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to clear donation records' }, { status: 500 });
  }
}
