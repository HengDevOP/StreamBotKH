import { NextRequest, NextResponse } from 'next/server';
import {
  getUsersCollection,
  getAlertSettingsCollection,
  getPaymentSettingsCollection,
  getVideoAlertSettingsCollection,
  getGatewayConfigCollection,
  restoreMasterKhqrImage
} from '@/server/database/mongo';
import { extractYoutubeId } from '@/utils/youtube';

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const rawUsername = params.username || '';
    const cleanUsername = decodeURIComponent(rawUsername).replace(/^@/, '').toLowerCase();
    const escaped = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const usersCol = await getUsersCollection();
    const mongoUser = await usersCol.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { userId: cleanUsername }
      ]
    });

    if (!mongoUser) {
      return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
    }

    const streamerId = mongoUser.userId || (mongoUser as any).id || String(mongoUser._id);

    // Fetch settings from MongoDB collections
    let alertSettings: any = null;
    try {
      const alertCol = await getAlertSettingsCollection();
      alertSettings = await alertCol.findOne({
        $or: [
          { streamerId },
          ...(mongoUser.username ? [{ streamerId: mongoUser.username }] : [])
        ]
      });
    } catch (e) {}

    let paymentSettings: any = null;
    try {
      const paymentCol = await getPaymentSettingsCollection();
      paymentSettings = await paymentCol.findOne({
        $or: [
          { streamerId },
          ...(mongoUser.username ? [{ streamerId: mongoUser.username }] : [])
        ]
      });
    } catch (e) {}

    let videoSettings: any = null;
    try {
      const videoCol = await getVideoAlertSettingsCollection();
      videoSettings = await videoCol.findOne({
        $or: [
          { streamerId },
          ...(mongoUser.username ? [{ streamerId: mongoUser.username }] : [])
        ]
      });
    } catch (e) {}

    let currentPlan = (mongoUser.plan || 'free').toLowerCase();
    if (currentPlan === 'pro' && mongoUser.planExpiresAt) {
      const expiresTime = new Date(mongoUser.planExpiresAt).getTime();
      if (!isNaN(expiresTime) && expiresTime < Date.now()) {
        await usersCol.updateOne(
          { _id: mongoUser._id },
          {
            $set: {
              plan: 'free',
              planStartedAt: null,
              planExpiresAt: null,
              planDurationDays: 0,
              updatedAt: new Date()
            }
          }
        );
        currentPlan = 'free';
      }
    }

    const userSocialLinks: any[] = Array.isArray(mongoUser.socialLinks) ? mongoUser.socialLinks : [];
    const videoAlertEnabled = Boolean(videoSettings?.isEnabled ?? videoSettings?.is_enabled ?? true);

    // Check if streamer has an active uploaded Master KHQR code (verified & restored)
    let khqrImageUrl = '';
    try {
      const restoreResult = await restoreMasterKhqrImage(streamerId, cleanUsername);
      if (restoreResult.restored && restoreResult.khqrImageUrl) {
        khqrImageUrl = restoreResult.khqrImageUrl;
      } else {
        const gatewayCol = await getGatewayConfigCollection();
        const gatewayDoc = await gatewayCol.findOne({
          $or: [
            { _id: `khqr_${streamerId}` },
            { streamerId },
            { _id: `khqr_${cleanUsername}` },
            { streamerId: cleanUsername }
          ]
        });
        if (gatewayDoc?.khqrImageUrl) {
          khqrImageUrl = gatewayDoc.khqrImageUrl;
        }
      }
    } catch (e) {}

    if (!khqrImageUrl && (paymentSettings?.masterKhqrImage || paymentSettings?.master_khqr_image)) {
      khqrImageUrl = paymentSettings.masterKhqrImage || paymentSettings.master_khqr_image;
    }

    return NextResponse.json({
      id: streamerId,
      username: mongoUser.username,
      displayName: mongoUser.displayName || mongoUser.username || 'Streamer',
      avatarUrl: mongoUser.avatarUrl || '',
      bio: mongoUser.bio || '',
      customThanksMessage: mongoUser.customThanksMessage || undefined,
      socialLinks: userSocialLinks,
      links: userSocialLinks,
      isVerified: Boolean(mongoUser.isVerified),
      liveStreamUrl: mongoUser.liveStreamUrl || mongoUser.youtubeLiveUrl || '',
      youtubeId: extractYoutubeId(mongoUser.liveStreamUrl || mongoUser.youtubeLiveUrl) || undefined,
      plan: currentPlan,
      glowColor: alertSettings?.glowColor || alertSettings?.glow_color || '#00F0FF',
      minAmountAlert: Number(alertSettings?.minAmountAlert ?? alertSettings?.min_amount_alert ?? 1.0),
      ttsMinAmount: Number(alertSettings?.ttsMinAmount ?? alertSettings?.tts_min_amount ?? 2.0),
      bakongAccountName: paymentSettings?.bankAccountName || paymentSettings?.bakong_account_name || 'StreamNeon Merchant',
      isSandbox: paymentSettings?.isLiveMode !== undefined ? (paymentSettings.isLiveMode ? 0 : 1) : (paymentSettings?.is_sandbox ?? 1),
      hasVideoOverlay: videoAlertEnabled,
      videoAlertEnabled: videoAlertEnabled,
      videoMinTipAmount: Number(videoSettings?.minTipAmount ?? videoSettings?.min_tip_amount ?? 2.0),
      videoMaxDurationSeconds: Number(videoSettings?.maxDurationSeconds ?? videoSettings?.max_duration_seconds ?? 30),
      hasMasterKhqr: Boolean(khqrImageUrl),
      khqrImageUrl: khqrImageUrl || undefined
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
