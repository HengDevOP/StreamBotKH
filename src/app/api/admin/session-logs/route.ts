import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import {
  getSessionLogsCollection,
  getTrackedIpsCollection,
  getUsersCollection,
  getDailyLogDateKey,
  pruneOldSessionLogsMongo,
  SessionLogDoc
} from '@/server/database/mongo';
import {
  getAllBlockedIpsAsync,
  blockIpAsync,
  unblockIpAsync,
  isIpBlocked,
  getCurrentIpRps,
  hydrateBlockedIpsFromMongo,
  normalizeIp
} from '@/server/utils/rateLimiter';
import { disconnectBlockedIpSockets } from '@/server/services/socketService';

async function checkAdmin(req: NextRequest) {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) return null;

  let row: any = null;
  try {
    const usersCol = await getUsersCollection();
    row = await usersCol.findOne({ userId: authUser.id });
  } catch (e) {}

  const email = row?.email || authUser.email;
  if (!isAdminEmail(email)) return null;
  return { ...authUser, email };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required (hchenheng@gmail.com)' },
        { status: 403 }
      );
    }

    const todayKey = getDailyLogDateKey();
    const prunedCount = await pruneOldSessionLogsMongo(todayKey);
    await hydrateBlockedIpsFromMongo(true);

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(300, Math.max(20, parseInt(searchParams.get('limit') || '150', 10) || 150));
    const eventFilter = (searchParams.get('eventType') || 'ALL').trim().toUpperCase();
    const search = (searchParams.get('q') || '').trim().toLowerCase();
    const onlyWarnings = searchParams.get('warnings') === '1';

    // 1. Fetch today's high-rate (>20 req/sec) Session Logs strictly from MongoDB
    const logsCol = await getSessionLogsCollection();

    // Ensure any legacy logs that did not pass >20 req/sec are purged from storage
    await logsCol.deleteMany({ requestsPerSecond: { $lte: 20 } }).catch(() => {});

    const mongoQuery: any = { dateKey: todayKey, requestsPerSecond: { $gt: 20 } };
    if (eventFilter !== 'ALL') {
      mongoQuery.eventType = eventFilter;
    }
    if (onlyWarnings) {
      mongoQuery.isHighRateWarning = true;
    }
    if (search) {
      const safeRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      mongoQuery.$or = [
        { ip: { $regex: safeRegex, $options: 'i' } },
        { action: { $regex: safeRegex, $options: 'i' } },
        { path: { $regex: safeRegex, $options: 'i' } },
        { username: { $regex: safeRegex, $options: 'i' } },
        { userEmail: { $regex: safeRegex, $options: 'i' } },
        { eventType: { $regex: safeRegex, $options: 'i' } }
      ];
    }

    const [mongoLogs, totalLogsCount, highRateWarningsCount, loginRegisterCount] = await Promise.all([
      logsCol.find(mongoQuery).sort({ createdAt: -1 }).limit(limit).toArray(),
      logsCol.countDocuments({ dateKey: todayKey, requestsPerSecond: { $gt: 20 } }),
      logsCol.countDocuments({ dateKey: todayKey, requestsPerSecond: { $gt: 20 }, isHighRateWarning: true }),
      logsCol.countDocuments({ dateKey: todayKey, requestsPerSecond: { $gt: 20 }, eventType: { $in: ['LOGIN', 'REGISTER'] } })
    ]);

    const filteredLogs = mongoLogs.map((item) => {
      const cleanIp = normalizeIp(item.ip || '127.0.0.1');
      const blockedInfo = isIpBlocked(cleanIp);
      const liveRps = getCurrentIpRps(cleanIp);
      const rps = Math.max(Number(item.requestsPerSecond) || 1, liveRps);
      const isHighRateWarning = Boolean(item.isHighRateWarning || rps > 20);

      return {
        id: item.id,
        dateKey: item.dateKey || todayKey,
        eventType: item.eventType || 'API_REQUEST',
        action: item.action || `${item.method} ${item.path}`,
        method: item.method || 'GET',
        path: item.path || '/',
        statusCode: item.statusCode || 200,
        ip: cleanIp,
        userAgent: item.userAgent || 'Unknown',
        userId: item.userId || null,
        username: item.username || null,
        userEmail: item.userEmail || null,
        requestsPerSecond: rps,
        isHighRateWarning,
        isBlocked: blockedInfo.blocked,
        blockReason: blockedInfo.reason || null,
        durationMs: item.durationMs || 0,
        details: item.details || null,
        createdAt:
          item.createdAt instanceof Date
            ? item.createdAt.toISOString()
            : String(item.createdAt || new Date().toISOString())
      };
    });

    // 2. Build Complete IP Address Directory from MongoDB (Tracked IPs + Blocked IPs + Registered Clients)
    const blockedIps = await getAllBlockedIpsAsync();
    const ipDirectoryMap = new Map<
      string,
      {
        ip: string;
        isBlocked: boolean;
        blockReason?: string | null;
        blockCreatedAt?: number | null;
        blockExpiresAt?: number | null;
        totalRequests: number;
        currentRps: number;
        peakRps: number;
        isHighRateWarning: boolean;
        warningCount: number;
        firstSeenAt: string;
        lastSeenAt: string;
        lastPath: string;
        lastMethod: string;
        userAgent: string;
        clients: Array<{
          userId: string;
          username: string;
          displayName: string;
          email: string;
          avatarUrl?: string;
          plan?: string;
        }>;
      }
    >();

    // Helper to ensure an IP entry exists in ipDirectoryMap
    const ensureIpEntry = (rawIp: string) => {
      const ip = normalizeIp(rawIp);
      let entry = ipDirectoryMap.get(ip);
      if (!entry) {
        const bStatus = isIpBlocked(ip);
        const bRecord = blockedIps.find((b) => normalizeIp(b.ip) === ip);
        const liveRps = getCurrentIpRps(ip);
        entry = {
          ip,
          isBlocked: bStatus.blocked,
          blockReason: bRecord?.reason || bStatus.reason || null,
          blockCreatedAt: bRecord?.createdAt || null,
          blockExpiresAt: bRecord?.expiresAt ?? null,
          totalRequests: 0,
          currentRps: liveRps,
          peakRps: liveRps,
          isHighRateWarning: liveRps > 20,
          warningCount: 0,
          firstSeenAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          lastPath: '/',
          lastMethod: 'GET',
          userAgent: 'Unknown',
          clients: []
        };
        ipDirectoryMap.set(ip, entry);
      }
      return entry;
    };

    // 2a. Load Tracked IPs from MongoDB
    try {
      const trackedCol = await getTrackedIpsCollection();
      const mongoTracked = await trackedCol.find({}).sort({ lastSeenAt: -1 }).limit(300).toArray();
      for (const t of mongoTracked) {
        if (!t.ip) continue;
        const entry = ensureIpEntry(t.ip);
        entry.totalRequests = Math.max(entry.totalRequests, Number(t.totalRequests) || 0);
        entry.peakRps = Math.max(entry.peakRps, Number(t.peakRps) || 0, Number(t.lastRps) || 0);
        entry.warningCount = Math.max(entry.warningCount, Number(t.warningCount) || 0);
        entry.isHighRateWarning = Boolean(entry.currentRps > 20 || entry.peakRps > 20 || entry.warningCount > 0);
        if (t.firstSeenAt) entry.firstSeenAt = new Date(t.firstSeenAt).toISOString();
        if (t.lastSeenAt) entry.lastSeenAt = new Date(t.lastSeenAt).toISOString();
        if (t.lastPath) entry.lastPath = t.lastPath;
        if (t.lastMethod) entry.lastMethod = t.lastMethod;
        if (t.userAgent && t.userAgent !== 'Unknown') entry.userAgent = t.userAgent;
      }
    } catch (e) {}

    // 2b. Merge Blocked IPs (even if they have 0 requests today)
    for (const b of blockedIps) {
      const entry = ensureIpEntry(b.ip);
      entry.isBlocked = true;
      entry.blockReason = b.reason || 'Blocked by Administrator';
      entry.blockCreatedAt = b.createdAt;
      entry.blockExpiresAt = b.expiresAt;
      if (b.associatedUsername || b.associatedEmail) {
        const exists = entry.clients.some(
          (c) =>
            (b.associatedUserId && c.userId === b.associatedUserId) ||
            (b.associatedEmail && c.email === b.associatedEmail)
        );
        if (!exists) {
          entry.clients.push({
            userId: b.associatedUserId || '',
            username: b.associatedUsername || 'client',
            displayName: b.associatedUsername || 'Client',
            email: b.associatedEmail || '',
            plan: 'free'
          });
        }
      }
    }

    // 2d. Load all Registered Users from MongoDB to attach Client Profiles to IPs
    try {
      const usersCol = await getUsersCollection();
      const allUsers = await usersCol.find({}).sort({ updatedAt: -1 }).toArray();
      const userById = new Map<string, any>();
      const userByUsername = new Map<string, any>();

      for (const u of allUsers) {
        if (!u.userId && !u.email) continue;
        if (u.userId) userById.set(u.userId, u);
        if (u.username) userByUsername.set(String(u.username).toLowerCase(), u);

        const clientProfile = {
          userId: u.userId || '',
          username: u.username || 'streamer',
          displayName: u.displayName || u.username || 'Streamer',
          email: u.email || '',
          avatarUrl: u.avatarUrl || '',
          plan: u.plan || 'free'
        };

        const userIps = new Set<string>();
        if (u.lastIp) userIps.add(normalizeIp(u.lastIp));
        if (Array.isArray(u.ipHistory)) {
          for (const histIp of u.ipHistory) {
            if (histIp) userIps.add(normalizeIp(histIp));
          }
        }

        for (const ip of userIps) {
          const entry = ensureIpEntry(ip);
          if (!entry.clients.some((c) => c.userId === clientProfile.userId && c.email === clientProfile.email)) {
            entry.clients.push(clientProfile);
          }
          if (u.lastUserAgent && entry.userAgent === 'Unknown') {
            entry.userAgent = u.lastUserAgent;
          }
        }
      }

      // Also link any user IDs / usernames observed in today's logs to their IP entry
      for (const l of filteredLogs) {
        if (!l.ip) continue;
        const entry = ensureIpEntry(l.ip);
        const matchedUser =
          (l.userId && userById.get(l.userId)) ||
          (l.username && userByUsername.get(String(l.username).toLowerCase()));

        if (matchedUser) {
          const exists = entry.clients.some((c) => c.userId === matchedUser.userId);
          if (!exists) {
            entry.clients.push({
              userId: matchedUser.userId || '',
              username: matchedUser.username || 'streamer',
              displayName: matchedUser.displayName || matchedUser.username || 'Streamer',
              email: matchedUser.email || '',
              avatarUrl: matchedUser.avatarUrl || '',
              plan: matchedUser.plan || 'free'
            });
          }
        } else if (l.username || l.userEmail) {
          const exists = entry.clients.some(
            (c) => (l.username && c.username === l.username) || (l.userEmail && c.email === l.userEmail)
          );
          if (!exists) {
            entry.clients.push({
              userId: l.userId || '',
              username: l.username || 'client',
              displayName: l.username || 'Client',
              email: l.userEmail || '',
              plan: 'free'
            });
          }
        }
      }
    } catch (e) {}

    const ipList = Array.from(ipDirectoryMap.values()).sort((a, b) => {
      if (a.isBlocked !== b.isBlocked) return a.isBlocked ? -1 : 1;
      if (a.isHighRateWarning !== b.isHighRateWarning) return a.isHighRateWarning ? -1 : 1;
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
    });

    return NextResponse.json({
      success: true,
      dateKey: todayKey,
      prunedPreviousDaysCount: prunedCount,
      summary: {
        dateKey: todayKey,
        totalLogs: totalLogsCount,
        highRateWarnings: highRateWarningsCount,
        loginRegisterEvents: loginRegisterCount,
        totalTrackedIps: ipList.length,
        blockedIpsCount: blockedIps.length
      },
      logs: filteredLogs,
      ipAddresses: ipList,
      blockedIps
    });
  } catch (err: any) {
    console.error('[Admin Session Logs GET] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load session logs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required (hchenheng@gmail.com)' },
        { status: 403 }
      );
    }

    await hydrateBlockedIpsFromMongo(true);

    const body = await req.json().catch(() => ({}));
    const { action, ip, reason, durationMinutes, userId, username, email } = body;

    if (action === 'clear_logs') {
      try {
        const logsCol = await getSessionLogsCollection();
        await logsCol.deleteMany({});
      } catch (e) {}
      return NextResponse.json({
        success: true,
        message: 'All session logs cleared from MongoDB.'
      });
    }

    if (!ip || typeof ip !== 'string' || !ip.trim()) {
      return NextResponse.json({ error: 'Valid IP address is required.' }, { status: 400 });
    }

    const cleanIp = normalizeIp(ip);

    if (action === 'block') {
      // Duration 0 = permanent block (default when blocking from Admin Panel)
      const durationMs =
        durationMinutes !== undefined && Number(durationMinutes) > 0
          ? Number(durationMinutes) * 60 * 1000
          : 0;

      await blockIpAsync(cleanIp, reason || 'Blocked by Admin via Session Logs', durationMs, {
        blockedBy: admin.email,
        allowLocalhost: true,
        associatedUserId: userId || null,
        associatedUsername: username || null,
        associatedEmail: email || null
      });

      disconnectBlockedIpSockets(cleanIp, reason || 'Blocked by Admin via Session Logs');

      return NextResponse.json({
        success: true,
        ip: cleanIp,
        isBlocked: true,
        message:
          durationMs > 0
            ? `IP ${cleanIp} has been blocked for ${durationMinutes} minutes.`
            : `IP ${cleanIp} has been permanently blocked from all actions and website access.`
      });
    }

    if (action === 'unblock') {
      await unblockIpAsync(cleanIp);
      return NextResponse.json({
        success: true,
        ip: cleanIp,
        isBlocked: false,
        message: `IP ${cleanIp} has been unblocked and restored access.`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: "block", "unblock", "clear_logs".' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[Admin Session Logs POST] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to execute security action' },
      { status: 500 }
    );
  }
}
