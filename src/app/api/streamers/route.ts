import { NextRequest, NextResponse } from 'next/server';
import {
  getUsersCollection,
  getTelegramSessionsCollection,
  getTelegramMonitoredGroupsCollection,
  getGatewayConfigCollection,
  getVideoAlertSettingsCollection
} from '@/server/database/mongo';
import { extractYoutubeId, getYoutubeLiveStats } from '@/utils/youtube';

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
          bio: u.bio || u.description || '',
          plan: u.plan || 'free',
          is_verified: u.isVerified ? 1 : 0,
          created_at: u.createdAt,
          liveStreamUrl: u.liveStreamUrl || u.youtubeLiveUrl || ''
        });
      }
    }

    // Batch query tip configuration states across all streamers in parallel
    const connectedStreamerIds = new Set<string>();
    const groupStreamerIds = new Set<string>();
    const khqrStreamerIds = new Set<string>();
    const videoMaxDurationMap = new Map<string, number>();
    const videoMinTipMap = new Map<string, number>();

    try {
      const [sessionsCol, groupsCol, gatewayCol, videoCol] = await Promise.all([
        getTelegramSessionsCollection(),
        getTelegramMonitoredGroupsCollection(),
        getGatewayConfigCollection(),
        getVideoAlertSettingsCollection()
      ]);

      const [sessions, groups, configs, videoSettings] = await Promise.all([
        sessionsCol.find({ isConnected: true, sessionString: { $exists: true, $ne: '' } }).toArray(),
        groupsCol.find().toArray(),
        gatewayCol.find({ khqrImageUrl: { $exists: true, $ne: '' } }).toArray(),
        videoCol.find().toArray()
      ]);

      for (const s of sessions) {
        if (s.streamerId) connectedStreamerIds.add(s.streamerId.toLowerCase());
      }
      for (const g of groups) {
        if (g.streamerId) groupStreamerIds.add(g.streamerId.toLowerCase());
      }
      for (const c of configs) {
        if (c.streamerId) khqrStreamerIds.add(c.streamerId.toLowerCase());
      }
      for (const v of videoSettings) {
        if (v.streamerId) {
          const key = String(v.streamerId).toLowerCase();
          const maxDur = Number(v.maxDurationSeconds ?? (v as any).max_duration_seconds ?? 300);
          const minTip = Number(v.minTipAmount ?? (v as any).min_tip_amount ?? 2.0);
          videoMaxDurationMap.set(key, maxDur);
          videoMinTipMap.set(key, minTip);
        }
      }
    } catch (e) {
      console.warn('[/api/streamers] Tip configuration batch check warning:', e);
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

        // Verify if stream is currently live on YouTube and get real concurrent watching count
        if (customYoutubeId) {
          const stats = await getYoutubeLiveStats(customYoutubeId);
          isLive = stats.isLive;
          youtubeId = customYoutubeId;
          viewers = stats.isLive ? stats.viewers : 0;
        }

        // Check if streamer meets all 3 tipping requirements: GramJS session + KHQR image + Monitored group
        const uidLower = String(u.id || '').toLowerCase();
        const unameLower = username.toLowerCase();
        const isTelegramConnected = connectedStreamerIds.has(uidLower) || connectedStreamerIds.has(unameLower);
        const hasTelegramGroup = groupStreamerIds.has(uidLower) || groupStreamerIds.has(unameLower);
        const hasMasterKhqr = khqrStreamerIds.has(uidLower) || khqrStreamerIds.has(unameLower);
        const isTipConfigured = Boolean(isTelegramConnected && hasTelegramGroup && hasMasterKhqr);

        const videoMaxDurationSeconds =
          videoMaxDurationMap.get(uidLower) ?? videoMaxDurationMap.get(unameLower) ?? 300;
        const videoMinTipAmount =
          videoMinTipMap.get(uidLower) ?? videoMinTipMap.get(unameLower) ?? 2.0;

        return {
          id: String(u.id || username),
          name,
          username,
          avatar,
          bio: u.bio || '',
          plan: u.plan || 'free',
          isVerified,
          game,
          viewers,
          isLive,
          hasCustomLive: Boolean(customYoutubeId),
          liveStreamUrl: customLiveUrl,
          youtubeId,
          tipUsername: username,
          isTelegramConnected,
          hasTelegramGroup,
          hasMasterKhqr,
          isTipConfigured,
          videoMinTipAmount,
          videoMaxDurationSeconds
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
