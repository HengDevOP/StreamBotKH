import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { 
  getGatewayConfigCollection, 
  getPaymentSettingsCollection, 
  getMongoMonitoredGroups, 
  restoreMasterKhqrImage 
} from '@/server/database/mongo';
import { telegramUserManager } from '@backend/telegram/telegramUserClient';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        isComplete: true,
        isIncomplete: false,
        steps: {
          gramjs: false,
          khqr: false,
          group: false
        },
        missing: []
      });
    }

    const streamerId = authUser.id;
    const streamerUsername = authUser.username;

    // 1. GramJS Client Connection Status
    let isGramjsConnected = false;
    try {
      const tgStatus = await telegramUserManager.getStatus(streamerId);
      isGramjsConnected = Boolean(tgStatus?.isConnected);
    } catch (e) {
      console.warn('[Payment Gateway Health] GramJS check error:', e);
    }

    // 2. Step 2 KHQR Data Configured Status (Requires client to have added KHQR items)
    let hasKhqrConfigured = false;
    try {
      const gatewayCol = await getGatewayConfigCollection();
      const mongoConfig = await gatewayCol.findOne({
        $or: [
          { _id: `khqr_${streamerId}` },
          { streamerId: streamerId },
          ...(streamerUsername ? [{ _id: `khqr_${streamerUsername}` }, { streamerId: streamerUsername }] : [])
        ]
      });

      const payCol = await getPaymentSettingsCollection();
      const mongoPaymentSettings = await payCol.findOne({ streamerId });

      const items: any[] = Array.isArray(mongoConfig?.khqrItems)
        ? mongoConfig.khqrItems
        : Array.isArray(mongoPaymentSettings?.khqrItems)
        ? mongoPaymentSettings.khqrItems
        : [];

      // Step 2 is considered complete if the client has added at least 1 KHQR item or configured Custom KHQR
      if (items.length > 0 || Boolean(mongoConfig?.customKhqrImageUrl || mongoPaymentSettings?.customKhqrImageUrl)) {
        hasKhqrConfigured = true;
      } else if (streamerId === 'demo-streamer-id-1001') {
        const globalConfig = (await gatewayCol.findOne({ _id: 'master_khqr_config' })) as any;
        if (Array.isArray(globalConfig?.khqrItems) && globalConfig.khqrItems.length > 0) {
          hasKhqrConfigured = true;
        } else if (globalConfig?.customKhqrImageUrl) {
          hasKhqrConfigured = true;
        }
      }
    } catch (e) {
      console.warn('[Payment Gateway Health] KHQR check error:', e);
    }

    // 3. Telegram Monitored Group Connection Status
    let hasGroupConnected = false;
    try {
      if (isGramjsConnected) {
        const mongoGroups = await getMongoMonitoredGroups(streamerId);
        hasGroupConnected = Boolean(mongoGroups && mongoGroups.length > 0);
      }
    } catch (e) {
      console.warn('[Payment Gateway Health] Group check error:', e);
    }

    const missing: string[] = [];
    if (!isGramjsConnected) missing.push('gramjs');
    if (!hasKhqrConfigured) missing.push('khqr');
    if (!hasGroupConnected) missing.push('group');

    const isComplete = isGramjsConnected && hasKhqrConfigured && hasGroupConnected;
    const isIncomplete = !isComplete;

    return NextResponse.json({
      success: true,
      authenticated: true,
      isComplete,
      isIncomplete,
      steps: {
        gramjs: isGramjsConnected,
        khqr: hasKhqrConfigured,
        group: hasGroupConnected
      },
      missing
    });
  } catch (err: any) {
    console.error('API /payment-gateway/health error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed checking payment gateway health' },
      { status: 500 }
    );
  }
}
