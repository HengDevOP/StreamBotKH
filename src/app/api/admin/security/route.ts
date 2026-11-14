import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getAllBlockedIpsAsync, blockIpAsync, unblockIpAsync } from '@/server/utils/rateLimiter';
import { disconnectBlockedIpSockets } from '@/server/services/socketService';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const blockedIps = await getAllBlockedIpsAsync();
    return NextResponse.json({
      success: true,
      count: blockedIps.length,
      blockedIps
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, ip, reason, durationMinutes } = body;

    if (!ip || typeof ip !== 'string') {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    if (action === 'unblock') {
      const removed = await unblockIpAsync(ip);
      return NextResponse.json({
        success: true,
        message: removed ? `IP ${ip} successfully unblocked.` : `IP ${ip} was not in blocked list.`
      });
    }

    if (action === 'block') {
      const durationMs =
        durationMinutes !== undefined && Number(durationMinutes) > 0
          ? Number(durationMinutes) * 60 * 1000
          : 0;
      await blockIpAsync(ip, reason || 'Manual Admin block', durationMs, {
        blockedBy: user.email,
        allowLocalhost: true
      });
      disconnectBlockedIpSockets(ip, reason || 'Manual Admin block');
      return NextResponse.json({
        success: true,
        message:
          durationMs > 0
            ? `IP ${ip} blocked for ${durationMinutes} minutes.`
            : `IP ${ip} permanently blocked.`
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "block" or "unblock".' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
