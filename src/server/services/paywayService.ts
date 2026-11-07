import crypto from 'crypto';
import axios from 'axios';
import {
  getDonationsCollection,
  getUsersCollection,
  getAlertSettingsCollection,
  getVideoAlertSettingsCollection,
  getAlertBoxesCollection,
  resolveMatchingAlertBox,
  getPaymentSettingsCollection,
  getSubscribersCollection,
  getSubscriberSettingsCollection,
  getWheelSettingsCollection,
  buildSubscriberUsernameQuery
} from '../database/mongo';
import { broadcastAlertToOverlay, broadcastDonationToDashboard, getIO } from './socketService';
import { sendTelegramDonationAlert } from './telegramService';

export interface PayWayCheckoutParams {
  donationId: string;
  streamerId: string;
  amount: number;
  currency: 'USD' | 'KHR';
  donorName: string;
}

export function generatePayWayHash(data: string, apiKey: string): string {
  return crypto.createHmac('sha512', apiKey).update(data).digest('base64');
}

export interface ProcessPaymentSuccessParams {
  donationId: string;
  paywayTranId?: string;
  bakongHash?: string;
}

/**
 * Marks donation as PAID in MongoDB Atlas, triggers OBS overlay alert, updates dashboard, and sends Telegram alert
 */
export async function handleSuccessfulPayment(params: ProcessPaymentSuccessParams) {
  const { donationId, paywayTranId, bakongHash } = params;

  // 1. Retrieve donation from MongoDB
  const donationsCol = await getDonationsCollection();
  const donation = await donationsCol.findOne({
    $or: [{ id: donationId }, { _id: donationId as any }]
  });

  if (!donation) {
    throw new Error(`Donation not found: ${donationId}`);
  }

  if (donation.status === 'PAID') {
    console.log(`[Payment] Donation ${donationId} already marked as PAID`);
    return donation;
  }

  const now = new Date();
  const resolvedPaywayTranId = paywayTranId || `ABA-${Date.now()}`;
  const resolvedBakongHash = bakongHash || `BKG-${Date.now()}`;

  // 2. Update donation status in MongoDB
  await donationsCol.updateOne(
    { _id: donation._id },
    {
      $set: {
        status: 'PAID',
        paywayTranId: resolvedPaywayTranId,
        bakongHash: resolvedBakongHash,
        paidAt: now,
        isAlerted: true,
        updatedAt: now
      }
    }
  );

  // 3. Fetch streamer & settings from MongoDB
  const usersCol = await getUsersCollection();
  const streamer = await usersCol.findOne({
    $or: [
      { userId: donation.streamerId },
      { id: donation.streamerId as any },
      ...(donation.streamerUsername ? [{ username: donation.streamerUsername }] : [])
    ]
  });

  if (streamer) {
    const streamerKey = streamer.userId || (streamer as any).id || String(streamer._id);
    const alertSettingsCol = await getAlertSettingsCollection();
    const alertSettings = await alertSettingsCol.findOne({
      $or: [{ streamerId: streamerKey }, ...(streamer.username ? [{ streamerId: streamer.username }] : [])]
    });

    const videoSettingsCol = await getVideoAlertSettingsCollection();
    const videoSettings = await videoSettingsCol.findOne({
      $or: [{ streamerId: streamerKey }, ...(streamer.username ? [{ streamerId: streamer.username }] : [])]
    });

    let matchingBox: any = null;
    try {
      const alertBoxesCol = await getAlertBoxesCollection();
      const activeBoxes = await alertBoxesCol
        .find({
          $or: [
            { userId: streamerKey },
            { streamerId: streamerKey },
            ...(streamer.username ? [{ userId: streamer.username }, { streamerId: streamer.username }] : []),
            ...(streamer.email ? [{ userId: streamer.email }, { userEmail: streamer.email }] : []),
            ...(streamer.overlayToken ? [{ overlayToken: streamer.overlayToken }, { token: streamer.overlayToken }] : [])
          ]
        })
        .sort({ minAmountCondition: -1 })
        .toArray();

      const effectiveAmountUsd = donation.currency === 'KHR' ? donation.amount / 4000 : donation.amount;
      matchingBox = resolveMatchingAlertBox(activeBoxes, effectiveAmountUsd);
    } catch (e) {
      console.warn('[PaywayService] Could not fetch mongo alert boxes:', e);
    }

    // If subscription, fetch subscriber tier alertSettings from MongoDB
    let tierAlertSettings: any = null;
    let tierName = donation.tierName;
    let badgeText = donation.badgeText;
    let badgeColor = donation.badgeColor;
    let badgeGifUrl = donation.badgeGifUrl || (donation as any).badgeImage;
    if (donation.isSubscription) {
      try {
        const subSettingsCol = await getSubscriberSettingsCollection();
        const subSettingsDoc = await subSettingsCol.findOne({
          $or: [
            ...(streamer.overlayToken ? [{ streamerToken: streamer.overlayToken }] : []),
            ...(streamer.username ? [{ streamerUsername: streamer.username }] : []),
            { streamerToken: streamerKey }
          ]
        });
        if (subSettingsDoc && Array.isArray(subSettingsDoc.tiers)) {
          const foundTier = subSettingsDoc.tiers.find(
            (t) => (donation.tierId && t.id === donation.tierId) || (tierName && t.name.toLowerCase() === tierName.toLowerCase())
          ) || subSettingsDoc.tiers[0];
          if (foundTier?.alertSettings) {
            tierAlertSettings = foundTier.alertSettings;
          }
          if (foundTier) {
            if (!tierName) tierName = foundTier.name;
            if (!badgeText && foundTier.badgeText) badgeText = foundTier.badgeText;
            if (!badgeColor && foundTier.badgeColor) badgeColor = foundTier.badgeColor;
            if (!badgeGifUrl && (foundTier.badgeGifUrl || foundTier.badgeImage)) {
              badgeGifUrl = foundTier.badgeGifUrl || foundTier.badgeImage;
            }
          }
        }
      } catch (e) {
        console.warn('[PaywayService] Could not fetch subscriber tier alertSettings:', e);
      }
    }

    // Only alert if amount is >= min_amount_alert
    const minAlert = matchingBox ? (Number(matchingBox.minAmountCondition) || 0) : (alertSettings?.minAmountAlert || 0);
    const donationUsd = donation.currency === 'KHR' ? donation.amount / 4000 : donation.amount;

    if (donationUsd >= minAlert - 0.0001) {
      const alertPayload = {
        boxId: matchingBox?._id ? String(matchingBox._id) : undefined,
        donationId: donation.id,
        donorName: donation.donorName,
        donorMessage: donation.donorMessage,
        donor_message: donation.donorMessage,
        message: donation.donorMessage,
        amount: donation.amount,
        currency: donation.currency,
        bankingName: donation.bankingName || 'Bakong KHQR',
        isSubscription: donation.isSubscription || undefined,
        tierId: donation.tierId || undefined,
        tierName: tierName || undefined,
        badgeText: badgeText || undefined,
        badgeColor: badgeColor || undefined,
        videoUrl: donation.videoUrl || undefined,
        videoTitle: donation.videoTitle || undefined,
        videoStartTime: Number(donation.videoStartTime) || 0,
        videoEndTime: Number(donation.videoEndTime) || 0,
        videoAlertEnabled: Boolean(videoSettings?.isEnabled ?? true),
        videoMinTipAmount: Number(videoSettings?.minTipAmount ?? 0.25),
        videoMaxDurationSeconds: Number(videoSettings?.maxDurationSeconds ?? 300),
        templateStyle: (donation.isSubscription && tierAlertSettings?.templateStyle) || matchingBox?.templateStyle || alertSettings?.templateStyle || 'neon-box',
        textTemplate: donation.isSubscription
          ? (tierAlertSettings?.textTemplate || '{name} joined as a {tier} subscriber!')
          : (matchingBox?.textTemplate || alertSettings?.textTemplate || '{donator} donated {amount} through superchat!'),
        textColor: (donation.isSubscription && tierAlertSettings?.textColor) || matchingBox?.textColor || alertSettings?.textColor || '#FFFFFF',
        donorColor: (donation.isSubscription && (tierAlertSettings?.subscriberColor || tierAlertSettings?.donorColor)) || matchingBox?.donorColor || undefined,
        amountColor: (donation.isSubscription && (tierAlertSettings?.tierColor || tierAlertSettings?.amountColor)) || matchingBox?.amountColor || undefined,
        customGifUrl: (donation.isSubscription && tierAlertSettings?.mediaUrl) || badgeGifUrl || matchingBox?.mediaUrl || alertSettings?.customGifUrl,
        mediaUrl: (donation.isSubscription && tierAlertSettings?.mediaUrl) || badgeGifUrl || matchingBox?.mediaUrl || alertSettings?.customGifUrl,
        showImage: (donation.isSubscription && tierAlertSettings?.showImage !== undefined) ? tierAlertSettings.showImage : (matchingBox?.showImage !== undefined ? matchingBox.showImage : (alertSettings?.showImage !== false)),
        fontFamily: (donation.isSubscription && tierAlertSettings?.fontFamily) || matchingBox?.fontFamily || alertSettings?.fontFamily || 'Chakra Petch',
        fontSize: (donation.isSubscription && tierAlertSettings?.fontSize) || matchingBox?.fontSize || alertSettings?.fontSize || 28,
        layoutMode: (donation.isSubscription && tierAlertSettings?.layoutMode) || matchingBox?.layoutMode || alertSettings?.layoutMode || 'top',
        animationStyle: (donation.isSubscription && tierAlertSettings?.animationStyle) || matchingBox?.animationStyle || alertSettings?.animationStyle || 'fade',
        glowColor: (donation.isSubscription && (tierAlertSettings?.glowColor || badgeColor)) || (matchingBox?.glowColor || alertSettings?.glowColor || '#00F0FF'),
        soundUrl: (donation.isSubscription && tierAlertSettings?.soundUrl)
          ? tierAlertSettings.soundUrl
          : ((matchingBox?.soundUrl && !matchingBox.soundUrl.includes('neon-chime'))
              ? matchingBox.soundUrl
              : (alertSettings?.soundUrl && !alertSettings.soundUrl.includes('neon-chime')
                  ? alertSettings.soundUrl
                  : '/sounds/cash-register-kaching.mp3')),
        soundVolume: (donation.isSubscription && tierAlertSettings?.soundVolume !== undefined)
          ? tierAlertSettings.soundVolume
          : (matchingBox?.soundVolume ?? alertSettings?.soundVolume ?? 0.85),
        durationSeconds: (donation.isSubscription && tierAlertSettings?.durationSeconds)
          ? tierAlertSettings.durationSeconds
          : (matchingBox?.durationSeconds || alertSettings?.durationSeconds || 8),
        ttsEnabled: (donation.isSubscription && tierAlertSettings?.ttsEnabled !== undefined)
          ? tierAlertSettings.ttsEnabled
          : (matchingBox?.ttsEnabled !== undefined ? matchingBox.ttsEnabled : Boolean(alertSettings?.ttsEnabled)),
        ttsType: (donation.isSubscription && tierAlertSettings?.ttsType)
          ? tierAlertSettings.ttsType
          : (matchingBox?.ttsType || alertSettings?.ttsVoice || 'google'),
        clonedVoiceSampleUrl: (donation.isSubscription && tierAlertSettings?.clonedVoiceSampleUrl)
          ? tierAlertSettings.clonedVoiceSampleUrl
          : (matchingBox?.clonedVoiceSampleUrl || alertSettings?.clonedVoiceSampleUrl)
      };

      // Real-time broadcast to OBS overlay room
      const overlayToken = streamer.overlayToken || (streamer as any).overlay_token;
      if (overlayToken) {
        broadcastAlertToOverlay(overlayToken, alertPayload);
      }
    }

    // If donation was a subscription, activate the subscriber in MongoDB subscribers collection
    let subscriberRecord: any = null;
    if (donation.isSubscription) {
      try {
        const subCol = await getSubscribersCollection();
        const subCleanName = (donation.donorName || 'Subscriber').trim();
        const youtubeHandle = subCleanName.replace(/^@+/, '').trim();
        const subscribedAt = now;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const overlayToken = streamer?.overlayToken || (streamer as any)?.overlay_token || 'demo-token';

        subscriberRecord = {
          id: 'sub_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          streamerToken: overlayToken,
          streamerUsername: streamer?.username || streamerKey,
          subscriberName: subCleanName,
          youtubeHandle,
          tierId: donation.tierId || 'tier_sub',
          tierName: donation.tierName || 'Subscriber',
          price: donation.amount,
          currency: donation.currency || 'USD',
          badgeText: donation.badgeText || 'SUB',
          badgeColor: donation.badgeColor || '#00F0FF',
          badgeBg: donation.badgeBg || 'rgba(0, 240, 255, 0.2)',
          badgeBorder: donation.badgeBorder || 'rgba(0, 240, 255, 0.4)',
          badgeIcon: donation.badgeIcon || 'Crown',
          badgeGifUrl: donation.badgeGifUrl || donation.badgeImage,
          badgeImage: donation.badgeImage || donation.badgeGifUrl,
          paymentMethod: donation.bankingName || 'Bakong KHQR',
          status: 'active',
          subscribedAt,
          expiresAt,
          donorMessage: donation.donorMessage,
          transactionId: resolvedPaywayTranId
        };

        await subCol.updateOne(
          {
            streamerToken: overlayToken,
            ...buildSubscriberUsernameQuery(subCleanName)
          },
          { $set: subscriberRecord },
          { upsert: true }
        );

        console.log(`👑 [PayWay/Simulator] Activated 30-day subscriber membership for "${subCleanName}" (${donation.tierName})!`);

        const io = getIO();
        if (io) {
          if (overlayToken) io.to(`overlay:${overlayToken}`).emit('subscriber:new', subscriberRecord);
          io.to(`dashboard:${streamerKey}`).emit('subscriber:new', subscriberRecord);
          if (overlayToken !== 'demo-token') {
            io.to(`dashboard:${overlayToken}`).emit('subscriber:new', subscriberRecord);
            io.to('overlay:demo-token').emit('subscriber:new', subscriberRecord);
          }
        }
      } catch (subErr) {
        console.error('[Subscriber] Error creating subscriber record in handleSuccessfulPayment:', subErr);
      }
    }

    // If donation was for Wheel Spin, trigger live wheel spin on stream overlay
    if ((donation as any).isWheelSpin || (donation as any).donationType === 'wheel') {
      try {
        const wheelCol = await getWheelSettingsCollection();
        const overlayToken = streamer?.overlayToken || (streamer as any)?.overlay_token;
        const wheelDoc = await wheelCol.findOne({
          $or: [
            ...(overlayToken ? [{ streamerToken: overlayToken }] : []),
            ...(streamer?.username ? [{ streamerUsername: streamer.username }] : [])
          ]
        });

        if (wheelDoc && wheelDoc.isEnabled && Array.isArray(wheelDoc.slices) && wheelDoc.slices.length > 0) {
          const slices = wheelDoc.slices;
          const totalWeight = slices.reduce((acc, s) => acc + (Number(s.percentage) || (100 / slices.length)), 0);
          let rand = Math.random() * totalWeight;
          let winningSlice = slices[0];
          for (const s of slices) {
            const weight = Number(s.percentage) || (100 / slices.length);
            if (rand <= weight) {
              winningSlice = s;
              break;
            }
            rand -= weight;
          }

          const degreesPerSlice = 360 / slices.length;
          const sliceIndex = slices.findIndex((s) => s.id === winningSlice.id);
          const targetSliceAngle = (sliceIndex >= 0 ? sliceIndex : 0) * degreesPerSlice + degreesPerSlice / 2;
          const extraRotations = 5 * 360;
          const totalRotation = extraRotations + (360 - (targetSliceAngle % 360));

          const io = getIO();
          if (io && overlayToken) {
            io.to(`overlay:${overlayToken}`).emit('wheel:spin', {
              donorName: donation.donorName,
              amount: donation.amount,
              totalRotation,
              slices,
              winner: winningSlice.label,
              spinSoundUrl: wheelDoc.spinSoundUrl
            });
            if (overlayToken !== 'demo-token') {
              io.to('overlay:demo-token').emit('wheel:spin', {
                donorName: donation.donorName,
                amount: donation.amount,
                totalRotation,
                slices,
                winner: winningSlice.label,
                spinSoundUrl: wheelDoc.spinSoundUrl
              });
            }
          }
          console.log(`🎡 [Wheel] Live wheel spin broadcasted for ${donation.donorName}! Winner: "${winningSlice.label}"`);
        }
      } catch (wheelErr) {
        console.error('[Wheel] Error triggering wheel spin in handleSuccessfulPayment:', wheelErr);
      }
    }

    // Broadcast updated transaction to streamer dashboard
    broadcastDonationToDashboard(streamerKey, {
      ...donation,
      status: 'PAID',
      is_subscription: donation.isSubscription,
      subscriber: subscriberRecord,
      paidAt: now.toISOString(),
      paid_at: now.toISOString()
    });

    // 4. Send Telegram Bot notification to streamer if linked
    const telegramChatId = (streamer as any).telegramChatId || (streamer as any).telegram_chat_id;
    if (telegramChatId) {
      await sendTelegramDonationAlert({
        chatId: telegramChatId,
        streamerName: streamer.displayName || streamer.username,
        donorName: donation.donorName,
        donorMessage: donation.donorMessage,
        amount: donation.amount,
        currency: donation.currency,
        bankingName: donation.bankingName,
        tranId: resolvedPaywayTranId
      });
    }
  }

  return { success: true, donationId };
}

/**
 * Checks transaction status with ABA PayWay API using Pro streamer credentials in MongoDB.
 */
export async function checkPayWayTransaction(tranId: string, streamerId: string) {
  const paymentSettingsCol = await getPaymentSettingsCollection();
  const paymentSettings = await paymentSettingsCol.findOne({
    $or: [{ streamerId }, { _id: streamerId as any }]
  });

  const merchantId = (paymentSettings as any)?.abaMerchantId || (paymentSettings as any)?.aba_merchant_id;
  const apiKey = (paymentSettings as any)?.abaApiKey || (paymentSettings as any)?.aba_api_key;

  if (!merchantId || !apiKey) {
    console.warn(`[PayWay] No merchant credentials configured for streamer ${streamerId}. Skipping check.`);
    return null;
  }

  const reqTime = Math.floor(Date.now() / 1000).toString();
  const hashString = `${reqTime}${merchantId}${tranId}`;
  const hash = generatePayWayHash(hashString, apiKey);

  try {
    const checkTranUrl = process.env.ABA_PAYWAY_CHECK_TRAN_URL || 'https://checkout.payway.com.kh/api/payment-gateway/v1/payments/check-transaction';
    const response = await axios.post(
      checkTranUrl,
      {
        req_time: reqTime,
        merchant_id: merchantId,
        tran_id: tranId,
        hash
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000
      }
    );

    return response.data;
  } catch (err: any) {
    console.error('[PayWay] Check transaction error:', err.message);
    return null;
  }
}
