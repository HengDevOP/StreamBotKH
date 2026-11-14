import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getClientIp, isIpBlockedAsync } from '@/server/utils/rateLimiter';

export async function GET(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const blockStatus = await isIpBlockedAsync(clientIp);
    const authUser = getAuthenticatedUser(req);
    const isAdmin = Boolean(authUser && isAdminEmail(authUser.email));

    if (blockStatus.blocked && !isAdmin) {
      return NextResponse.json(
        {
          blocked: true,
          ip: clientIp,
          reason: blockStatus.reason || 'Blocked by Administrator',
          retryAfterSeconds: blockStatus.retryAfterSeconds || 0
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      blocked: false,
      ip: clientIp,
      adminBypassActive: Boolean(blockStatus.blocked && isAdmin),
      reason: blockStatus.blocked ? blockStatus.reason || 'Blocked by Administrator' : null
    });
  } catch {
    return NextResponse.json({ success: true, blocked: false });
  }
}
