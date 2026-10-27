import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';
import { getTemporaryDonationsCollection } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const { donationId } = await req.json().catch(() => ({}));
    if (!donationId) {
      return NextResponse.json({ error: 'donationId is required' }, { status: 400 });
    }

    // 1. Delete from SQLite temporary_donations
    try {
      db.prepare('DELETE FROM temporary_donations WHERE id = ?').run(donationId);
      db.prepare("UPDATE donations SET status = 'CANCELLED' WHERE id = ? AND status = 'PENDING'").run(donationId);
    } catch (e) {
      console.warn('[Cleanup] SQLite error:', e);
    }

    // 2. Delete from MongoDB temporary_donations
    try {
      const col = await getTemporaryDonationsCollection();
      await col.deleteOne({ id: donationId });
    } catch (e) {
      console.warn('[Cleanup] Mongo error:', e);
    }

    return NextResponse.json({ success: true, message: 'You have cancelled the donation' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
