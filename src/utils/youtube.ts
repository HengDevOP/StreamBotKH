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

export interface YoutubeLiveStats {
  isLive: boolean;
  viewers: number;
}

const liveStatsCache = new Map<string, { isLive: boolean; viewers: number; checkedAt: number }>();
const CACHE_TTL_MS = 10 * 1000; // 10 seconds in-memory cache for fast live updates

function parseSafeViewers(raw?: string | number | null): number {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
  if (!raw || typeof raw !== 'string') return 0;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Fetches live status and real-time concurrent viewer count ("watching now") for a YouTube video ID.
 * Uses YouTube's lightweight updated_metadata endpoint with watch-page fallback.
 */
export async function getYoutubeLiveStats(
  videoId: string,
  options?: { bypassCache?: boolean }
): Promise<YoutubeLiveStats> {
  if (!videoId || typeof videoId !== 'string') return { isLive: false, viewers: 0 };
  const cleanId = videoId.trim();
  if (!cleanId) return { isLive: false, viewers: 0 };

  const cached = liveStatsCache.get(cleanId);
  if (!options?.bypassCache && cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return { isLive: cached.isLive, viewers: cached.viewers };
  }

  // 1. Primary fast lookup via YouTube updated_metadata endpoint (~150ms JSON payload)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://www.youtube.com/youtubei/v1/updated_metadata?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240726.00.00',
            hl: 'en',
            gl: 'US'
          }
        },
        videoId: cleanId
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: any = await res.json();
      const actions: any[] = Array.isArray(data?.actions) ? data.actions : [];
      const viewAction = actions.find((a) => a?.updateViewershipAction)?.updateViewershipAction;
      const renderer = viewAction?.viewCount?.videoViewCountRenderer;

      if (renderer) {
        const viewText =
          renderer.viewCount?.simpleText ||
          (Array.isArray(renderer.viewCount?.runs)
            ? renderer.viewCount.runs.map((r: any) => r?.text || '').join('')
            : '');

        const isWaiting = /\bwaiting\b/i.test(viewText);
        const isLive = Boolean(renderer.isLive === true && !isWaiting);

        let viewers = 0;
        if (isLive) {
          viewers =
            parseSafeViewers(renderer.originalViewCount) ||
            parseSafeViewers(renderer.unlabeledViewCountValue?.simpleText) ||
            parseSafeViewers(viewText.match(/([\d,]+)\s+watching/i)?.[1]);
        }

        liveStatsCache.set(cleanId, { isLive, viewers, checkedAt: Date.now() });
        return { isLive, viewers };
      }
    }
  } catch {
    // Fall through to HTML watch page fallback
  }

  // 2. Fallback: fetch watch HTML page directly
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
      liveStatsCache.set(cleanId, { isLive: false, viewers: 0, checkedAt: Date.now() });
      return { isLive: false, viewers: 0 };
    }

    const html = await res.text();
    const isLive =
      (html.includes('"isLiveNow":true') || html.includes('"isLive":true')) &&
      !html.includes('"isLiveNow":false');

    let viewers = 0;
    if (isLive) {
      const watchingMatch =
        html.match(/"concurrentViewers":"(\d+)"/) ||
        html.match(/"runs":\[\{"text":"([\d,]+)"\},\{"text":" watching now"\}\]/) ||
        html.match(/([\d,]+)\s+watching now/i) ||
        html.match(/"videoViewCountRenderer":\{[^}]*"originalViewCount":"(\d+)"/);
      if (watchingMatch && watchingMatch[1]) {
        viewers = parseSafeViewers(watchingMatch[1]);
      }
    }

    liveStatsCache.set(cleanId, { isLive, viewers, checkedAt: Date.now() });
    return { isLive, viewers };
  } catch {
    return cached ? { isLive: cached.isLive, viewers: cached.viewers } : { isLive: false, viewers: 0 };
  }
}

/**
 * Checks whether a given YouTube video ID is currently streaming live.
 * Returns true only if the live broadcast is actively streaming now.
 */
export async function checkYoutubeLiveStatus(videoId: string): Promise<boolean> {
  const stats = await getYoutubeLiveStats(videoId);
  return stats.isLive;
}
