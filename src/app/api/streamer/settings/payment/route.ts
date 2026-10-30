import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getPaymentSettingsCollection, restoreMasterKhqrImage } from '@/server/database/mongo';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentCol = await getPaymentSettingsCollection();
    let settings = await paymentCol.findOne({
      $or: [{ streamerId: user.id }, { streamer_id: user.id as any }]
    }) as any;

    if (!settings) {
      const now = new Date();
      await paymentCol.insertOne({
        streamerId: user.id,
        bakongAccountId: 'streamneon@abaa',
        bankAccountName: 'NEON STREAMER VIP',
        abaPaywayMerchantId: 'ec439126',
        abaPaywayApiKey: 'f60b06ca198c61e8601ff7a68393ceee47cb50cb',
        isLiveMode: false,
        createdAt: now,
        updatedAt: now
      });
      settings = await paymentCol.findOne({ streamerId: user.id });
    }

    // If master_khqr_image is missing, restore from MongoDB backup
    if (!settings?.masterKhqrImage && !settings?.master_khqr_image) {
      try {
        const res = await restoreMasterKhqrImage(user.id, user.username);
        if (res.restored) {
          settings = await paymentCol.findOne({ streamerId: user.id });
        }
      } catch (e) {}
    }

    // Format for frontend
    const result: any = {
      streamer_id: user.id,
      aba_merchant_id: settings?.abaPaywayMerchantId || settings?.aba_merchant_id || 'ec439126',
      aba_api_key: settings?.abaPaywayApiKey || settings?.aba_api_key || 'f60b06ca198c61e8601ff7a68393ceee47cb50cb',
      bakong_account_id: settings?.bakongAccountId || settings?.bakong_account_id || 'streamneon@abaa',
      bakong_account_name: settings?.bankAccountName || settings?.bakong_account_name || 'NEON STREAMER VIP',
      is_sandbox: settings?.isLiveMode !== undefined ? (settings.isLiveMode ? 0 : 1) : (settings?.is_sandbox ?? 1),
      master_khqr_image: settings?.masterKhqrImage || settings?.master_khqr_image || ''
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { aba_merchant_id, aba_api_key, bakong_account_id, bakong_account_name, is_sandbox } = body;
    const now = new Date();
    const paymentCol = await getPaymentSettingsCollection();

    await paymentCol.updateOne(
      { streamerId: user.id },
      {
        $set: {
          streamerId: user.id,
          abaPaywayMerchantId: aba_merchant_id || 'ec439126',
          aba_merchant_id: aba_merchant_id || 'ec439126',
          abaPaywayApiKey: aba_api_key || 'f60b06ca198c61e8601ff7a68393ceee47cb50cb',
          aba_api_key: aba_api_key || 'f60b06ca198c61e8601ff7a68393ceee47cb50cb',
          bakongAccountId: bakong_account_id || 'streamneon@abaa',
          bakong_account_id: bakong_account_id || 'streamneon@abaa',
          bankAccountName: bakong_account_name || 'NEON STREAMER VIP',
          bakong_account_name: bakong_account_name || 'NEON STREAMER VIP',
          isLiveMode: !is_sandbox,
          is_sandbox: is_sandbox ? 1 : 0,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );

    const updated = await paymentCol.findOne({ streamerId: user.id });
    return NextResponse.json({
      success: true,
      settings: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
