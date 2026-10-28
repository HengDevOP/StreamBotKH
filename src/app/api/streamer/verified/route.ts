import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';

export async function GET(_req: NextRequest) {
  try {
    const verifiedStreamers = db.prepare(`
      SELECT s.id, s.username, s.display_name, s.avatar_url, s.bio, s.plan,
             COALESCE(SUM(d.amount), 0) as total_volume,
             COUNT(d.id) as total_tips
      FROM streamers s
      LEFT JOIN donations d ON s.id = d.streamer_id AND d.status = 'PAID'
      WHERE s.is_verified = 1
      GROUP BY s.id
      ORDER BY total_volume DESC, s.created_at DESC
      LIMIT 20
    `).all() as any[];

    return NextResponse.json({
      success: true,
      streamers: verifiedStreamers.map((s) => ({
        id: s.id,
        username: s.username,
        displayName: s.display_name || s.username,
        avatarUrl: s.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.username}`,
        bio: s.bio || 'Verified Content Creator',
        plan: s.plan || 'free',
        totalVolume: Number(s.total_volume) || 0,
        totalTips: Number(s.total_tips) || 0
      }))
    });
  } catch (err: any) {
    console.error('API /streamer/verified error:', err);
    return NextResponse.json({ success: false, streamers: [] });
  }
}
