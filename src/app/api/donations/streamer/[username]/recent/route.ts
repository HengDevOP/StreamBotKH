import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection, getDonationsCollection } from '@/server/database/mongo';

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const rawUsername = params.username || '';
    const cleanUsername = decodeURIComponent(rawUsername).replace(/^@/, '').toLowerCase();
    const escaped = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const usersCol = await getUsersCollection();
    const streamer = await usersCol.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { userId: cleanUsername }
      ]
    });

    if (!streamer) {
      return NextResponse.json([]);
    }

    const streamerId = streamer.userId || (streamer as any).id || String(streamer._id);
    const donationsCol = await getDonationsCollection();

    const docs = await donationsCol
      .find({
        $or: [
          { streamerId },
          { streamer_id: streamerId as any },
          ...(streamer.username ? [{ streamerId: streamer.username }] : [])
        ],
        status: 'PAID'
      })
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(8)
      .toArray();

    const donations = docs.map((d) => ({
      id: d.id,
      donor_name: d.donorName || (d as any).donor_name,
      donor_message: d.donorMessage || (d as any).donor_message || '',
      amount: d.amount,
      currency: d.currency,
      banking_name: d.bankingName || (d as any).banking_name,
      video_url: d.videoUrl || (d as any).video_url,
      video_title: d.videoTitle || (d as any).video_title,
      created_at: d.createdAt,
      paid_at: d.paidAt
    }));

    return NextResponse.json(donations);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
