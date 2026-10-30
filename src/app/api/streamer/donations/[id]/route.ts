import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getDonationsCollection, getTemporaryDonationsCollection } from '@/server/database/mongo';
import { isAdminEmail } from '@/server/database/db';

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

    const donationsCol = await getDonationsCollection();
    const donation = await donationsCol.findOne({
      $or: [{ id: donationId }, { donationId }]
    });

    if (!donation) {
      return NextResponse.json({ error: 'Donation record not found' }, { status: 404 });
    }

    // Ensure the donation belongs to the authenticated streamer (or admin)
    const donorStreamerId = donation.streamerId || (donation as any).streamer_id;
    const isOwner = donorStreamerId === user.id || (user.username && donorStreamerId === user.username);
    const isAdmin = isAdminEmail(user.email);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own donation records' }, { status: 403 });
    }

    await donationsCol.deleteOne({ _id: donation._id });

    try {
      const tempCol = await getTemporaryDonationsCollection();
      await tempCol.deleteMany({
        $or: [
          { donationId },
          { id: donationId }
        ]
      });
    } catch (mErr) {}

    return NextResponse.json({
      success: true,
      message: `Donation record #${donationId.slice(0, 8)} deleted successfully`
    });
  } catch (err: any) {
    console.error('[API Delete Donation] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete donation record' }, { status: 500 });
  }
}
