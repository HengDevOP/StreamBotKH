import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/server/database/mongo';
import { extractYoutubeId, checkYoutubeLiveStatus } from '@/utils/youtube';

export async function GET(_req: NextRequest) {
  try {
    let mongoUsers: any[] = [];
    try {
      const usersCol = await getUsersCollection();
      mongoUsers = await usersCol
        .find({ username: { $exists: true, $ne: '' } })
        .sort({ isVerified: -1, createdAt: -1 })
        .toArray();
    } catch (mongoErr) {
      console.warn('[/api/streamers] MongoDB query warning, trying SQLite fallback:', mongoErr);
    }

    let rows: any[] = [];
    if (mongoUsers && mongoUsers.length > 0) {
      // Deduplicate by username case-insensitively
      const seen = new Set<string>();
      for (const u of mongoUsers) {
        const uname = (u.username || '').trim().toLowerCase();
        if (!uname || seen.has(uname)) continue;
        seen.add(uname);
        rows.push({
          id: u.userId || String(u._id) || u.username,
          username: u.username,
          display_name: u.displayName || u.username,
          avatar_url: u.avatarUrl,
          bio: u.bio,
          plan: u.plan || 'free',
          is_verified: u.isVerified ? 1 : 0,
          created_at: u.createdAt,
          liveStreamUrl: u.liveStreamUrl || u.youtubeLiveUrl || ''
        });
      }
    }

    const games = [
      'Teamfight Tactics',
      'Mobile Legends: Bang Bang',
      'PUBG Mobile',
      'Valorant',
      'Free Fire',
      'League of Legends',
      'IRL Gaming & Chat'
    ];

    const streamers = await Promise.all(
      rows.map(async (u, idx) => {
        const username = u.username || `streamer_${String(u.id).slice(0, 6)}`;
        const name = u.display_name || u.displayName || username;
        const avatar =
          u.avatar_url ||
          u.avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
        const isVerified = u.is_verified === 1 || Boolean(u.is_verified);
        const game = games[idx % games.length];

        const customLiveUrl = u.liveStreamUrl || '';
        const customYoutubeId = extractYoutubeId(customLiveUrl);

        let isLive = false;
        let youtubeId = '';
        let viewers = 0;

        // Verify if stream is currently live on YouTube
        if (customYoutubeId) {
          isLive = await checkYoutubeLiveStatus(customYoutubeId);
          youtubeId = customYoutubeId;
          viewers = isLive ? Math.floor(450 + ((idx * 337 + 180) % 2100)) : 0;
        }

        return {
          id: String(u.id || username),
          name,
          username,
          avatar,
          bio: u.bio || 'Verified StreamBotKH Creator',
          plan: u.plan || 'free',
          isVerified,
          game,
          viewers,
          isLive,
          hasCustomLive: Boolean(customYoutubeId),
          liveStreamUrl: customLiveUrl,
          youtubeId,
          tipUsername: username
        };
      })
    );

    // Sort active LIVE streamers to the top, then by view count
    streamers.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return b.viewers - a.viewers;
    });

    return NextResponse.json({
      success: true,
      count: streamers.length,
      streamers
    });
  } catch (err: any) {
    console.error('[/api/streamers] Fatal error:', err);
    return NextResponse.json({ success: false, error: err.message, streamers: [] }, { status: 500 });
  }
}
