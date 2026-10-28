import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db, isAdminEmail } from '@/server/database/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to manage your donations' }, { status: 401 });
    }

    const donationId = params?.id;
    if (!donationId) {
      return NextResponse.json({ error: 'Donation ID is required' }, { status: 400 });
    }

    // Find donation in SQLite
    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId) as any;
    if (!donation) {
      return NextResponse.json({ error: 'Donation record not found' }, { status: 404 });
    }

    // Ensure the donation belongs to the authenticated streamer (or admin)
    const isOwner = donation.streamer_id === user.id;
    const isAdmin = isAdminEmail(user.email);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own donation records' }, { status: 403 });
    }

    // Delete record from SQLite donations table
    db.prepare('DELETE FROM donations WHERE id = ?').run(donationId);

    // Also clean up from MongoDB temporary_donations if present
    try {
      const { getTemporaryDonationsCollection } = require('@/server/database/mongo');
      const tempCol = await getTemporaryDonationsCollection();
      await tempCol.deleteMany({
        $or: [
          { donationId: donationId },
          { id: donationId },
          { md5: donationId }
        ]
      });
    } catch (mErr) {
      // Non-fatal if mongo cleanup fails
    }

    return NextResponse.json({
      success: true,
      message: `Donation record #${donationId.slice(0, 8)} deleted successfully`
    });
  } catch (err: any) {
    console.error('[API Delete Donation] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete donation record' }, { status: 500 });
  }
}
