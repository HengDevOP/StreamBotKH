import { NextRequest, NextResponse } from 'next/server';
import { telegramGroupListener } from '@backend/telegram/telegramListener';

export async function GET(_req: NextRequest) {
  try {
    const isRunning = telegramGroupListener.isRunning();
    const botInfo = telegramGroupListener.getBotInfo();
    const monitoredGroups = telegramGroupListener.getMonitoredGroups();
    const recentLogs = telegramGroupListener.getRecentLogs();
    const hasToken = Boolean(telegramGroupListener.getToken());

    return NextResponse.json({
      isRunning,
      hasToken,
      bot: botInfo,
      monitoredGroups,
      recentLogsCount: recentLogs.length,
      recentLogs: recentLogs.slice(0, 15)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
