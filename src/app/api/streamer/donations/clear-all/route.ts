import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to manage your donations' }, { status: 401 });
    }

    // Delete all donations for this streamer
    const deleteResult = db.prepare('DELETE FROM donations WHERE streamer_id = ?').run(user.id);

    // Also clean up from MongoDB temporary_donations
    try {
      const { getTemporaryDonationsCollection } = require('@/server/database/mongo');
      const tempCol = await getTemporaryDonationsCollection();
      await tempCol.deleteMany({ streamerId: user.id });
    } catch (mErr) {
      // Non-fatal if mongo cleanup fails
    }

    return NextResponse.json({
      success: true,
      count: deleteResult.changes || 0,
      message: `Successfully cleared ${deleteResult.changes || 0} donation record(s)`
    });
  } catch (err: any) {
    console.error('[API Clear All Donations] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to clear donation records' }, { status: 500 });
  }
}
