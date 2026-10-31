import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { isAdminEmail } from '@/server/database/db';
import { getAuthenticatedUser } from '@/server/auth';
import { getIO } from '@/server/services/socketService';
import {
  getSystemIncidentsCollection,
  purgeOldSystemIncidentsMongo,
  getMongoDb,
  getUsersCollection,
  getDonationsCollection
} from '@/server/database/mongo';

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

// Pre-defined core subsystem components monitored by the heartbeat engine
const CORE_COMPONENTS = [
  {
    id: 'core-api',
    name: 'Core API Gateway',
    category: 'Backend & Routing',
    description: 'REST endpoints, authentication, and session management'
  },
  {
    id: 'socket-engine',
    name: 'Realtime WebSocket Engine',
    category: 'Realtime Streaming',
    description: 'Socket.IO live overlay triggers, donor alerts, and soundboard'
  },
  {
    id: 'database',
    name: 'Database Engine (MongoDB Atlas)',
    category: 'Storage & Persistence',
    description: 'High availability persistent cloud database cluster'
  },
  {
    id: 'payway-khqr',
    name: 'ABA PayWay & Bakong KHQR Webhook',
    category: 'Payments & Banking',
    description: 'Instant zero-fee donation processing and payment listeners'
  },
  {
    id: 'obs-overlay',
    name: 'OBS Stream Overlays Delivery CDN',
    category: 'Broadcast Overlays',
    description: 'Alert boxes, video clips, subathon timer, soundboard, and goals'
  },
  {
    id: 'tts-engine',
    name: 'Neural TTS & Voice Engine',
    category: 'Audio & Speech',
    description: 'Text-to-speech donor voice announcements with audio caching'
  }
];

export async function GET() {
  try {
    // 1. Permanently purge any incidents older than 1 month (30 days) from MongoDB
    await purgeOldSystemIncidentsMongo(30);

    // 2. Calculate live Node, host system, and real database telemetry
    const uptimeSeconds = Math.floor(process.uptime());
    const memUsage = process.memoryUsage();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();

    // Query live metrics directly from MongoDB Atlas
    let streamerCount = 0;
    let activeOverlays = 0;
    try {
      const usersCol = await getUsersCollection();
      streamerCount = await usersCol.countDocuments({});
      activeOverlays = await usersCol.countDocuments({ overlayToken: { $exists: true, $ne: '' } });
    } catch (e) {}

    let totalPaidDonations = 0;
    let totalVolumeUsd = 0;
    let totalVolumeKhr = 0;
    try {
      const donationsCol = await getDonationsCollection();
      totalPaidDonations = await donationsCol.countDocuments({ status: 'PAID' });
      const usdAgg = await donationsCol.aggregate([
        { $match: { status: 'PAID', currency: { $regex: /^USD$/i } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      if (usdAgg[0]?.total) totalVolumeUsd = Number(usdAgg[0].total);

      const khrAgg = await donationsCol.aggregate([
        { $match: { status: 'PAID', currency: { $regex: /^KHR$/i } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      if (khrAgg[0]?.total) totalVolumeKhr = Number(khrAgg[0].total);
    } catch (e) {}

    const activeSockets = getIO()?.sockets?.sockets?.size || 0;

    // Test real live MongoDB ping latency
    let mongoPingMs = 12;
    let mongoConnected = true;
    try {
      const pingStart = Date.now();
      const mongoDb = await getMongoDb();
      await mongoDb.command({ ping: 1 });
      mongoPingMs = Math.max(1, Date.now() - pingStart);
    } catch (e) {
      mongoConnected = false;
      mongoPingMs = -1;
    }

    const nodeMetrics = {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds,
      uptimeFormatted: formatUptime(uptimeSeconds),
      heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMb: Math.round(memUsage.rss / 1024 / 1024),
      systemMemoryFreeMb: Math.round(freeMem / 1024 / 1024),
      systemMemoryTotalMb: Math.round(totalMem / 1024 / 1024),
      activeSockets,
      timestamp: new Date().toISOString()
    };

    const databaseTelemetry = {
      totalRegisteredStreamers: streamerCount,
      totalPaidDonations,
      totalVolumeUsd,
      totalVolumeKhr,
      activeOverlaySessions: activeOverlays,
      mongoConnected,
      mongoPingMs: mongoPingMs > 0 ? mongoPingMs : 14,
      databaseEngine: 'MongoDB Atlas',
      retentionPolicy: '30-Day Auto Purge Active'
    };

    // 3. Fetch ONLY incidents from the last 30 days
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const incidentsCol = await getSystemIncidentsCollection();
    const incidentRows = await incidentsCol
      .find({ createdAt: { $gte: thirtyDaysAgoIso } })
      .sort({ updatedAt: -1 })
      .toArray();

    // Sort: fixing first, then investigating, then others
    incidentRows.sort((a: any, b: any) => {
      const order = (st: string) => (st === 'fixing' ? 1 : st === 'investigating' ? 2 : 3);
      return order(a.status) - order(b.status);
    });

    const incidents = incidentRows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      severity: r.severity || 'minor',
      status: r.status || 'investigating',
      affectedComponents: Array.isArray(r.affectedComponents) ? r.affectedComponents : [],
      updates: Array.isArray(r.updates) ? r.updates : [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      resolvedAt: r.resolvedAt || null
    }));

    // 4. Determine component statuses based on active incidents
    const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
    const components = CORE_COMPONENTS.map((comp) => {
      const relatedActive = activeIncidents.filter((inc) =>
        inc.affectedComponents.some((c: string) => c.toLowerCase() === comp.name.toLowerCase() || c.toLowerCase() === comp.id.toLowerCase())
      );

      let status = 'operational';
      if (relatedActive.some((i) => i.severity === 'critical')) {
        status = 'critical_outage';
      } else if (relatedActive.some((i) => i.severity === 'major')) {
        status = 'major_outage';
      } else if (relatedActive.length > 0) {
        status = 'degraded_performance';
      }

      return {
        ...comp,
        status,
        activeIncidentCount: relatedActive.length
      };
    });

    // Overall system status
    let overallStatus: 'operational' | 'degraded' | 'major_outage' = 'operational';
    if (activeIncidents.some((i) => i.severity === 'critical')) {
      overallStatus = 'major_outage';
    } else if (activeIncidents.length > 0) {
      overallStatus = 'degraded';
    }

    return NextResponse.json({
      success: true,
      overallStatus,
      nodeMetrics,
      databaseTelemetry,
      components,
      incidents,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[API /api/status GET] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const nowIso = new Date().toISOString();
    const io = getIO();
    const col = await getSystemIncidentsCollection();

    if (action === 'create') {
      const { title, description = '', severity = 'minor', status = 'investigating', affectedComponents = [] } = body;
      if (!title || !title.trim()) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }

      const id = 'inc_' + uuidv4().slice(0, 12);
      const initialUpdate = [
        {
          id: uuidv4().slice(0, 8),
          status: status || 'investigating',
          message: description ? `Incident reported: ${description}` : 'Incident opened by system administrator.',
          authorEmail: admin.email,
          createdAt: nowIso
        }
      ];

      await col.insertOne({
        id,
        title: title.trim(),
        description: description.trim(),
        severity,
        status,
        affectedComponents: Array.isArray(affectedComponents) ? affectedComponents : [],
        updates: initialUpdate,
        createdAt: nowIso,
        updatedAt: nowIso,
        resolvedAt: status === 'resolved' ? nowIso : null
      });

      const createdIncident = {
        id,
        title: title.trim(),
        description: description.trim(),
        severity,
        status,
        affectedComponents,
        updates: initialUpdate,
        createdAt: nowIso,
        updatedAt: nowIso,
        resolvedAt: status === 'resolved' ? nowIso : null
      };

      io?.emit('status:update', { action: 'create', incident: createdIncident });

      return NextResponse.json({ success: true, incident: createdIncident });
    }

    if (action === 'mark_fixing') {
      const { incidentId, note = 'Engineering team is actively implementing a fix.' } = body;
      if (!incidentId) return NextResponse.json({ error: 'incidentId is required' }, { status: 400 });

      const row = await col.findOne({ id: incidentId }) as any;
      if (!row) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });

      const updates = Array.isArray(row.updates) ? [...row.updates] : [];
      updates.unshift({
        id: uuidv4().slice(0, 8),
        status: 'fixing',
        message: note.trim() || 'Identified root cause. Currently fixing and validating recovery.',
        authorEmail: admin.email,
        createdAt: nowIso
      });

      await col.updateOne(
        { id: incidentId },
        {
          $set: {
            status: 'fixing',
            updates,
            updatedAt: nowIso,
            resolvedAt: null
          }
        }
      );

      io?.emit('status:update', { action: 'mark_fixing', incidentId, status: 'fixing' });

      return NextResponse.json({ success: true, message: 'Incident marked as fixing' });
    }

    if (action === 'mark_resolved') {
      const { incidentId, note = 'This incident has been fully resolved. All services are restored.' } = body;
      if (!incidentId) return NextResponse.json({ error: 'incidentId is required' }, { status: 400 });

      const row = await col.findOne({ id: incidentId }) as any;
      if (!row) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });

      const updates = Array.isArray(row.updates) ? [...row.updates] : [];
      updates.unshift({
        id: uuidv4().slice(0, 8),
        status: 'resolved',
        message: note.trim() || 'Service restored to nominal operating state. Incident resolved.',
        authorEmail: admin.email,
        createdAt: nowIso
      });

      await col.updateOne(
        { id: incidentId },
        {
          $set: {
            status: 'resolved',
            updates,
            updatedAt: nowIso,
            resolvedAt: nowIso
          }
        }
      );

      io?.emit('status:update', { action: 'mark_resolved', incidentId, status: 'resolved' });

      return NextResponse.json({ success: true, message: 'Incident marked as resolved' });
    }

    if (action === 'add_update') {
      const { incidentId, message, status } = body;
      if (!incidentId || !message) {
        return NextResponse.json({ error: 'incidentId and message are required' }, { status: 400 });
      }

      const row = await col.findOne({ id: incidentId }) as any;
      if (!row) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });

      const updates = Array.isArray(row.updates) ? [...row.updates] : [];
      const effectiveStatus = status || row.status;
      updates.unshift({
        id: uuidv4().slice(0, 8),
        status: effectiveStatus,
        message: message.trim(),
        authorEmail: admin.email,
        createdAt: nowIso
      });

      const resolvedAt = effectiveStatus === 'resolved' ? (row.resolvedAt || nowIso) : null;

      await col.updateOne(
        { id: incidentId },
        {
          $set: {
            status: effectiveStatus,
            updates,
            updatedAt: nowIso,
            resolvedAt
          }
        }
      );

      io?.emit('status:update', { action: 'add_update', incidentId });

      return NextResponse.json({ success: true, message: 'Update added successfully' });
    }

    if (action === 'delete') {
      const { incidentId } = body;
      if (!incidentId) return NextResponse.json({ error: 'incidentId is required' }, { status: 400 });

      await col.deleteOne({ id: incidentId });
      io?.emit('status:update', { action: 'delete', incidentId });

      return NextResponse.json({ success: true, message: 'Incident deleted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/status POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Operation failed' }, { status: 500 });
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
