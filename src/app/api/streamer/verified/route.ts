import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection, getDonationsCollection } from '@/server/database/mongo';

export async function GET(_req: NextRequest) {
  try {
    const usersCol = await getUsersCollection();
    const verifiedUsers = await usersCol.find({ isVerified: true }).toArray();

    const donationsCol = await getDonationsCollection();
    const streamers: any[] = [];

    for (const u of verifiedUsers) {
      const uId = u.userId || (u as any).id || String(u._id);
      const paidDonations = await donationsCol.find({
        $or: [
          { streamerId: uId },
          { streamer_id: uId as any },
          ...(u.username ? [{ streamerId: u.username }] : [])
        ],
        status: 'PAID'
      }).toArray();

      let totalVolume = 0;
      for (const d of paidDonations) {
        totalVolume += Number(d.amount) || 0;
      }

      streamers.push({
        id: uId,
        username: u.username,
        displayName: u.displayName || u.username,
        avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
        bio: u.bio || 'Verified Content Creator',
        plan: u.plan || 'free',
        totalVolume,
        totalTips: paidDonations.length
      });
    }

    streamers.sort((a, b) => b.totalVolume - a.totalVolume);

    return NextResponse.json({
      success: true,
      streamers
    });
  } catch (err: any) {
    console.error('API /streamer/verified error:', err);
    return NextResponse.json({ success: false, streamers: [] });
  }
}
