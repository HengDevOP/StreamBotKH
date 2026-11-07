import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../auth';

interface RateLimitRecord {
  timestamps: number[];
}

interface BlockedIpRecord {
  ip: string;
  reason: string;
  createdAt: number;
  expiresAt: number; // 0 means permanent block
  violationsCount: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const blockedIpStore = new Map<string, BlockedIpRecord>();

// Clean up stale rate limit and expired blocked IP entries every 3 minutes
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < 600000); // 10 minutes TTL
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }

    for (const [ip, block] of blockedIpStore.entries()) {
      if (block.expiresAt > 0 && now >= block.expiresAt) {
        console.log(`🛡️ [Security] Expired block lifted for IP: ${ip}`);
        blockedIpStore.delete(ip);
      }
    }
  }, 180000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Extract real client IP from incoming request (supports proxies, Cloudflare, Next.js, and Express)
 */
export function getClientIp(req: NextRequest | any): string {
  if (!req) return '127.0.0.1';

  // Standard NextRequest (headers.get)
  if (req.headers && typeof req.headers.get === 'function') {
    const cfIp = req.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();

    const realIp = req.headers.get('x-real-ip');
    if (realIp) return realIp.trim();

    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
  }

  // Express or Node standard request (headers object)
  if (req.headers && typeof req.headers === 'object') {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();

    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();

    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
      return forwarded[0].trim();
    }
  }

  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Checks whether an incoming request carries a valid signed JWT (authenticated Google customer).
 * Authenticated customers bypass external API rate limits.
 */
export function isRequestAuthenticated(req: NextRequest | any): boolean {
  if (!req) return false;
  try {
    let token: string | null = null;

    // 1. NextRequest headers.get
    if (req.headers && typeof req.headers.get === 'function') {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else {
        token =
          req.cookies?.get?.('streamneon_auth_token')?.value ||
          req.cookies?.get?.('token')?.value ||
          req.nextUrl?.searchParams?.get?.('token') ||
          null;
      }
    }

    // 2. Express / Node request headers
    if (!token && req.headers && typeof req.headers === 'object') {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (typeof req.headers.cookie === 'string') {
        const match = req.headers.cookie.match(/(?:^|;\s*)(?:streamneon_auth_token|token)=([^;]+)/);
        if (match && match[1]) {
          token = decodeURIComponent(match[1].trim());
        }
      }
      if (!token && req.query && typeof req.query.token === 'string') {
        token = req.query.token.trim();
      }
    }

    if (!token) return false;

    const decoded = jwt.verify(token, getJwtSecret()) as any;
    return Boolean(decoded && (decoded.id || decoded.email));
  } catch {
    return false;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks if a request by key/IP is allowed within the sliding window.
 *
 * @param key Unique key (e.g. `ip:1.2.3.4` or `tts:user123`)
 * @param maxLimit Maximum allowed hits within windowMs
 * @param windowMs Time window in milliseconds (e.g. 60000 for 1 minute)
 */
export function checkRateLimit(
  key: string,
  maxLimit: number = 30,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (record.timestamps.length >= maxLimit) {
    const oldest = record.timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxLimit - record.timestamps.length,
    retryAfterSeconds: 0
  };
}

/**
 * Check if an IP address is actively blocked
 */
export function isIpBlocked(ip: string): {
  blocked: boolean;
  reason?: string;
  retryAfterSeconds?: number;
} {
  if (!ip) return { blocked: false };
  const cleanIp = ip.trim();
  const record = blockedIpStore.get(cleanIp);
  if (!record) return { blocked: false };

  const now = Date.now();
  if (record.expiresAt > 0 && now >= record.expiresAt) {
    blockedIpStore.delete(cleanIp);
    return { blocked: false };
  }

  const retryAfterSeconds = record.expiresAt > 0
    ? Math.max(1, Math.ceil((record.expiresAt - now) / 1000))
    : 86400;

  return {
    blocked: true,
    reason: record.reason,
    retryAfterSeconds
  };
}

/**
 * Block an IP address for a specified duration
 *
 * @param ip Client IP address to block
 * @param reason Reason for the ban (e.g. "DDoS flood attempt", "Repeated brute force")
 * @param durationMs Ban duration in milliseconds (default: 15 minutes. Pass 0 for indefinite)
 */
export function blockIp(
  ip: string,
  reason: string,
  durationMs: number = 15 * 60 * 1000
): void {
  if (!ip) return;
  const cleanIp = ip.trim();
  // Never block localhost in development
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
    console.warn(`[RateLimit] Ignoring block request for localhost IP: ${cleanIp}`);
    return;
  }

  const now = Date.now();
  const existing = blockedIpStore.get(cleanIp);
  const violationsCount = (existing?.violationsCount || 0) + 1;
  const expiresAt = durationMs > 0 ? now + durationMs : 0;

  blockedIpStore.set(cleanIp, {
    ip: cleanIp,
    reason,
    createdAt: now,
    expiresAt,
    violationsCount
  });

  console.warn(`🚨 [Security Block] IP ${cleanIp} has been blocked (${Math.round(durationMs / 60000)}m). Reason: ${reason}`);
}

/**
 * Manually unblock an IP address
 */
export function unblockIp(ip: string): boolean {
  if (!ip) return false;
  return blockedIpStore.delete(ip.trim());
}

/**
 * Get all currently blocked IP records (for Admin dashboards)
 */
export function getAllBlockedIps(): BlockedIpRecord[] {
  const now = Date.now();
  const active: BlockedIpRecord[] = [];
  for (const [ip, record] of blockedIpStore.entries()) {
    if (record.expiresAt === 0 || now < record.expiresAt) {
      active.push(record);
    } else {
      blockedIpStore.delete(ip);
    }
  }
  return active;
}

/**
 * Express middleware for global rate limiting and IP abuse shielding
 */
export function globalRateLimiterMiddleware(options?: {
  windowMs?: number;
  maxRequests?: number;
  autoBanThreshold?: number;
}) {
  const windowMs = options?.windowMs ?? 60000; // 1 minute
  const maxRequests = options?.maxRequests ?? 180; // 180 req/min for general browsing & WebSocket heartbeats
  const autoBanThreshold = options?.autoBanThreshold ?? 350; // > 350 req/min triggers auto-ban

  return (req: any, res: any, next: any) => {
    // 1. Bypass static media files and fonts to keep streaming ultra fast
    const urlPath = req.path || req.originalUrl || '';
    if (
      urlPath.startsWith('/sounds/') ||
      urlPath.startsWith('/fonts/') ||
      urlPath.startsWith('/uploads/') ||
      urlPath.startsWith('/assets/') ||
      urlPath.startsWith('/_next/') ||
      urlPath === '/favicon.ico'
    ) {
      return next();
    }

    // 2. Bypass rate limiting for authenticated Google OAuth customers
    if (isRequestAuthenticated(req)) {
      return next();
    }

    const clientIp = getClientIp(req);

    // 2. Check if IP is actively blocked
    const blockStatus = isIpBlocked(clientIp);
    if (blockStatus.blocked) {
      res.setHeader('Retry-After', String(blockStatus.retryAfterSeconds || 900));
      return res.status(403).json({
        error: 'Forbidden: Access temporarily suspended due to security rate limit violations.',
        reason: blockStatus.reason,
        retryAfterSeconds: blockStatus.retryAfterSeconds
      });
    }

    // 3. Sliding window rate limit check
    const rlKey = `global:${clientIp}`;
    const result = checkRateLimit(rlKey, maxRequests, windowMs);

    // Standard rate limit response headers
    res.setHeader('RateLimit-Limit', String(maxRequests));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, result.remaining)));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      res.setHeader('RateLimit-Reset', String(result.retryAfterSeconds));

      // 4. Auto-ban aggressive flood attackers (> 350 req/min)
      const floodRecord = rateLimitStore.get(rlKey);
      if (floodRecord && floodRecord.timestamps.length >= autoBanThreshold) {
        blockIp(clientIp, `Automated DDoS flood protection (> ${autoBanThreshold} req/min)`, 15 * 60 * 1000);
      }

      return res.status(429).json({
        error: 'Too Many Requests: Traffic rate limit exceeded. Please slow down and try again shortly.',
        retryAfterSeconds: result.retryAfterSeconds
      });
    }

    next();
  };
}
