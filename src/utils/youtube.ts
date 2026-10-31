/**
 * Helper to extract YouTube video ID from various YouTube URLs or raw video IDs.
 * Supports:
 * - https://www.youtube.com/watch?v=ID
 * - https://www.youtube.com/live/ID
 * - https://youtu.be/ID
 * - https://www.youtube.com/embed/ID
 * - Raw 11-char ID
 */
export function extractYoutubeId(urlOrId?: string | null): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const str = urlOrId.trim();
  if (!str) return null;

  // Raw 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // /live/ID
  const liveMatch = str.match(/(?:youtube\.com|youtube-nocookie\.com)\/live\/([a-zA-Z0-9_-]{11})/i);
  if (liveMatch && liveMatch[1]) return liveMatch[1];

  // ?v=ID or &v=ID
  const watchMatch = str.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // youtu.be/ID
  const shortMatch = str.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // /embed/ID
  const embedMatch = str.match(/(?:youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // /v/ID
  const vMatch = str.match(/(?:youtube\.com|youtube-nocookie\.com)\/v\/([a-zA-Z0-9_-]{11})/i);
  if (vMatch && vMatch[1]) return vMatch[1];

  return null;
}

const liveCache = new Map<string, { isLive: boolean; checkedAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds in-memory cache

/**
 * Checks whether a given YouTube video ID is currently streaming live.
 * Returns true only if the live broadcast is actively streaming now.
 */
export async function checkYoutubeLiveStatus(videoId: string): Promise<boolean> {
  if (!videoId || typeof videoId !== 'string') return false;
  const cleanId = videoId.trim();
  if (!cleanId) return false;

  const cached = liveCache.get(cleanId);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached.isLive;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://www.youtube.com/watch?v=${cleanId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      liveCache.set(cleanId, { isLive: false, checkedAt: Date.now() });
      return false;
    }

    const html = await res.text();
    // Live stream in progress has "isLiveNow":true or "isLive":true and not "isLiveNow":false
    const isLive =
      (html.includes('"isLiveNow":true') || html.includes('"isLive":true')) &&
      !html.includes('"isLiveNow":false');

    liveCache.set(cleanId, { isLive, checkedAt: Date.now() });
    return isLive;
  } catch {
    return cached ? cached.isLive : false;
  }
}
