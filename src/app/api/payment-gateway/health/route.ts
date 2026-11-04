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

    // 2. Master KHQR Image Uploaded Status
    let hasKhqrImage = false;
    try {
      const restoreResult = await restoreMasterKhqrImage(streamerId, streamerUsername || undefined);
      if (restoreResult.restored && restoreResult.khqrImageUrl) {
        hasKhqrImage = true;
      } else {
        const gatewayCol = await getGatewayConfigCollection();
        const mongoConfig = await gatewayCol.findOne({
          $or: [
            { _id: `khqr_${streamerId}` },
            { streamerId: streamerId },
            ...(streamerUsername ? [{ _id: `khqr_${streamerUsername}` }, { streamerId: streamerUsername }] : [])
          ]
        });

        if (mongoConfig && typeof mongoConfig.khqrImageUrl === 'string' && mongoConfig.khqrImageUrl.trim() !== '') {
          hasKhqrImage = true;
        } else {
          const payCol = await getPaymentSettingsCollection();
          const mongoPaymentSettings = await payCol.findOne({ streamerId });
          if (mongoPaymentSettings && typeof mongoPaymentSettings.masterKhqrImage === 'string' && mongoPaymentSettings.masterKhqrImage.trim() !== '') {
            hasKhqrImage = true;
          } else if (streamerId === 'demo-streamer-id-1001') {
            const globalConfig = await gatewayCol.findOne({ _id: 'master_khqr_config', khqrImageUrl: { $exists: true, $ne: '' } }) as any;
            if (globalConfig?.khqrImageUrl) hasKhqrImage = true;
          }
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
    if (!hasKhqrImage) missing.push('khqr');
    if (!hasGroupConnected) missing.push('group');

    const isComplete = isGramjsConnected && hasKhqrImage && hasGroupConnected;
    const isIncomplete = !isComplete;

    return NextResponse.json({
      success: true,
      authenticated: true,
      isComplete,
      isIncomplete,
      steps: {
        gramjs: isGramjsConnected,
        khqr: hasKhqrImage,
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
