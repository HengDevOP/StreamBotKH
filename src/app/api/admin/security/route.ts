import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getAllBlockedIps, blockIp, unblockIp } from '@/server/utils/rateLimiter';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const blockedIps = getAllBlockedIps();
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
      const removed = unblockIp(ip);
      return NextResponse.json({
        success: true,
        message: removed ? `IP ${ip} successfully unblocked.` : `IP ${ip} was not in blocked list.`
      });
    }

    if (action === 'block') {
      const durationMs = durationMinutes ? Number(durationMinutes) * 60 * 1000 : 15 * 60 * 1000;
      blockIp(ip, reason || 'Manual Admin block', durationMs);
      return NextResponse.json({
        success: true,
        message: `IP ${ip} blocked for ${durationMinutes || 15} minutes.`
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "block" or "unblock".' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
