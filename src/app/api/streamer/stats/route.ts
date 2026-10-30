import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getDonationsCollection } from '@/server/database/mongo';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const streamerId = user.id;
    const donationsCol = await getDonationsCollection();

    const allPaid = await donationsCol
      .find({
        $or: [
          { streamerId },
          { streamer_id: streamerId as any },
          ...(user.username ? [{ streamerId: user.username }] : [])
        ],
        status: 'PAID'
      })
      .sort({ createdAt: -1 })
      .toArray();

    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    const ms7d = 7 * 24 * 60 * 60 * 1000;

    let totalUsd = 0;
    let totalUsdCount = 0;
    let totalKhr = 0;
    let totalKhrCount = 0;

    let todayUsd = 0;
    let todayUsdCount = 0;
    let todayKhr = 0;

    const donorTotals = new Map<string, { totalUsdEquiv: number; count: number }>();
    const trendMap = new Map<string, { amountUsd: number; count: number }>();

    for (const d of allPaid) {
      const amt = Number(d.amount) || 0;
      const isKhr = d.currency === 'KHR';
      const usdEquiv = isKhr ? amt / 4000.0 : amt;
      const paidDate = d.paidAt ? new Date(d.paidAt) : (d.createdAt ? new Date(d.createdAt) : new Date());
      const paidTime = paidDate.getTime();
      const paidDateStr = paidDate.toISOString().slice(0, 10);
      const donorName = d.donorName || (d as any).donor_name || 'Generous Supporter';

      if (isKhr) {
        totalKhr += amt;
        totalKhrCount++;
      } else {
        totalUsd += amt;
        totalUsdCount++;
      }

      if (paidDateStr === todayStr) {
        if (isKhr) {
          todayKhr += amt;
        } else {
          todayUsd += amt;
          todayUsdCount++;
        }
      }

      const existingDonor = donorTotals.get(donorName) || { totalUsdEquiv: 0, count: 0 };
      existingDonor.totalUsdEquiv += usdEquiv;
      existingDonor.count++;
      donorTotals.set(donorName, existingDonor);

      if (now - paidTime <= ms7d) {
        const bucket = trendMap.get(paidDateStr) || { amountUsd: 0, count: 0 };
        bucket.amountUsd += usdEquiv;
        bucket.count++;
        trendMap.set(paidDateStr, bucket);
      }
    }

    const topDonors = Array.from(donorTotals.entries())
      .map(([donor_name, data]) => ({
        donor_name,
        total_usd_equiv: data.totalUsdEquiv,
        donations_count: data.count
      }))
      .sort((a, b) => b.total_usd_equiv - a.total_usd_equiv)
      .slice(0, 5);

    const trend = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        amount_usd: data.amountUsd,
        count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent donations (all statuses, last 20)
    const recentDocs = await donationsCol
      .find({
        $or: [
          { streamerId },
          { streamer_id: streamerId as any },
          ...(user.username ? [{ streamerId: user.username }] : [])
        ]
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const recentDonations = recentDocs.map((d) => ({
      id: d.id,
      streamer_id: d.streamerId || (d as any).streamer_id,
      donor_name: d.donorName || (d as any).donor_name,
      donor_message: d.donorMessage || (d as any).donor_message || '',
      amount: d.amount,
      currency: d.currency,
      banking_name: d.bankingName || (d as any).banking_name,
      payment_method: d.paymentMethod || (d as any).payment_method,
      status: d.status,
      created_at: d.createdAt,
      paid_at: d.paidAt
    }));

    return NextResponse.json({
      summary: {
        totalRevenueUsd: totalUsd,
        totalRevenueKhr: totalKhr,
        totalDonationsCount: totalUsdCount + totalKhrCount,
        todayRevenueUsd: todayUsd,
        todayRevenueKhr: todayKhr,
        todayDonationsCount: todayUsdCount
      },
      topDonors,
      recentDonations,
      trend
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
