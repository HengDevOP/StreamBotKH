import { NextRequest, NextResponse } from 'next/server';
import { getGatewayConfigCollection, getPaymentSettingsCollection, getUsersCollection, restoreMasterKhqrImage } from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paramStreamerId = searchParams.get('streamerId');
    const paramUsername = searchParams.get('username');

    let streamerId: string | null = null;
    let streamerUsername: string | null = null;

    const usersCol = await getUsersCollection();

    if (paramStreamerId) {
      streamerId = paramStreamerId;
      try {
        const mUser = await usersCol.findOne({
          $or: [
            { userId: paramStreamerId },
            { id: paramStreamerId },
            { username: { $regex: new RegExp(`^${paramStreamerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
          ]
        }) as any;
        if (mUser?.username) streamerUsername = mUser.username;
        if (mUser?.userId || mUser?.id) streamerId = mUser.userId || mUser.id;
      } catch (e) {}
    }

    if (paramUsername) {
      const clean = paramUsername.replace(/^@/, '').trim();
      try {
        const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const mUser = await usersCol.findOne({
          $or: [
            { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
            { userId: clean },
            { id: clean }
          ]
        }) as any;
        if (mUser?.userId || mUser?.id) {
          streamerId = mUser.userId || mUser.id;
          streamerUsername = mUser.username;
        }
      } catch (e) {}
    }

    if (!streamerId) {
      const authUser = getAuthenticatedUser(req);
      if (authUser?.id) {
        streamerId = authUser.id;
        streamerUsername = authUser.username;
      }
    }

    const effectiveStreamerId = streamerId || 'demo-streamer-id-1001';

    // 0. Automatically restore and verify Master KHQR from persistent backup if file was deleted or server restarted
    const restoreResult = await restoreMasterKhqrImage(effectiveStreamerId, streamerUsername || undefined);

    // 1. Check MongoDB payment_settings for this streamer
    let mongoPaymentSettings: any = null;
    try {
      const payCol = await getPaymentSettingsCollection();
      mongoPaymentSettings = await payCol.findOne({ streamerId: effectiveStreamerId });
    } catch (e) {}

    // 2. Check MongoDB gateway_settings for this streamer
    let mongoConfig: any = null;
    try {
      const gatewayCol = await getGatewayConfigCollection();
      mongoConfig = await gatewayCol.findOne({
        $or: [
          { _id: `khqr_${effectiveStreamerId}` },
          { streamerId: effectiveStreamerId },
          ...(streamerUsername ? [{ _id: `khqr_${streamerUsername}` }, { streamerId: streamerUsername }] : [])
        ]
      });
    } catch (e) {}

    let khqrImageUrl = '';
    if (restoreResult.restored && restoreResult.khqrImageUrl) {
      khqrImageUrl = restoreResult.khqrImageUrl;
    } else if (mongoConfig && typeof mongoConfig.khqrImageUrl === 'string' && mongoConfig.khqrImageUrl.trim() !== '') {
      khqrImageUrl = mongoConfig.khqrImageUrl.trim();
    } else if (mongoPaymentSettings && typeof mongoPaymentSettings.masterKhqrImage === 'string' && mongoPaymentSettings.masterKhqrImage.trim() !== '') {
      khqrImageUrl = mongoPaymentSettings.masterKhqrImage.trim();
    } else if (effectiveStreamerId === 'demo-streamer-id-1001') {
      try {
        const gatewayCol = await getGatewayConfigCollection();
        const globalConfig = await gatewayCol.findOne({ _id: 'master_khqr_config', khqrImageUrl: { $exists: true, $ne: '' } }) as any;
        if (globalConfig?.khqrImageUrl) khqrImageUrl = globalConfig.khqrImageUrl;
      } catch (e) {}
    }

    const khqrFilename = restoreResult.filename || mongoConfig?.khqrFilename || mongoPaymentSettings?.masterKhqrFilename || '';
    const khqrFileSize = restoreResult.fileSize || mongoConfig?.khqrFileSize || mongoPaymentSettings?.masterKhqrFileSize || 0;
    const khqrMimeType = restoreResult.mimeType || mongoConfig?.khqrMimeType || mongoPaymentSettings?.masterKhqrMimeType || '';

    const bankAccountName =
      mongoPaymentSettings?.bakongAccountName ||
      mongoPaymentSettings?.bakong_account_name ||
      mongoConfig?.bankAccountName ||
      (streamerUsername ? `${streamerUsername.toUpperCase()} OFFICIAL KHQR` : 'STREAMBOTKH OFFICIAL KHQR');

    const bakongAccountId =
      mongoPaymentSettings?.bakongAccountId ||
      mongoPaymentSettings?.bakong_account_id ||
      mongoConfig?.bakongAccountId ||
      (streamerUsername ? `${streamerUsername.toLowerCase()}@abaa` : 'streambotkh@abaa');

    const config = {
      _id: `khqr_${effectiveStreamerId}`,
      streamerId: effectiveStreamerId,
      khqrImageUrl,
      khqrFilename,
      khqrFileSize,
      khqrMimeType,
      bankAccountName,
      bakongAccountId,
      updatedAt: mongoConfig?.updatedAt || mongoPaymentSettings?.updatedAt || new Date()
    };

    return NextResponse.json({
      success: true,
      config
    });
  } catch (err: any) {
    console.error('API /api/payment-gateway/config GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch payment gateway config' },
      { status: 500 }
    );
  }
}
