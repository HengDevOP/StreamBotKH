import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getTemporaryDonationsCollection,
  getDonationsCollection,
  getUsersCollection,
  getPaymentSettingsCollection,
  getGatewayConfigCollection,
  restoreMasterKhqrImage
} from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      streamerId,
      donorName,
      donorMessage,
      amount,
      currency,
      bankingName,
      videoUrl,
      videoTitle,
      videoStartTime,
      videoEndTime,
      isSubscription,
      tierId,
      tierName,
      badgeText,
      badgeColor,
      badgeBg,
      badgeBorder,
      badgeIcon,
      badgeGifUrl,
      badgeImage,
      isWheelSpin,
      donationType
    } = body;

    if (!streamerId || !donorName) {
      return NextResponse.json(
        { error: 'streamerId and donorName are required' },
        { status: 400 }
      );
    }

    const numAmount = amount ? Math.max(0, parseFloat(amount) || 0) : 0;
    const validCurrency = currency === 'KHR' ? 'KHR' : 'USD';
    const donationId = uuidv4();
    const cleanDonorName = String(donorName).slice(0, 25).trim();
    const cleanDonorMessage = donorMessage ? String(donorMessage).slice(0, 200).trim() : '';
    const cleanBankingName = (bankingName && typeof bankingName === 'string')
      ? bankingName.slice(0, 30).trim()
      : 'Bakong KHQR';

    let cleanVideoUrl = videoUrl && typeof videoUrl === 'string' ? videoUrl.trim() : null;
    let cleanVideoTitle = videoTitle && typeof videoTitle === 'string' ? videoTitle.trim() : null;
    let cleanVideoStartTime = Number(videoStartTime) || 0;
    let cleanVideoEndTime = Number(videoEndTime) || 0;

    // Resolve target streamer ID and username from MongoDB
    let resolvedStreamerId = streamerId;
    let resolvedUsername = '';

    try {
      const usersCol = await getUsersCollection();
      const escaped = String(streamerId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mUser = await usersCol.findOne({
        $or: [
          { userId: streamerId },
          { id: streamerId as any },
          { username: { $regex: new RegExp(`^${escaped}$`, 'i') } }
        ]
      });
      if (mUser) {
        resolvedStreamerId = mUser.userId || (mUser as any).id || String(mUser._id);
        resolvedUsername = mUser.username || '';

        // If streamer has not unlocked Video Alerts (not Pro plan and not Admin), strip video attachment
        const streamerPlan = String(mUser.plan || 'free').toLowerCase();
        const isStreamerAdmin = Boolean(
          (mUser as any).isAdmin ||
          (mUser.email && mUser.email.trim().toLowerCase() === 'hchenheng@gmail.com')
        );
        const isVideoAlertsUnlocked = streamerPlan !== 'free' || isStreamerAdmin;
        if (!isVideoAlertsUnlocked) {
          cleanVideoUrl = null;
          cleanVideoTitle = null;
          cleanVideoStartTime = 0;
          cleanVideoEndTime = 0;
        }
      }
    } catch (e) {}

    // Use the official Payment Gateway Master KHQR image uploaded by the streamer (verified & restored)
    let khqrImage = '';
    try {
      const restoreResult = await restoreMasterKhqrImage(resolvedStreamerId, resolvedUsername);
      if (restoreResult.restored && restoreResult.khqrImageUrl) {
        khqrImage = restoreResult.khqrImageUrl;
      } else {
        const gatewayCol = await getGatewayConfigCollection();
        const streamerConfig = await gatewayCol.findOne({
          $or: [
            { _id: `khqr_${resolvedStreamerId}` },
            { streamerId: resolvedStreamerId },
            { _id: `khqr_${streamerId}` },
            { streamerId: streamerId },
            ...(resolvedUsername ? [{ _id: `khqr_${resolvedUsername}` }, { streamerId: resolvedUsername }] : [])
          ]
        });
        if (streamerConfig?.khqrImageUrl) {
          khqrImage = streamerConfig.khqrImageUrl;
        }
      }
    } catch (gatewayErr) {
      console.warn('[Donation] Could not fetch gateway KHQR image from MongoDB:', gatewayErr);
    }

    // 2. Check MongoDB payment_settings table
    if (!khqrImage) {
      try {
        const paymentSettingsCol = await getPaymentSettingsCollection();
        const mongoPayment = await paymentSettingsCol.findOne({
          $or: [
            { streamerId: resolvedStreamerId },
            { streamerId: streamerId },
            ...(resolvedUsername ? [{ streamerId: resolvedUsername }] : [])
          ]
        });
        if (mongoPayment?.masterKhqrImage) {
          khqrImage = mongoPayment.masterKhqrImage;
        }
      } catch (sqlErr) {
        console.warn('[Donation] Could not fetch KHQR from payment_settings:', sqlErr);
      }
    }

    // 3. Optional fallback to global master_khqr_config if non-empty
    if (!khqrImage) {
      try {
        const gatewayCol = await getGatewayConfigCollection();
        const globalConfig = await gatewayCol.findOne({
          _id: 'master_khqr_config',
          khqrImageUrl: { $exists: true, $ne: '' }
        });
        if (globalConfig?.khqrImageUrl) {
          khqrImage = globalConfig.khqrImageUrl;
        }
      } catch (e) {}
    }

    if (!khqrImage) {
      // Graceful Bakong KHQR dynamic QR fallback so tipping and simulation always succeed
      const bakongPayload = `bakong://khqr?amount=${numAmount}&currency=${validCurrency}&recipient=${resolvedUsername || resolvedStreamerId}&order=${donationId}`;
      khqrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(bakongPayload)}`;
    }

    const now = new Date();

    // 1. Save donation in pending state in MongoDB donations collection
    try {
      const donationsCol = await getDonationsCollection();
      await donationsCol.insertOne({
        id: donationId,
        streamerId: resolvedStreamerId,
        streamerUsername: resolvedUsername || undefined,
        donorName: cleanDonorName,
        donorMessage: cleanDonorMessage,
        amount: numAmount,
        currency: validCurrency,
        bankingName: cleanBankingName,
        paymentMethod: 'BAKONG_KHQR',
        qrString: khqrImage,
        videoUrl: cleanVideoUrl || undefined,
        videoTitle: cleanVideoTitle || undefined,
        videoStartTime: cleanVideoStartTime,
        videoEndTime: cleanVideoEndTime,
        status: 'PENDING',
        isSubscription: Boolean(isSubscription),
        isWheelSpin: Boolean(isWheelSpin),
        donationType: donationType || (isWheelSpin ? 'wheel' : isSubscription ? 'subscribe' : 'tip'),
        tierId: tierId || undefined,
        tierName: tierName || undefined,
        badgeText: badgeText || undefined,
        badgeColor: badgeColor || undefined,
        badgeBg: badgeBg || undefined,
        badgeBorder: badgeBorder || undefined,
        badgeIcon: badgeIcon || undefined,
        badgeGifUrl: badgeGifUrl || undefined,
        badgeImage: badgeImage || undefined,
        createdAt: now,
        updatedAt: now
      });
    } catch (errDonation) {
      console.error('[Donation] Error inserting donation into MongoDB:', errDonation);
    }

    // 2. Store in temporary listener collection in MongoDB (100% MongoDB queue)
    try {
      const tempCol = await getTemporaryDonationsCollection();
      await tempCol.insertOne({
        id: donationId,
        streamerId: resolvedStreamerId,
        streamerUsername: resolvedUsername || undefined,
        donorName: cleanDonorName,
        donorMessage: cleanDonorMessage,
        amount: numAmount,
        currency: validCurrency,
        bankingName: cleanBankingName,
        videoUrl: cleanVideoUrl || undefined,
        videoTitle: cleanVideoTitle || undefined,
        videoStartTime: cleanVideoStartTime,
        videoEndTime: cleanVideoEndTime,
        isSubscription: Boolean(isSubscription),
        isWheelSpin: Boolean(isWheelSpin),
        donationType: donationType || (isWheelSpin ? 'wheel' : isSubscription ? 'subscribe' : 'tip'),
        tierId: tierId || undefined,
        tierName: tierName || undefined,
        badgeText: badgeText || undefined,
        badgeColor: badgeColor || undefined,
        badgeBg: badgeBg || undefined,
        badgeBorder: badgeBorder || undefined,
        badgeIcon: badgeIcon || undefined,
        badgeGifUrl: badgeGifUrl || undefined,
        badgeImage: badgeImage || undefined,
        createdAt: now
      });
    } catch (mongoErr) {
      console.warn('[Donation] Could not insert temporary MongoDB record:', mongoErr);
    }

    return NextResponse.json({
      donationId,
      amount: numAmount,
      currency: validCurrency,
      bankingName: cleanBankingName,
      qrString: khqrImage,
      qrImage: khqrImage,
      abaDeepLink: '',
      bakongDeepLink: '',
      expiresInSeconds: 300, // 5 minutes
      isSubscription: Boolean(isSubscription),
      tierId: tierId || undefined,
      tierName: tierName || undefined,
      badgeText: badgeText || undefined,
      badgeColor: badgeColor || undefined,
      badgeIcon: badgeIcon || undefined
    });
  } catch (err: any) {
    console.error('[Donation] Create donation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
