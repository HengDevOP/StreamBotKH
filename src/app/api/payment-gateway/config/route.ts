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

    const khqrItems = Array.isArray(mongoConfig?.khqrItems)
      ? mongoConfig.khqrItems
      : Array.isArray(mongoPaymentSettings?.khqrItems)
      ? mongoPaymentSettings.khqrItems
      : [];

    if (!khqrImageUrl && khqrItems.length > 0 && khqrItems[0]?.imageUrl) {
      khqrImageUrl = khqrItems[0].imageUrl;
    }

    const config = {
      _id: `khqr_${effectiveStreamerId}`,
      streamerId: effectiveStreamerId,
      khqrImageUrl,
      khqrFilename,
      khqrFileSize,
      khqrMimeType,
      khqrItems,
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

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to manage KHQR payment items.' },
        { status: 401 }
      );
    }

    const streamerId = authUser.id;
    const streamerUsername = authUser.username || '';
    const body = await req.json().catch(() => ({}));

    const gatewayCol = await getGatewayConfigCollection();
    const paymentCol = await getPaymentSettingsCollection();

    const existingConfig = await gatewayCol.findOne({
      $or: [
        { _id: `khqr_${streamerId}` },
        { streamerId },
        ...(streamerUsername ? [{ _id: `khqr_${streamerUsername}` }, { streamerId: streamerUsername }] : [])
      ]
    });

    let currentItems: any[] = Array.isArray(existingConfig?.khqrItems) ? [...existingConfig.khqrItems] : [];

    if (Array.isArray(body.khqrItems)) {
      currentItems = body.khqrItems
        .filter((item: any) => item && item.imageUrl && Number(item.amount) > 0)
        .map((item: any) => ({
          id: String(item.id || `khqr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
          amount: Number(item.amount),
          currency: item.currency === 'KHR' ? 'KHR' : 'USD',
          imageUrl: String(item.imageUrl).trim(),
          filename: item.filename ? String(item.filename) : undefined,
          createdAt: item.createdAt || new Date().toISOString()
        }));
    } else if (body.action === 'add' && body.item) {
      const raw = body.item;
      const amount = Number(raw.amount);
      const currency = raw.currency === 'KHR' ? 'KHR' : 'USD';
      const imageUrl = String(raw.imageUrl || '').trim();
      if (!imageUrl || isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: 'Valid amount, currency, and KHQR image from uploaded media are required.' },
          { status: 400 }
        );
      }

      const newItem = {
        id: String(raw.id || `khqr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
        amount,
        currency,
        imageUrl,
        filename: raw.filename ? String(raw.filename) : undefined,
        createdAt: new Date().toISOString()
      };

      // Replace if editing existing id, otherwise add
      const existingIdx = currentItems.findIndex((i) => i.id === newItem.id);
      if (existingIdx >= 0) {
        currentItems[existingIdx] = newItem;
      } else {
        currentItems.push(newItem);
      }
    } else if (body.action === 'delete' && body.itemId) {
      currentItems = currentItems.filter((i) => i.id !== body.itemId);
    }

    // Sort items by currency (USD first, then KHR) and amount ascending
    currentItems.sort((a, b) => {
      if (a.currency !== b.currency) return a.currency === 'USD' ? -1 : 1;
      return Number(a.amount) - Number(b.amount);
    });

    const primaryImageUrl = currentItems.length > 0 ? currentItems[0].imageUrl : '';

    await gatewayCol.updateOne(
      { _id: `khqr_${streamerId}` },
      {
        $set: {
          streamerId,
          streamerUsername,
          khqrItems: currentItems,
          khqrImageUrl: primaryImageUrl,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    try {
      await paymentCol.updateOne(
        { streamerId },
        {
          $set: {
            khqrItems: currentItems,
            masterKhqrImage: primaryImageUrl,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (e) {}

    return NextResponse.json({
      success: true,
      khqrItems: currentItems,
      config: {
        _id: `khqr_${streamerId}`,
        streamerId,
        khqrImageUrl: primaryImageUrl,
        khqrItems: currentItems,
        updatedAt: new Date()
      }
    });
  } catch (err: any) {
    console.error('API /api/payment-gateway/config POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save KHQR payment items' },
      { status: 500 }
    );
  }
}
