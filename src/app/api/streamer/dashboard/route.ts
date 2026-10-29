import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db, cleanupOlderDonations } from '@/server/database/db';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const streamerId = user.id;

    // Enforce 6-month retention policy cleanup
    try {
      cleanupOlderDonations(6);
    } catch (e) {}

    // Total earnings USD & KHR (all-time, PAID only)
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

    // Today's earnings (PAID only)
    const todayUsdRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'USD'
      AND date(paid_at) = date('now')
    `).get(streamerId) as any;

    const todayKhrRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'KHR'
      AND date(paid_at) = date('now')
    `).get(streamerId) as any;

    // Helper to query analytics & earning potential for specific timeframes
    const queryTimeframeMetrics = (dateCondition: string, daysFactor: number) => {
      const rowUsd = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM donations
        WHERE streamer_id = ? AND status = 'PAID' AND currency = 'USD' AND ${dateCondition}
      `).get(streamerId) as any;

      const rowKhr = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM donations
        WHERE streamer_id = ? AND status = 'PAID' AND currency = 'KHR' AND ${dateCondition}
      `).get(streamerId) as any;

      const usd = Number(rowUsd?.total || 0);
      const khr = Number(rowKhr?.total || 0);
      const count = Number(rowUsd?.count || 0) + Number(rowKhr?.count || 0);

      const avgPerDayUsd = daysFactor > 0 ? usd / daysFactor : usd;
      const avgPerDayKhr = daysFactor > 0 ? khr / daysFactor : khr;
      const potentialMonthlyUsd = avgPerDayUsd * 30;
      const potentialMonthlyKhr = avgPerDayKhr * 30;

      return {
        usd,
        khr,
        count,
        avgPerDayUsd: Number(avgPerDayUsd.toFixed(2)),
        avgPerDayKhr: Math.round(avgPerDayKhr),
        potentialMonthlyUsd: Number(potentialMonthlyUsd.toFixed(2)),
        potentialMonthlyKhr: Math.round(potentialMonthlyKhr)
      };
    };

    const timeframeAnalytics = {
      today: queryTimeframeMetrics("date(paid_at) = date('now')", 1),
      '1d': queryTimeframeMetrics("datetime(paid_at) >= datetime('now', '-1 day')", 1),
      '3d': queryTimeframeMetrics("datetime(paid_at) >= datetime('now', '-3 days')", 3),
      'last_week': queryTimeframeMetrics("datetime(paid_at) >= datetime('now', '-7 days')", 7),
      'last_month': queryTimeframeMetrics("datetime(paid_at) >= datetime('now', '-30 days')", 30)
    };

    // Top donors (PAID only)
    const topDonors = db.prepare(`
      SELECT donor_name, SUM(CASE WHEN currency = 'KHR' THEN amount / 4000.0 ELSE amount END) as total_usd_equiv, COUNT(*) as donations_count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID'
      GROUP BY donor_name
      ORDER BY total_usd_equiv DESC
      LIMIT 5
    `).all(streamerId);

    // Recent donations (PAID status ONLY, last 50)
    const recentDonations = db.prepare(`
      SELECT *
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID'
      ORDER BY created_at DESC
      LIMIT 50
    `).all(streamerId);

    // Daily revenue trend (last 7 days, PAID only)
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
        todayDonationsCount: (todayUsdRow.count || 0) + (todayKhrRow.count || 0)
      },
      timeframeAnalytics,
      topDonors,
      recentDonations,
      trend
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
