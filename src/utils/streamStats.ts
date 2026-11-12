import { extractYoutubeId, getYoutubeLiveStats } from './youtube';

export interface PlatformLiveStat {
  platform: 'youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick';
  isLive: boolean;
  viewers: number;
}

// In-memory cache for Twitch & Kick to avoid spamming external endpoints
const twitchCache = new Map<string, { viewers: number; isLive: boolean; checkedAt: number }>();
const kickCache = new Map<string, { viewers: number; isLive: boolean; checkedAt: number }>();

const CACHE_TTL_MS = 10 * 1000; // 10 seconds

export function extractTwitchUsername(urlOrName?: string | null): string | null {
  if (!urlOrName || typeof urlOrName !== 'string') return null;
  const trimmed = urlOrName.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_]{2,30}$/.test(trimmed) && !trimmed.includes('.')) {
    return trimmed.toLowerCase();
  }
  const match = trimmed.match(/(?:twitch\.tv\/)([a-zA-Z0-9_]{2,30})/i);
  return match ? match[1].toLowerCase() : null;
}

export function extractKickUsername(urlOrName?: string | null): string | null {
  if (!urlOrName || typeof urlOrName !== 'string') return null;
  const trimmed = urlOrName.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{2,35}$/.test(trimmed) && !trimmed.includes('.')) {
    return trimmed.toLowerCase();
  }
  const match = trimmed.match(/(?:kick\.com\/)([a-zA-Z0-9_-]{2,35})/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Fetch real concurrent live viewers for a Twitch channel via Twitch GQL endpoint.
 */
export async function getTwitchLiveStats(channelOrUrl: string): Promise<{ isLive: boolean; viewers: number }> {
  const username = extractTwitchUsername(channelOrUrl);
  if (!username) return { isLive: false, viewers: 0 };

  const cached = twitchCache.get(username);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return { isLive: cached.isLive, viewers: cached.viewers };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: {
        'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `query { user(login: "${username}") { stream { viewersCount } } }`
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: any = await res.json();
      const stream = data?.data?.user?.stream;
      if (stream && typeof stream.viewersCount === 'number') {
        const viewers = Math.max(0, stream.viewersCount);
        twitchCache.set(username, { isLive: true, viewers, checkedAt: Date.now() });
        return { isLive: true, viewers };
      }
    }
    twitchCache.set(username, { isLive: false, viewers: 0, checkedAt: Date.now() });
    return { isLive: false, viewers: 0 };
  } catch {
    return cached ? { isLive: cached.isLive, viewers: cached.viewers } : { isLive: false, viewers: 0 };
  }
}

/**
 * Fetch real concurrent live viewers for a Kick.com channel via Kick API.
 */
export async function getKickLiveStats(channelOrUrl: string): Promise<{ isLive: boolean; viewers: number }> {
  const username = extractKickUsername(channelOrUrl);
  if (!username) return { isLive: false, viewers: 0 };

  const cached = kickCache.get(username);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return { isLive: cached.isLive, viewers: cached.viewers };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://kick.com/api/v2/channels/${username}/livestream`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: any = await res.json();
      const liveData = data?.data;
      if (liveData && (liveData.is_live === true || typeof liveData.viewers === 'number')) {
        const viewers = Math.max(0, Number(liveData.viewers) || 0);
        kickCache.set(username, { isLive: true, viewers, checkedAt: Date.now() });
        return { isLive: true, viewers };
      }
    }
    kickCache.set(username, { isLive: false, viewers: 0, checkedAt: Date.now() });
    return { isLive: false, viewers: 0 };
  } catch {
    return cached ? { isLive: cached.isLive, viewers: cached.viewers } : { isLive: false, viewers: 0 };
  }
}

/**
 * Aggregates live concurrent viewers from all configured broadcast channel URLs
 * for the ticked platforms.
 */
export async function aggregateBroadcastChannelViewers(
  broadcastUrls: {
    youtube?: string;
    twitch?: string;
    tiktok?: string;
    facebook?: string;
    kick?: string;
  },
  enabledPlatforms: ('youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick')[],
  manualViewersFallback = 0
): Promise<{
  totalViewers: number;
  isLive: boolean;
  platformViewers: Record<string, number>;
  platformLiveStatus: Record<string, boolean>;
}> {
  const platformViewers: Record<string, number> = {};
  const platformLiveStatus: Record<string, boolean> = {};

  const promises: Promise<void>[] = [];

  // 1. YouTube
  if (enabledPlatforms.includes('youtube') && broadcastUrls?.youtube) {
    promises.push(
      (async () => {
        const ytId = extractYoutubeId(broadcastUrls.youtube);
        if (ytId) {
          try {
            const stats = await getYoutubeLiveStats(ytId);
            platformLiveStatus.youtube = stats.isLive;
            platformViewers.youtube = stats.isLive ? stats.viewers : 0;
          } catch {
            platformLiveStatus.youtube = false;
            platformViewers.youtube = 0;
          }
        }
      })()
    );
  }

  // 2. Twitch
  if (enabledPlatforms.includes('twitch') && broadcastUrls?.twitch) {
    promises.push(
      (async () => {
        try {
          const stats = await getTwitchLiveStats(broadcastUrls.twitch!);
          platformLiveStatus.twitch = stats.isLive;
          platformViewers.twitch = stats.isLive ? stats.viewers : 0;
        } catch {
          platformLiveStatus.twitch = false;
          platformViewers.twitch = 0;
        }
      })()
    );
  }

  // 3. Kick
  if (enabledPlatforms.includes('kick') && broadcastUrls?.kick) {
    promises.push(
      (async () => {
        try {
          const stats = await getKickLiveStats(broadcastUrls.kick!);
          platformLiveStatus.kick = stats.isLive;
          platformViewers.kick = stats.isLive ? stats.viewers : 0;
        } catch {
          platformLiveStatus.kick = false;
          platformViewers.kick = 0;
        }
      })()
    );
  }

  // Await all parallel channel checks
  await Promise.all(promises);

  let realConcurrentSum = 0;
  let anyLive = false;

  for (const pid of enabledPlatforms) {
    const count = platformViewers[pid] || 0;
    if (count > 0 || platformLiveStatus[pid]) {
      anyLive = true;
      realConcurrentSum += count;
    }
  }

  // If real live streams are detected, use real concurrent viewers
  let totalViewers = realConcurrentSum;

  // Fallback to manual viewers if channels are not currently broadcasting live
  if (totalViewers === 0 && manualViewersFallback > 0) {
    totalViewers = manualViewersFallback;
  }

  return {
    totalViewers,
    isLive: anyLive,
    platformViewers,
    platformLiveStatus
  };
}
