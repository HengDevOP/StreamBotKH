import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection, getDonationsCollection } from '@/server/database/mongo';

export async function GET(_req: NextRequest) {
  try {
    const usersCol = await getUsersCollection();
    // Query ONLY registered verified streamers
    const users = await usersCol
      .find({
        username: { $exists: true, $ne: '' },
        $or: [
          { isVerified: true },
          { is_verified: true },
          { isAdmin: true }
        ],
        isVerified: { $ne: false },
        is_verified: { $ne: false }
      })
      .sort({ createdAt: -1 })
      .toArray();

    const donationsCol = await getDonationsCollection();
    const streamers: any[] = [];

    for (const u of users) {
      // Strictly enforce verified check
      const isVerified = Boolean(
        (u.isVerified === true || u.is_verified === true || u.isAdmin === true) &&
        u.isVerified !== false &&
        u.is_verified !== false
      );
      if (!isVerified) continue;
      const uId = u.userId || (u as any).id || String(u._id);
      const paidDonations = await donationsCol.find({
        $or: [
          { streamerId: uId },
          { streamer_id: uId as any },
          ...(u.userId ? [{ streamerId: u.userId }, { streamer_id: u.userId as any }] : []),
          ...(u.username ? [{ streamerId: u.username }, { streamer_id: u.username as any }] : []),
          ...(u._id ? [{ streamerId: String(u._id) }] : [])
        ],
        status: 'PAID'
      }).toArray();

      let totalVolumeUSD = 0;
      let totalVolumeKHR = 0;
      for (const d of paidDonations) {
        const amt = Number(d.amount) || 0;
        if (d.currency === 'KHR') {
          totalVolumeKHR += amt;
          totalVolumeUSD += amt / 4000;
        } else {
          totalVolumeUSD += amt;
        }
      }

      const totalTips = paidDonations.length;
      let supporters = 'Verified Creator';
      if (totalTips > 0) {
        supporters = `${totalTips} ${totalTips === 1 ? 'Tip' : 'Tips'}`;
        if (totalVolumeUSD >= 1) {
          supporters += ` • $${totalVolumeUSD.toFixed(totalVolumeUSD >= 10 ? 0 : 2)}`;
        } else if (totalVolumeKHR > 0) {
          supporters += ` • ${Math.round(totalVolumeKHR).toLocaleString()} KHR`;
        }
      } else if (u.plan === 'pro') {
        supporters = 'PRO Creator';
      }

      // Contextual bio tag if user has not set a custom bio
      let bio = (u.bio || '').trim();
      if (!bio) {
        if (u.isAdmin || u.email === 'hchenheng@gmail.com') {
          bio = 'Platform Creator & Broadcaster • Bakong KHQR';
        } else if (u.liveStreamUrl) {
          bio = 'Gaming & Esports Livestreamer • 60 FPS Alerts';
        } else if (u.plan === 'pro') {
          bio = 'PRO Streamer • Instant Bank Direct Deposit';
        } else {
          bio = 'Content Creator • Bakong KHQR Live Alerts';
        }
      }

      streamers.push({
        id: uId,
        username: u.username,
        displayName: u.displayName || u.username,
        avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username)}`,
        bannerUrl: u.bannerUrl || (u as any).banner_url || '',
        bio,
        plan: u.plan || 'free',
        isVerified: true,
        isLive: Boolean(u.liveStreamUrl),
        liveStreamUrl: u.liveStreamUrl || '',
        totalVolume: totalVolumeUSD,
        totalVolumeKHR,
        totalTips,
        supporters
      });
    }

    // Sort: paid tips volume first, then verified/pro, then active streamers
    streamers.sort((a, b) => {
      if (b.totalTips !== a.totalTips) {
        return b.totalTips - a.totalTips;
      }
      if (b.totalVolume !== a.totalVolume) {
        return b.totalVolume - a.totalVolume;
      }
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0);
    });

    return NextResponse.json({
      success: true,
      count: streamers.length,
      streamers
    });
  } catch (err: any) {
    console.error('API /streamer/verified error:', err);
    return NextResponse.json({ success: false, streamers: [] });
  }
}
