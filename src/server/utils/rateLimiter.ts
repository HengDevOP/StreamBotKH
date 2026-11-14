import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getJwtSecret } from '../auth';
import { isAdminEmail } from '../database/db';
import {
  getSessionLogsCollection,
  getBlockedIpsCollection,
  getTrackedIpsCollection,
  getUsersCollection,
  getDailyLogDateKey,
  pruneOldSessionLogsMongo,
  SessionLogDoc,
  BlockedIpDoc
} from '../database/mongo';

interface RateLimitRecord {
  timestamps: number[];
}

export interface BlockedIpRecord {
  ip: string;
  reason: string;
  blockedBy?: string;
  createdAt: number;
  expiresAt: number; // 0 means permanent block
  violationsCount: number;
  associatedUserId?: string | null;
  associatedUsername?: string | null;
  associatedEmail?: string | null;
}

export interface TrackedIpSummary {
  ip: string;
  totalRequests: number;
  peakRps: number;
  currentRps: number;
  warningCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastPath: string;
  lastMethod: string;
  userAgent: string;
  userIds: string[];
  usernames: string[];
  emails: string[];
  isBlocked: boolean;
  blockReason?: string;
  blockExpiresAt?: number;
}

const gSecurity = globalThis as unknown as {
  __rateLimitStore?: Map<string, RateLimitRecord>;
  __rpsSlidingWindowStore?: Map<string, number[]>;
  __blockedIpStore?: Map<string, BlockedIpRecord>;
  __lastBlockedIpsSyncMs?: number;
  __blockedIpsSyncPromise?: Promise<void> | null;
  __onIpBlockedCallbacks?: Array<(ip: string, reason: string) => void>;
};

const rateLimitStore = (gSecurity.__rateLimitStore ??= new Map<string, RateLimitRecord>());
const rpsSlidingWindowStore = (gSecurity.__rpsSlidingWindowStore ??= new Map<string, number[]>());
const blockedIpStore = (gSecurity.__blockedIpStore ??= new Map<string, BlockedIpRecord>());
const onIpBlockedCallbacks = (gSecurity.__onIpBlockedCallbacks ??= []);

export function registerOnIpBlockedCallback(cb: (ip: string, reason: string) => void) {
  if (!onIpBlockedCallbacks.includes(cb)) {
    onIpBlockedCallbacks.push(cb);
  }
}

export async function hydrateBlockedIpsFromMongo(force: boolean = false) {
  const now = Date.now();
  const lastSync = gSecurity.__lastBlockedIpsSyncMs || 0;
  if (!force && now - lastSync < 2000) return;

  if (gSecurity.__blockedIpsSyncPromise) {
    return gSecurity.__blockedIpsSyncPromise;
  }

  gSecurity.__blockedIpsSyncPromise = (async () => {
    try {
      const col = await getBlockedIpsCollection();
      const docs = await col.find({}).toArray();
      const freshMap = new Map<string, BlockedIpRecord>();
      const checkTime = Date.now();

      for (const d of docs) {
        const clean = normalizeIp(d.ip);
        if (d.expiresAt === 0 || d.expiresAt > checkTime) {
          freshMap.set(clean, {
            ip: clean,
            reason: d.reason || 'Blocked by Admin',
            blockedBy: d.blockedBy || 'admin',
            createdAt: d.createdAt || checkTime,
            expiresAt: d.expiresAt ?? 0,
            violationsCount: d.violationsCount || 1,
            associatedUserId: d.associatedUserId || null,
            associatedUsername: d.associatedUsername || null,
            associatedEmail: d.associatedEmail || null
          });
        } else {
          col.deleteOne({ ip: d.ip }).catch(() => {});
        }
      }

      blockedIpStore.clear();
      for (const [k, v] of freshMap.entries()) {
        blockedIpStore.set(k, v);
      }
      gSecurity.__lastBlockedIpsSyncMs = Date.now();
    } catch {
      // Ignore before mongo connect
    } finally {
      gSecurity.__blockedIpsSyncPromise = null;
    }
  })();

  return gSecurity.__blockedIpsSyncPromise;
}

// Clean up stale rate limit and expired blocked IP entries every 3 minutes
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 600000); // 10 minutes TTL
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }

    for (const [ip, timestamps] of rpsSlidingWindowStore.entries()) {
      const recent = timestamps.filter((ts) => now - ts < 5000);
      if (recent.length === 0) {
        rpsSlidingWindowStore.delete(ip);
      } else {
        rpsSlidingWindowStore.set(ip, recent);
      }
    }

    for (const [ip, block] of blockedIpStore.entries()) {
      if (block.expiresAt > 0 && now >= block.expiresAt) {
        console.log(`🛡️ [Security] Expired block lifted for IP: ${ip}`);
        blockedIpStore.delete(ip);
        getBlockedIpsCollection()
          .then((col) => col.deleteOne({ ip }))
          .catch(() => {});
      }
    }
  }, 180000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

export function normalizeIp(rawIp: string): string {
  if (!rawIp) return '127.0.0.1';
  let trimmed = String(rawIp).trim();
  if (trimmed === '::1' || trimmed === '[::1]') return '127.0.0.1';
  if (trimmed.startsWith('::ffff:')) trimmed = trimmed.slice(7);
  // Strip IPv4 :port suffix (e.g. 192.168.1.5:51234 -> 192.168.1.5)
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(trimmed)) {
    trimmed = trimmed.split(':')[0];
  }
  return trimmed || '127.0.0.1';
}

/**
 * Extract real client IP from incoming request (supports proxies, Cloudflare, Next.js, and Express)
 */
export function getClientIp(req: NextRequest | any): string {
  if (!req) return '127.0.0.1';

  // Standard NextRequest (headers.get)
  if (req.headers && typeof req.headers.get === 'function') {
    const cfIp = req.headers.get('cf-connecting-ip');
    if (cfIp) return normalizeIp(cfIp);

    const realIp = req.headers.get('x-real-ip');
    if (realIp) return normalizeIp(realIp);

    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      return normalizeIp(forwarded.split(',')[0]);
    }
  }

  // Express or Node standard request (headers object)
  if (req.headers && typeof req.headers === 'object') {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) return normalizeIp(cfIp);

    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) return normalizeIp(realIp);

    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return normalizeIp(forwarded.split(',')[0]);
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
      return normalizeIp(forwarded[0]);
    }
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || '127.0.0.1');
}

export function getClientUserAgent(req: NextRequest | any): string {
  if (!req || !req.headers) return 'Unknown';
  if (typeof req.headers.get === 'function') {
    return req.headers.get('user-agent') || 'Unknown';
  }
  if (typeof req.headers === 'object') {
    const ua = req.headers['user-agent'] || req.headers['User-Agent'];
    return typeof ua === 'string' ? ua : 'Unknown';
  }
  return 'Unknown';
}

/**
 * Extracts decoded JWT user info if present on the request
 */
export function extractRequestUser(req: NextRequest | any): {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
} | null {
  if (!req) return null;
  try {
    let token: string | null = null;

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

    if (!token && req.auth && typeof req.auth.token === 'string' && req.auth.token.trim()) {
      token = req.auth.token.trim();
    }

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

    if (!token) return null;

    const decoded = jwt.verify(token, getJwtSecret()) as any;
    if (!decoded || (!decoded.id && !decoded.email)) return null;
    const email = String(decoded.email || '').trim();
    return {
      id: String(decoded.id || ''),
      username: String(decoded.username || ''),
      email,
      isAdmin: isAdminEmail(email)
    };
  } catch {
    return null;
  }
}

/**
 * Checks whether an incoming request carries a valid signed JWT (authenticated Google customer).
 */
export function isRequestAuthenticated(req: NextRequest | any): boolean {
  return Boolean(extractRequestUser(req));
}

const gAdminPresence = globalThis as unknown as {
  __adminHttpLastSeenMap?: Map<string, number>;
};

export function recordAdminHeartbeat(userId?: string | null, email?: string | null) {
  const map = (gAdminPresence.__adminHttpLastSeenMap ??= new Map<string, number>());
  const now = Date.now();
  if (userId) map.set(`id:${userId}`, now);
  if (email) map.set(`email:${email.trim().toLowerCase()}`, now);
}

export function getRecentHttpActiveAdminKeys(withinMs: number = 90000): {
  userIds: Set<string>;
  emails: Set<string>;
} {
  const map = gAdminPresence.__adminHttpLastSeenMap;
  const userIds = new Set<string>();
  const emails = new Set<string>();
  if (!map) return { userIds, emails };

  const cutoff = Date.now() - withinMs;
  for (const [k, ts] of map.entries()) {
    if (ts < cutoff) {
      map.delete(k);
      continue;
    }
    if (k.startsWith('id:')) userIds.add(k.slice(3));
    else if (k.startsWith('email:')) emails.add(k.slice(6));
  }
  return { userIds, emails };
}

/**
 * Records a hit for 1-second RPS calculation and returns current requests per second for this IP.
 * Threshold warning is triggered when > 20 requests per second.
 */
export function recordIpHitAndGetRps(ip: string): { rps: number; isHighRateWarning: boolean } {
  const cleanIp = normalizeIp(ip);
  const now = Date.now();
  let timestamps = rpsSlidingWindowStore.get(cleanIp);
  if (!timestamps) {
    timestamps = [];
  }
  // Keep hits within the last 1000ms (1 second)
  const oneSecAgo = now - 1000;
  const activeTimestamps = timestamps.filter((ts) => ts > oneSecAgo);
  activeTimestamps.push(now);
  rpsSlidingWindowStore.set(cleanIp, activeTimestamps);

  const rps = activeTimestamps.length;
  return {
    rps,
    isHighRateWarning: rps > 20
  };
}

export function getCurrentIpRps(ip: string): number {
  const cleanIp = normalizeIp(ip);
  const now = Date.now();
  const timestamps = rpsSlidingWindowStore.get(cleanIp);
  if (!timestamps) return 0;
  return timestamps.filter((ts) => ts > now - 1000).length;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks if a request by key/IP is allowed within the sliding window.
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
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

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
  expiresAt?: number;
} {
  if (!ip) return { blocked: false };
  const cleanIp = normalizeIp(ip);
  const record = blockedIpStore.get(cleanIp);
  if (!record) return { blocked: false };

  const now = Date.now();
  if (record.expiresAt > 0 && now >= record.expiresAt) {
    blockedIpStore.delete(cleanIp);
    getBlockedIpsCollection()
      .then((col) => col.deleteOne({ ip: cleanIp }))
      .catch(() => {});
    return { blocked: false };
  }

  const retryAfterSeconds =
    record.expiresAt > 0
      ? Math.max(1, Math.ceil((record.expiresAt - now) / 1000))
      : 0; // 0 = permanent

  return {
    blocked: true,
    reason: record.reason,
    retryAfterSeconds,
    expiresAt: record.expiresAt
  };
}

/**
 * Async check against MongoDB-backed blocked IP list (with short-TTL global cache sync)
 */
export async function isIpBlockedAsync(ip: string): Promise<{
  blocked: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  expiresAt?: number;
}> {
  if (!ip) return { blocked: false };
  await hydrateBlockedIpsFromMongo(false);
  return isIpBlocked(ip);
}

/**
 * Block an IP address for a specified duration (or permanently if durationMs = 0), awaiting MongoDB persistence
 */
export async function blockIpAsync(
  ip: string,
  reason: string = 'Blocked by Administrator',
  durationMs: number = 0,
  options?: {
    blockedBy?: string;
    allowLocalhost?: boolean;
    associatedUserId?: string | null;
    associatedUsername?: string | null;
    associatedEmail?: string | null;
  }
): Promise<BlockedIpRecord | null> {
  if (!ip) return null;
  const cleanIp = normalizeIp(ip);

  const isLocal = cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost';
  if (isLocal && !options?.allowLocalhost) {
    console.warn(`[RateLimit] Ignoring automated block request for localhost IP: ${cleanIp}`);
    return null;
  }

  const now = Date.now();
  await hydrateBlockedIpsFromMongo(false);
  const existing = blockedIpStore.get(cleanIp);
  const violationsCount = (existing?.violationsCount || 0) + 1;
  const expiresAt = durationMs > 0 ? now + durationMs : 0;

  let trackedUserId: string | null = options?.associatedUserId || existing?.associatedUserId || null;
  let trackedUsername: string | null = options?.associatedUsername || existing?.associatedUsername || null;
  let trackedEmail: string | null = options?.associatedEmail || existing?.associatedEmail || null;

  try {
    const trackedCol = await getTrackedIpsCollection();
    const trackedDoc = await trackedCol.findOne({ ip: cleanIp });
    if (trackedDoc) {
      trackedUserId = trackedUserId || trackedDoc.userIds?.[0] || null;
      trackedUsername = trackedUsername || trackedDoc.usernames?.[0] || null;
      trackedEmail = trackedEmail || trackedDoc.emails?.[0] || null;
    }
  } catch {
    // Non-fatal
  }

  const record: BlockedIpRecord = {
    ip: cleanIp,
    reason: reason || 'Blocked by Administrator',
    blockedBy: options?.blockedBy || 'admin',
    createdAt: now,
    expiresAt,
    violationsCount,
    associatedUserId: trackedUserId,
    associatedUsername: trackedUsername,
    associatedEmail: trackedEmail
  };

  blockedIpStore.set(cleanIp, record);
  gSecurity.__lastBlockedIpsSyncMs = Date.now();

  try {
    const col = await getBlockedIpsCollection();
    await col.updateOne({ ip: cleanIp }, { $set: record }, { upsert: true });
  } catch (err) {
    console.warn('[RateLimit] Failed to persist blocked IP in MongoDB:', err);
  }

  // Disconnect any active WebSocket connections for this IP immediately
  for (const cb of onIpBlockedCallbacks) {
    try {
      cb(cleanIp, record.reason);
    } catch {
      // Ignore callback error
    }
  }

  // Record a SECURITY_BLOCK session log entry in MongoDB
  recordSessionLog({
    eventType: 'SECURITY_BLOCK',
    action: `IP Address Blocked (${expiresAt === 0 ? 'Permanent' : `${Math.round(durationMs / 60000)}m`})`,
    method: 'BLOCK',
    path: '/admin/security/block',
    statusCode: 403,
    ip: cleanIp,
    userId: record.associatedUserId,
    username: record.associatedUsername,
    userEmail: record.associatedEmail,
    requestsPerSecond: getCurrentIpRps(cleanIp),
    isHighRateWarning: getCurrentIpRps(cleanIp) > 20,
    details: reason
  });

  console.warn(
    `🚨 [Security Block] IP ${cleanIp} has been blocked (${
      expiresAt === 0 ? 'PERMANENT' : `${Math.round(durationMs / 60000)}m`
    }). Reason: ${reason}`
  );

  return record;
}

/**
 * Synchronous wrapper for automated rate limiter paths (fires Mongo persistence in background)
 */
export function blockIp(
  ip: string,
  reason: string = 'Blocked by Administrator',
  durationMs: number = 0,
  options?: {
    blockedBy?: string;
    allowLocalhost?: boolean;
    associatedUserId?: string | null;
    associatedUsername?: string | null;
    associatedEmail?: string | null;
  }
): BlockedIpRecord | null {
  if (!ip) return null;
  const cleanIp = normalizeIp(ip);

  const isLocal = cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost';
  if (isLocal && !options?.allowLocalhost) {
    console.warn(`[RateLimit] Ignoring automated block request for localhost IP: ${cleanIp}`);
    return null;
  }

  const now = Date.now();
  const existing = blockedIpStore.get(cleanIp);
  const violationsCount = (existing?.violationsCount || 0) + 1;
  const expiresAt = durationMs > 0 ? now + durationMs : 0;

  const syncRecord: BlockedIpRecord = {
    ip: cleanIp,
    reason: reason || 'Blocked by Administrator',
    blockedBy: options?.blockedBy || 'admin',
    createdAt: now,
    expiresAt,
    violationsCount,
    associatedUserId: options?.associatedUserId || existing?.associatedUserId || null,
    associatedUsername: options?.associatedUsername || existing?.associatedUsername || null,
    associatedEmail: options?.associatedEmail || existing?.associatedEmail || null
  };

  blockedIpStore.set(cleanIp, syncRecord);
  gSecurity.__lastBlockedIpsSyncMs = Date.now();
  blockIpAsync(cleanIp, reason, durationMs, options).catch(() => {});
  return syncRecord;
}

/**
 * Manually unblock an IP address (awaited MongoDB removal)
 */
export async function unblockIpAsync(ip: string): Promise<boolean> {
  if (!ip) return false;
  const cleanIp = normalizeIp(ip);
  const existedInMem = blockedIpStore.delete(cleanIp);
  let existedInDb = false;

  try {
    const col = await getBlockedIpsCollection();
    const res = await col.deleteOne({ ip: cleanIp });
    existedInDb = (res.deletedCount || 0) > 0;
    gSecurity.__lastBlockedIpsSyncMs = Date.now();
  } catch {
    // Non-fatal
  }

  recordSessionLog({
    eventType: 'AUTH_ACTION',
    action: 'IP Address Unblocked by Admin',
    method: 'UNBLOCK',
    path: '/admin/security/unblock',
    statusCode: 200,
    ip: cleanIp,
    requestsPerSecond: getCurrentIpRps(cleanIp),
    isHighRateWarning: false,
    details: `IP ${cleanIp} unblocked and restored access.`
  });

  return existedInMem || existedInDb;
}

export function unblockIp(ip: string): boolean {
  if (!ip) return false;
  const cleanIp = normalizeIp(ip);
  const existed = blockedIpStore.delete(cleanIp);
  gSecurity.__lastBlockedIpsSyncMs = Date.now();
  unblockIpAsync(cleanIp).catch(() => {});
  return existed;
}

/**
 * Get all currently blocked IP records from MongoDB
 */
export async function getAllBlockedIpsAsync(): Promise<BlockedIpRecord[]> {
  await hydrateBlockedIpsFromMongo(true);
  return getAllBlockedIps();
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
      getBlockedIpsCollection()
        .then((col) => col.deleteOne({ ip }))
        .catch(() => {});
    }
  }
  return active.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Classify readable action label for any API request or auth event
 */
function classifyApiAction(method: string, urlPath: string): { eventType: string; action: string } {
  const cleanPath = urlPath.split('?')[0];

  if (cleanPath.includes('/api/auth/google/callback') || cleanPath.includes('/api/auth/google')) {
    return { eventType: 'LOGIN', action: 'Google OAuth Sign-In' };
  }
  if (cleanPath.includes('/api/auth/me')) {
    return { eventType: 'API_REQUEST', action: 'Verify Active Session (/auth/me)' };
  }
  if (cleanPath.includes('/api/donations') && method === 'POST') {
    return { eventType: 'API_REQUEST', action: 'Create Donation / Tip Session' };
  }
  if (cleanPath.includes('/api/donations')) {
    return { eventType: 'API_REQUEST', action: 'Fetch Donations Ledger' };
  }
  if (cleanPath.includes('/api/subscribers')) {
    return { eventType: 'API_REQUEST', action: method === 'POST' ? 'Update Membership / Subscriber' : 'Fetch Membership Data' };
  }
  if (cleanPath.includes('/api/soundboard')) {
    return { eventType: 'API_REQUEST', action: method === 'POST' ? 'Soundboard Action' : 'Fetch Soundboard Deck' };
  }
  if (cleanPath.includes('/api/widgets/')) {
    const widgetName = cleanPath.split('/api/widgets/')[1]?.split('/')[0] || 'widget';
    return {
      eventType: 'API_REQUEST',
      action: `${method === 'POST' || method === 'PUT' ? 'Update' : 'Fetch'} ${widgetName.toUpperCase()} Widget`
    };
  }
  if (cleanPath.includes('/api/media')) {
    return {
      eventType: 'API_REQUEST',
      action: method === 'POST' ? 'Upload Media Asset' : method === 'DELETE' ? 'Delete Media Asset' : 'Fetch Media Library'
    };
  }
  if (cleanPath.includes('/api/streamer')) {
    return {
      eventType: 'API_REQUEST',
      action: method === 'PUT' || method === 'POST' ? 'Update Creator Profile / Settings' : 'Fetch Creator Profile'
    };
  }
  if (cleanPath.includes('/api/admin/')) {
    return { eventType: 'API_REQUEST', action: `Admin API (${cleanPath.replace('/api/admin/', '')})` };
  }
  return { eventType: 'API_REQUEST', action: `Incoming API ${method} ${cleanPath}` };
}

/**
 * Record a session log entry in MongoDB `session_logs` ONLY when the session exceeds 20 req/sec.
 * Normal traffic (<= 20 req/sec) is never logged or stored in `session_logs`.
 */
export function recordSessionLog(params: {
  eventType?: string;
  action?: string;
  method: string;
  path: string;
  statusCode?: number;
  ip: string;
  userAgent?: string;
  userId?: string | null;
  username?: string | null;
  userEmail?: string | null;
  requestsPerSecond?: number;
  isHighRateWarning?: boolean;
  durationMs?: number;
  details?: string;
}): SessionLogDoc {
  const cleanIp = normalizeIp(params.ip);
  const now = new Date();
  const dateKey = getDailyLogDateKey(now);
  const rps = params.requestsPerSecond ?? getCurrentIpRps(cleanIp);
  const passedRpsThreshold = rps > 20;
  const isHighRateWarning = passedRpsThreshold;
  const blockedState = isIpBlocked(cleanIp);

  const classified = classifyApiAction(params.method, params.path);
  const finalEventType = passedRpsThreshold && (!params.eventType || params.eventType === 'API_REQUEST')
    ? 'RATE_WARNING'
    : (params.eventType || classified.eventType);

  const logEntry: SessionLogDoc = {
    id: `log_${Date.now()}_${uuidv4().slice(0, 8)}`,
    dateKey,
    eventType: finalEventType,
    action: params.action || classified.action,
    method: params.method || 'GET',
    path: params.path || '/',
    statusCode: params.statusCode || 200,
    ip: cleanIp,
    userAgent: params.userAgent || 'Unknown',
    userId: params.userId || null,
    username: params.username || null,
    userEmail: params.userEmail || null,
    requestsPerSecond: rps,
    isHighRateWarning,
    isBlocked: blockedState.blocked,
    durationMs: params.durationMs || 0,
    details:
      params.details ||
      (passedRpsThreshold
        ? `⚠️ High Traffic Warning: ${rps} req/sec from ${cleanIp} (exceeds 20 req/s threshold)`
        : undefined),
    createdAt: now
  };

  // Strictly store in MongoDB `session_logs` ONLY for sessions that passed 20 req/sec
  if (passedRpsThreshold) {
    pruneOldSessionLogsMongo(dateKey)
      .then(() => getSessionLogsCollection())
      .then((col) => col.insertOne({ ...logEntry }))
      .catch(() => {});
  }

  const updateSet: any = {
    lastRps: rps,
    lastSeenAt: now,
    lastPath: logEntry.path,
    lastMethod: logEntry.method,
    ...(logEntry.userAgent && logEntry.userAgent !== 'Unknown' ? { userAgent: logEntry.userAgent } : {})
  };
  const addToSet: any = {};
  if (logEntry.userId) addToSet.userIds = logEntry.userId;
  if (logEntry.username) addToSet.usernames = logEntry.username;
  if (logEntry.userEmail) addToSet.emails = logEntry.userEmail;

  getTrackedIpsCollection()
    .then((col) =>
      col.updateOne(
        { ip: cleanIp },
        {
          $set: updateSet,
          $setOnInsert: { firstSeenAt: now },
          $inc: {
            totalRequests: 1,
            ...(isHighRateWarning ? { warningCount: 1 } : {})
          },
          $max: { peakRps: rps },
          ...(Object.keys(addToSet).length > 0 ? { $addToSet: addToSet } : {})
        },
        { upsert: true }
      )
    )
    .catch(() => {});

  // If authenticated user is attached, update their lastIp & ipHistory on user doc
  if (logEntry.userId) {
    getUsersCollection()
      .then((usersCol) =>
        usersCol.updateOne(
          { userId: logEntry.userId! },
          {
            $set: {
              lastIp: cleanIp,
              lastUserAgent: logEntry.userAgent || 'Unknown',
              lastActiveAt: now
            },
            $addToSet: { ipHistory: cleanIp }
          }
        )
      )
      .catch(() => {});
  }

  return logEntry;
}

/**
 * Render an HTML page for blocked users trying to visit the website in a browser
 */
export function renderBlockedHtmlPage(ip: string, reason?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Access Blocked — Security Shield</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090D16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: #0B0F19;
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 16px;
      padding: 32px 28px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 10px;
      color: #ffffff;
    }
    p {
      font-size: 13px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 20px;
    }
    .meta {
      background: #050811;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 12px 14px;
      text-align: left;
      font-size: 12px;
      color: #cbd5e1;
    }
    .meta div + div {
      margin-top: 6px;
    }
    .meta span {
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">403 • Access Restricted</div>
    <h1>Your IP Address Has Been Blocked</h1>
    <p>Your connection to this website and all services has been suspended by the platform security administrator. You cannot perform any actions while this block is active.</p>
    <div class="meta">
      <div><span>Client IP:</span> <strong>${ip}</strong></div>
      <div><span>Reason:</span> <strong>${reason || 'Blocked by Administrator'}</strong></div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Express middleware for global rate limiting, IP blocking, RPS > 20 warning detection, and Session Logging
 */
export function globalRateLimiterMiddleware(options?: {
  windowMs?: number;
  maxRequests?: number;
  autoBanThreshold?: number;
}) {
  const windowMs = options?.windowMs ?? 60000; // 1 minute
  const maxRequests = options?.maxRequests ?? 180; // 180 req/min
  const autoBanThreshold = options?.autoBanThreshold ?? 350; // > 350 req/min triggers auto-ban

  return async (req: any, res: any, next: any) => {
    try {
      const urlPath = req.path || req.originalUrl || '';

      // 1. Bypass static media files and fonts to keep streaming ultra fast
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

      const clientIp = getClientIp(req);
      const userAgent = getClientUserAgent(req);
      const reqUser = extractRequestUser(req);
      const startTime = Date.now();

      if (reqUser?.isAdmin) {
        recordAdminHeartbeat(reqUser.id, reqUser.email);
      }

      // 2. Measure 1-second RPS for this IP (> 20 req/s triggers warning label)
      const { rps, isHighRateWarning } = recordIpHitAndGetRps(clientIp);

      // 3. Allow authenticated Admin on /api/admin/*, /api/auth/me, and /api/security/ip-status so admin cannot lock themselves out of unblocking
      const isAdminControlRequest = Boolean(
        reqUser?.isAdmin &&
        (urlPath.startsWith('/api/admin') ||
          urlPath.startsWith('/api/auth/me') ||
          urlPath.startsWith('/api/security/ip-status'))
      );

      // 4. Check MongoDB-synced IP block list (blocks ALL actions & website pages for everyone, including logged-in clients)
      const blockStatus = await isIpBlockedAsync(clientIp);
      if (blockStatus.blocked && !isAdminControlRequest) {
        res.setHeader('Retry-After', String(blockStatus.retryAfterSeconds || 86400));

        recordSessionLog({
          eventType: 'SECURITY_BLOCK',
          action: `Blocked Request Rejected (${req.method} ${urlPath.split('?')[0]})`,
          method: req.method || 'GET',
          path: urlPath,
          statusCode: 403,
          ip: clientIp,
          userAgent,
          userId: reqUser?.id || null,
          username: reqUser?.username || null,
          userEmail: reqUser?.email || null,
          requestsPerSecond: rps,
          isHighRateWarning,
          details: `Blocked IP attempted action. Reason: ${blockStatus.reason || 'Admin Block'}`
        });

        const acceptHeader = String(req.headers?.['accept'] || '');
        if (!urlPath.startsWith('/api') && acceptHeader.includes('text/html')) {
          return res.status(403).send(renderBlockedHtmlPage(clientIp, blockStatus.reason));
        }

        return res.status(403).json({
          error: 'Access Denied: Your IP address has been blocked by the administrator and cannot perform any actions.',
          blocked: true,
          ip: clientIp,
          reason: blockStatus.reason || 'Blocked by Administrator',
          retryAfterSeconds: blockStatus.retryAfterSeconds
        });
      }

      // 5. Log ONLY sessions exceeding 20 req/sec (skip polling noise and normal <= 20 r/s requests)
      const isPollingNoise =
        (urlPath.startsWith('/api/admin/session-logs') && req.method === 'GET') ||
        (urlPath.startsWith('/api/security/ip-status') && req.method === 'GET');
      if (isHighRateWarning && !isPollingNoise) {
        res.on('finish', () => {
          const durationMs = Date.now() - startTime;
          recordSessionLog({
            method: req.method || 'GET',
            path: urlPath,
            statusCode: res.statusCode || 200,
            ip: clientIp,
            userAgent,
            userId: reqUser?.id || null,
            username: reqUser?.username || null,
            userEmail: reqUser?.email || null,
            requestsPerSecond: rps,
            isHighRateWarning: true,
            durationMs
          });
        });
      }

      // 6. Authenticated users bypass automated sliding-window rate limit (unless manually blocked above)
      if (reqUser) {
        return next();
      }

      // 7. Sliding window rate limit check for unauthenticated traffic
      const rlKey = `global:${clientIp}`;
      const result = checkRateLimit(rlKey, maxRequests, windowMs);

      res.setHeader('RateLimit-Limit', String(maxRequests));
      res.setHeader('RateLimit-Remaining', String(Math.max(0, result.remaining)));

      if (!result.allowed) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
        res.setHeader('RateLimit-Reset', String(result.retryAfterSeconds));

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
    } catch (err) {
      next(err);
    }
  };
}
