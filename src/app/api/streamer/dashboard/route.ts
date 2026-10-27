import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const streamerId = user.id;

    // Total earnings USD & KHR
    const totalUsdRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'USD'
    `).get(streamerId) as any;

    const totalKhrRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'KHR'
    `).get(streamerId) as any;

    // Today's earnings
    const todayUsdRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'USD'
      AND date(paid_at) = date('now')
    `).get(streamerId) as any;

    const todayKhrRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'KHR'
      AND date(paid_at) = date('now')
    `).get(streamerId) as any;

    // Top donors
    const topDonors = db.prepare(`
      SELECT donor_name, SUM(CASE WHEN currency = 'KHR' THEN amount / 4000.0 ELSE amount END) as total_usd_equiv, COUNT(*) as donations_count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID'
      GROUP BY donor_name
      ORDER BY total_usd_equiv DESC
      LIMIT 5
    `).all(streamerId);

    // Recent donations (last 20)
    const recentDonations = db.prepare(`
      SELECT *
      FROM donations
      WHERE streamer_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(streamerId);

    // Daily revenue trend (last 7 days)
    const trend = db.prepare(`
      SELECT
        strftime('%Y-%m-%d', paid_at) as date,
        SUM(CASE WHEN currency = 'KHR' THEN amount / 4000.0 ELSE amount END) as amount_usd,
        COUNT(*) as count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID'
        AND paid_at >= datetime('now', '-7 days')
      GROUP BY date
      ORDER BY date ASC
    `).all(streamerId);

    return NextResponse.json({
      summary: {
        totalRevenueUsd: totalUsdRow.total,
        totalRevenueKhr: totalKhrRow.total,
        totalDonationsCount: (totalUsdRow.count || 0) + (totalKhrRow.count || 0),
        todayRevenueUsd: todayUsdRow.total,
        todayRevenueKhr: todayKhrRow.total,
        todayDonationsCount: todayUsdRow.count || 0
      },
      topDonors,
      recentDonations,
      trend
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
