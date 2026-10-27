import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';
import { getTemporaryDonationsCollection } from '@/server/database/mongo';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const donation = db.prepare(`
      SELECT id, streamer_id, donor_name, donor_message, amount, currency,
             banking_name, payment_method, video_url, video_title,
             video_start_time, video_end_time, status, paid_at, created_at
      FROM donations WHERE id = ?
    `).get(id) as any;

    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    // 5-Minute Cache Duration Expiration: Auto-expire pending sessions older than 5 minutes
    if (donation.status === 'PENDING' && donation.created_at) {
      const isOlderThan5Min = db.prepare(`
        SELECT 1 FROM donations
        WHERE id = ? AND status = 'PENDING' AND created_at <= datetime('now', '-5 minutes')
      `).get(id);

      if (isOlderThan5Min) {
        db.prepare("UPDATE donations SET status = 'EXPIRED' WHERE id = ?").run(id);
        db.prepare("DELETE FROM temporary_donations WHERE id = ?").run(id);
        getTemporaryDonationsCollection()
          .then((col) => col.deleteMany({ $or: [{ id }, { donationId: id }] }))
          .catch(() => {});
        donation.status = 'EXPIRED';
      }
    }

    return NextResponse.json(donation);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
