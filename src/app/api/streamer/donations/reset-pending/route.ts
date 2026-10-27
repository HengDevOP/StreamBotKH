import { NextRequest, NextResponse } from 'next/server';
import { db, cleanupExpiredPendingDonations } from '@/server/database/db';
import { getTemporaryDonationsCollection } from '@/server/database/mongo';

export async function GET(_req: NextRequest) {
  try {
    // Run 5-minute cleanup first to ensure accurate count
    cleanupExpiredPendingDonations();

    const pendingRow = db.prepare(`
      SELECT COUNT(*) as count FROM donations WHERE status = 'PENDING'
    `).get() as any;

    const pendingList = db.prepare(`
      SELECT id, donor_name, banking_name, amount, currency, created_at
      FROM donations
      WHERE status = 'PENDING'
      ORDER BY created_at DESC
      LIMIT 10
    `).all() as any[];

    return NextResponse.json({
      success: true,
      pendingCount: pendingRow?.count || 0,
      pendingDonations: pendingList
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    // 1. Cancel all pending donations in SQLite ledger
    const updateResult = db.prepare(`
      UPDATE donations
      SET status = 'CANCELLED'
      WHERE status = 'PENDING'
    `).run();

    // 2. Wipe temporary donations queue
    const deleteResult = db.prepare(`
      DELETE FROM temporary_donations
    `).run();

    // 3. Clear MongoDB temporary queue
    try {
      const col = await getTemporaryDonationsCollection();
      await col.deleteMany({});
    } catch (e) {
      // safe fallback
    }

    const totalCleared = (updateResult.changes || 0) + (deleteResult.changes || 0);
    console.log(`🧹 [Dashboard Reset] Streamer reset all pending sessions. Cleared: ${updateResult.changes} donations, ${deleteResult.changes} temporary records.`);

    return NextResponse.json({
      success: true,
      clearedDonations: updateResult.changes || 0,
      clearedTemporary: deleteResult.changes || 0,
      message: `Successfully reset ${updateResult.changes || 0} pending session(s). Unwanted alerts prevented.`
    });
  } catch (err: any) {
    console.error('Error resetting pending donations:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
