import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getDonationsCollection, cleanupOlderDonationsMongo } from '@/server/database/mongo';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const streamerId = user.id;

    // Enforce 6-month retention policy cleanup in MongoDB
    try {
      await cleanupOlderDonationsMongo(6);
    } catch (e) {}

    const donationsCol = await getDonationsCollection();

    // Query all PAID donations for this streamer
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

    let totalUsd = 0;
    let totalUsdCount = 0;
    let totalKhr = 0;
    let totalKhrCount = 0;

    let todayUsd = 0;
    let todayUsdCount = 0;
    let todayKhr = 0;
    let todayKhrCount = 0;

    const donorTotals = new Map<string, { totalUsdEquiv: number; count: number }>();
    const trendMap = new Map<string, { amountUsd: number; count: number }>();

    // Timeframe buckets
    const ms1d = 24 * 60 * 60 * 1000;
    const ms3d = 3 * ms1d;
    const ms7d = 7 * ms1d;
    const ms30d = 30 * ms1d;

    const tf = {
      today: { usd: 0, khr: 0, count: 0 },
      '1d': { usd: 0, khr: 0, count: 0 },
      '3d': { usd: 0, khr: 0, count: 0 },
      last_week: { usd: 0, khr: 0, count: 0 },
      last_month: { usd: 0, khr: 0, count: 0 }
    };

    for (const d of allPaid) {
      const amt = Number(d.amount) || 0;
      const isKhr = d.currency === 'KHR';
      const usdEquiv = isKhr ? amt / 4000.0 : amt;
      const paidDate = d.paidAt ? new Date(d.paidAt) : (d.createdAt ? new Date(d.createdAt) : new Date());
      const paidTime = paidDate.getTime();
      const paidDateStr = paidDate.toISOString().slice(0, 10);
      const donorName = d.donorName || (d as any).donor_name || 'Generous Supporter';

      // Totals
      if (isKhr) {
        totalKhr += amt;
        totalKhrCount++;
      } else {
        totalUsd += amt;
        totalUsdCount++;
      }

      // Today
      if (paidDateStr === todayStr) {
        if (isKhr) {
          todayKhr += amt;
          todayKhrCount++;
        } else {
          todayUsd += amt;
          todayUsdCount++;
        }
        tf.today.count++;
        if (isKhr) tf.today.khr += amt; else tf.today.usd += amt;
      }

      // Timeframe buckets
      const age = now - paidTime;
      if (age <= ms1d) {
        tf['1d'].count++;
        if (isKhr) tf['1d'].khr += amt; else tf['1d'].usd += amt;
      }
      if (age <= ms3d) {
        tf['3d'].count++;
        if (isKhr) tf['3d'].khr += amt; else tf['3d'].usd += amt;
      }
      if (age <= ms7d) {
        tf.last_week.count++;
        if (isKhr) tf.last_week.khr += amt; else tf.last_week.usd += amt;
      }
      if (age <= ms30d) {
        tf.last_month.count++;
        if (isKhr) tf.last_month.khr += amt; else tf.last_month.usd += amt;
      }

      // Top donor
      const existingDonor = donorTotals.get(donorName) || { totalUsdEquiv: 0, count: 0 };
      existingDonor.totalUsdEquiv += usdEquiv;
      existingDonor.count++;
      donorTotals.set(donorName, existingDonor);

      // Trend (last 7 days)
      if (age <= ms7d) {
        const trendBucket = trendMap.get(paidDateStr) || { amountUsd: 0, count: 0 };
        trendBucket.amountUsd += usdEquiv;
        trendBucket.count++;
        trendMap.set(paidDateStr, trendBucket);
      }
    }

    const calcTf = (bucket: { usd: number; khr: number; count: number }, daysFactor: number) => {
      const avgPerDayUsd = daysFactor > 0 ? bucket.usd / daysFactor : bucket.usd;
      const avgPerDayKhr = daysFactor > 0 ? bucket.khr / daysFactor : bucket.khr;
      return {
        usd: bucket.usd,
        khr: bucket.khr,
        count: bucket.count,
        avgPerDayUsd: Number(avgPerDayUsd.toFixed(2)),
        avgPerDayKhr: Math.round(avgPerDayKhr),
        potentialMonthlyUsd: Number((avgPerDayUsd * 30).toFixed(2)),
        potentialMonthlyKhr: Math.round(avgPerDayKhr * 30)
      };
    };

    const timeframeAnalytics = {
      today: calcTf(tf.today, 1),
      '1d': calcTf(tf['1d'], 1),
      '3d': calcTf(tf['3d'], 3),
      last_week: calcTf(tf.last_week, 7),
      last_month: calcTf(tf.last_month, 30)
    };

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

    const recentDonations = allPaid.slice(0, 50).map((d) => ({
      id: d.id,
      streamer_id: d.streamerId || (d as any).streamer_id,
      donor_name: d.donorName || (d as any).donor_name,
      donor_message: d.donorMessage || (d as any).donor_message || '',
      amount: d.amount,
      currency: d.currency,
      banking_name: d.bankingName || (d as any).banking_name,
      payment_method: d.paymentMethod || (d as any).payment_method,
      video_url: d.videoUrl || (d as any).video_url,
      video_title: d.videoTitle || (d as any).video_title,
      video_start_time: d.videoStartTime ?? (d as any).video_start_time ?? 0,
      video_end_time: d.videoEndTime ?? (d as any).video_end_time ?? 0,
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
        todayDonationsCount: todayUsdCount + todayKhrCount
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
