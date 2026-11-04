import { NextRequest, NextResponse } from 'next/server';
import { telegramGroupListener } from '@backend/telegram/telegramListener';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const isAdmin = isAdminEmail(authUser.email);

    const isRunning = telegramGroupListener.isRunning();
    const botInfo = telegramGroupListener.getBotInfo();
    const monitoredGroups = telegramGroupListener.getMonitoredGroups();
    const recentLogs = telegramGroupListener.getRecentLogs();
    const hasToken = Boolean(telegramGroupListener.getToken());

    // Non-admin streamers only see basic status, preventing leak of global bank receipts
    const filteredLogs = isAdmin ? recentLogs.slice(0, 15) : [];

    return NextResponse.json({
      isRunning,
      hasToken,
      bot: botInfo,
      monitoredGroups: isAdmin ? monitoredGroups : [],
      recentLogsCount: isAdmin ? recentLogs.length : 0,
      recentLogs: filteredLogs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
