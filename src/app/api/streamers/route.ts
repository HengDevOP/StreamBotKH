import { NextRequest, NextResponse } from 'next/server';
import {
  getUsersCollection,
  getTelegramSessionsCollection,
  getTelegramMonitoredGroupsCollection,
  getGatewayConfigCollection,
  getVideoAlertSettingsCollection
} from '@/server/database/mongo';
import { extractYoutubeId, getYoutubeLiveStats, YoutubeLiveStats } from '@/utils/youtube';

export const dynamic = 'force-dynamic';

const STREAMERS_CACHE_TTL_MS = 20_000; // 20s warm cache across viewers
const YOUTUBE_STATS_TIMEOUT_MS = 2_800; // cap per-channel YouTube lookup latency
const YOUTUBE_CONCURRENCY = 6;

const DEFAULT_GAMES = [
  'Teamfight Tactics',
  'Mobile Legends: Bang Bang',
  'PUBG Mobile',
  'Valorant',
  'Free Fire',
  'League of Legends',
  'IRL Gaming & Chat'
];

interface CachedStreamersPayload {
  streamers: any[];
  cachedAt: number;
}

const globalForStreamersCache = globalThis as typeof globalThis & {
  __streamersRouteCache?: CachedStreamersPayload;
  __streamersInFlight?: Promise<CachedStreamersPayload>;
};

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchYoutubeStatsMap(videoIds: string[], bypassCache: boolean): Promise<Map<string, YoutubeLiveStats>> {
  const uniqueIds = Array.from(new Set(videoIds.filter(Boolean)));
  const result = new Map<string, YoutubeLiveStats>();
  if (uniqueIds.length === 0) return result;

  let cursor = 0;
  const workerCount = Math.min(YOUTUBE_CONCURRENCY, uniqueIds.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < uniqueIds.length) {
        const currentIndex = cursor++;
        const vid = uniqueIds[currentIndex];
        const stats = await withTimeout(
          getYoutubeLiveStats(vid, { bypassCache }),
          YOUTUBE_STATS_TIMEOUT_MS,
          { isLive: false, viewers: 0 }
        ).catch(() => ({ isLive: false, viewers: 0 }));
        result.set(vid, stats);
      }
    })
  );

  return result;
}

async function buildStreamersPayload(bypassYoutubeCache: boolean): Promise<CachedStreamersPayload> {
  let mongoUsers: any[] = [];
  try {
    const usersCol = await getUsersCollection();
    mongoUsers = await usersCol
      .find(
        { username: { $exists: true, $ne: '' } },
        {
          projection: {
            userId: 1,
            username: 1,
            displayName: 1,
            avatarUrl: 1,
            bio: 1,
            description: 1,
            plan: 1,
            isVerified: 1,
            isAdmin: 1,
            is_admin: 1,
            email: 1,
            createdAt: 1,
            liveStreamUrl: 1,
            youtubeLiveUrl: 1
          }
        }
      )
      .sort({ isVerified: -1, createdAt: -1 })
      .toArray();
  } catch (mongoErr) {
    console.warn('[/api/streamers] MongoDB query warning:', mongoErr);
  }

  const rows: any[] = [];
  if (mongoUsers && mongoUsers.length > 0) {
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
        is_admin: Boolean(u.isAdmin || u.is_admin),
        email: u.email || '',
        created_at: u.createdAt,
        liveStreamUrl: u.liveStreamUrl || u.youtubeLiveUrl || ''
      });
    }
  }

  // Batch query tip configuration states & YouTube video stats in parallel
  const connectedStreamerIds = new Set<string>();
  const groupStreamerIds = new Set<string>();
  const khqrStreamerIds = new Set<string>();
  const videoMaxDurationMap = new Map<string, number>();
  const videoMinTipMap = new Map<string, number>();
  const videoEnabledMap = new Map<string, boolean>();

  const extractedYoutubeIds = rows.map((u) => extractYoutubeId(u.liveStreamUrl || '') || '');

  const [, ytStatsMap] = await Promise.all([
    (async () => {
      try {
        const [sessionsCol, groupsCol, gatewayCol, videoCol] = await Promise.all([
          getTelegramSessionsCollection(),
          getTelegramMonitoredGroupsCollection(),
          getGatewayConfigCollection(),
          getVideoAlertSettingsCollection()
        ]);

        const [sessions, groups, configs, videoSettings] = await Promise.all([
          sessionsCol
            .find(
              { isConnected: true, sessionString: { $exists: true, $ne: '' } },
              { projection: { streamerId: 1 } }
            )
            .toArray(),
          groupsCol.find({}, { projection: { streamerId: 1 } }).toArray(),
          gatewayCol
            .find(
              { khqrImageUrl: { $exists: true, $ne: '' } },
              { projection: { streamerId: 1 } }
            )
            .toArray(),
          videoCol
            .find(
              {},
              {
                projection: {
                  streamerId: 1,
                  maxDurationSeconds: 1,
                  max_duration_seconds: 1,
                  minTipAmount: 1,
                  min_tip_amount: 1,
                  isEnabled: 1,
                  is_enabled: 1
                }
              }
            )
            .toArray()
        ]);

        for (const s of sessions) {
          if (s.streamerId) connectedStreamerIds.add(String(s.streamerId).toLowerCase());
        }
        for (const g of groups) {
          if (g.streamerId) groupStreamerIds.add(String(g.streamerId).toLowerCase());
        }
        for (const c of configs) {
          if (c.streamerId) khqrStreamerIds.add(String(c.streamerId).toLowerCase());
        }
        for (const v of videoSettings) {
          if (v.streamerId) {
            const key = String(v.streamerId).toLowerCase();
            const maxDur = Number(v.maxDurationSeconds ?? (v as any).max_duration_seconds ?? 300);
            const minTip = Number(v.minTipAmount ?? (v as any).min_tip_amount ?? 2.0);
            videoMaxDurationMap.set(key, maxDur);
            videoMinTipMap.set(key, minTip);
            videoEnabledMap.set(key, Boolean(v.isEnabled ?? (v as any).is_enabled ?? true));
          }
        }
      } catch (e) {
        console.warn('[/api/streamers] Tip configuration batch check warning:', e);
      }
    })(),
    fetchYoutubeStatsMap(extractedYoutubeIds, bypassYoutubeCache)
  ]);

  const streamers = rows.map((u, idx) => {
    const username = u.username || `streamer_${String(u.id).slice(0, 6)}`;
    const name = u.display_name || u.displayName || username;
    const avatar =
      u.avatar_url ||
      u.avatarUrl ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
    const isVerified = u.is_verified === 1 || Boolean(u.is_verified);
    const game = DEFAULT_GAMES[idx % DEFAULT_GAMES.length];

    const customLiveUrl = u.liveStreamUrl || '';
    const customYoutubeId = extractedYoutubeIds[idx];
    const stats = customYoutubeId ? ytStatsMap.get(customYoutubeId) : undefined;
    const isLive = Boolean(stats?.isLive);
    const youtubeId = customYoutubeId || '';
    const viewers = isLive ? (stats?.viewers || 0) : 0;

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

    const streamerPlan = String(u.plan || 'free').toLowerCase();
    const isStreamerAdmin = Boolean(
      u.is_admin ||
      u.isAdmin ||
      (u.email && String(u.email).trim().toLowerCase() === 'hchenheng@gmail.com')
    );
    const isVideoAlertsUnlocked = streamerPlan !== 'free' || isStreamerAdmin;
    const isVideoSettingEnabled = videoEnabledMap.get(uidLower) ?? videoEnabledMap.get(unameLower) ?? true;
    const videoAlertEnabled = isVideoAlertsUnlocked && isVideoSettingEnabled;

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
      videoAlertEnabled,
      hasVideoOverlay: videoAlertEnabled,
      videoMinTipAmount,
      videoMaxDurationSeconds
    };
  });

  // Sort active LIVE streamers to the top, then by view count
  streamers.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return b.viewers - a.viewers;
  });

  return {
    streamers,
    cachedAt: Date.now()
  };
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl?.searchParams;
    const forceRefresh = searchParams?.get('refresh') === '1' || searchParams?.get('fresh') === '1';
    const filterUsername = searchParams?.get('username')?.trim().toLowerCase() || '';

    const cached = globalForStreamersCache.__streamersRouteCache;
    const isCacheFresh = Boolean(cached && Date.now() - cached.cachedAt < STREAMERS_CACHE_TTL_MS);

    let payload: CachedStreamersPayload;
    let cacheStatus: 'HIT' | 'MISS' | 'BYPASS';

    if (!forceRefresh && isCacheFresh && cached) {
      payload = cached;
      cacheStatus = 'HIT';
    } else {
      cacheStatus = forceRefresh ? 'BYPASS' : 'MISS';
      if (forceRefresh || !globalForStreamersCache.__streamersInFlight) {
        const pending = buildStreamersPayload(forceRefresh)
          .then((fresh) => {
            globalForStreamersCache.__streamersRouteCache = fresh;
            return fresh;
          })
          .finally(() => {
            if (globalForStreamersCache.__streamersInFlight === pending) {
              globalForStreamersCache.__streamersInFlight = undefined;
            }
          });
        globalForStreamersCache.__streamersInFlight = pending;
        payload = await pending;
      } else {
        payload = await globalForStreamersCache.__streamersInFlight;
      }
    }

    const resultStreamers = filterUsername
      ? payload.streamers.filter(
          (s) => s.username.toLowerCase() === filterUsername || s.id.toLowerCase() === filterUsername
        )
      : payload.streamers;

    return NextResponse.json(
      {
        success: true,
        count: resultStreamers.length,
        cachedAt: payload.cachedAt,
        streamers: resultStreamers
      },
      {
        headers: {
          'Cache-Control': forceRefresh
            ? 'no-store'
            : 'public, max-age=10, stale-while-revalidate=30',
          'X-Streamers-Cache': cacheStatus
        }
      }
    );
  } catch (err: any) {
    console.error('[/api/streamers] Fatal error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load streamers', streamers: [] },
      { status: 500 }
    );
  }
}
