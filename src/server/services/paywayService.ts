import crypto from 'crypto';
import axios from 'axios';
import {
  getDonationsCollection,
  getUsersCollection,
  getAlertSettingsCollection,
  getVideoAlertSettingsCollection,
  getAlertBoxesCollection,
  getPaymentSettingsCollection
} from '../database/mongo';
import { broadcastAlertToOverlay, broadcastDonationToDashboard } from './socketService';
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
          ],
          isEnabled: true
        })
        .sort({ minAmountCondition: -1 })
        .toArray();

      const effectiveAmountUsd = donation.currency === 'KHR' ? donation.amount / 4000 : donation.amount;
      const matchingBoxes = activeBoxes.filter(
        (b) => effectiveAmountUsd >= ((Number(b.minAmountCondition) || 0) - 0.0001)
      );
      matchingBox = matchingBoxes.length > 0
        ? matchingBoxes[0]
        : (activeBoxes.length > 0 ? activeBoxes[activeBoxes.length - 1] : null);
    } catch (e) {
      console.warn('[PaywayService] Could not fetch mongo alert boxes:', e);
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
        videoUrl: donation.videoUrl || undefined,
        videoTitle: donation.videoTitle || undefined,
        videoStartTime: Number(donation.videoStartTime) || 0,
        videoEndTime: Number(donation.videoEndTime) || 0,
        videoAlertEnabled: Boolean(videoSettings?.isEnabled ?? true),
        videoMinTipAmount: Number(videoSettings?.minTipAmount ?? 0.25),
        videoMaxDurationSeconds: Number(videoSettings?.maxDurationSeconds ?? 300),
        templateStyle: matchingBox?.templateStyle || alertSettings?.templateStyle || 'neon-box',
        textTemplate: matchingBox?.textTemplate || alertSettings?.textTemplate || '{donator} donated {amount} through superchat!',
        textColor: matchingBox?.textColor || alertSettings?.textColor || '#FFFFFF',
        donorColor: matchingBox?.donorColor || undefined,
        amountColor: matchingBox?.amountColor || undefined,
        customGifUrl: matchingBox?.mediaUrl || alertSettings?.customGifUrl,
        mediaUrl: matchingBox?.mediaUrl || alertSettings?.customGifUrl,
        showImage: matchingBox?.showImage !== undefined ? matchingBox.showImage : (alertSettings?.showImage !== false),
        fontFamily: matchingBox?.fontFamily || alertSettings?.fontFamily || 'Chakra Petch',
        fontSize: matchingBox?.fontSize || alertSettings?.fontSize || 28,
        layoutMode: matchingBox?.layoutMode || alertSettings?.layoutMode || 'top',
        animationStyle: matchingBox?.animationStyle || alertSettings?.animationStyle || 'fade',
        glowColor: matchingBox?.glowColor || alertSettings?.glowColor || '#00F0FF',
        soundUrl: (matchingBox?.soundUrl && !matchingBox.soundUrl.includes('neon-chime'))
          ? matchingBox.soundUrl
          : (alertSettings?.soundUrl && !alertSettings.soundUrl.includes('neon-chime')
              ? alertSettings.soundUrl
              : '/sounds/cash-register-kaching.mp3'),
        soundVolume: matchingBox?.soundVolume ?? alertSettings?.soundVolume ?? 0.85,
        durationSeconds: matchingBox?.durationSeconds || alertSettings?.durationSeconds || 8,
        ttsEnabled: matchingBox?.ttsEnabled !== undefined ? matchingBox.ttsEnabled : (alertSettings?.ttsEnabled === true && donation.amount >= ((alertSettings as any)?.ttsMinAmount || alertSettings?.minAmountAlert || 0)),
        ttsType: matchingBox?.ttsType || alertSettings?.ttsVoice || 'google',
        clonedVoiceSampleUrl: matchingBox?.clonedVoiceSampleUrl || alertSettings?.clonedVoiceSampleUrl
      };

      // Real-time broadcast to OBS overlay room
      const overlayToken = streamer.overlayToken || (streamer as any).overlay_token;
      if (overlayToken) {
        broadcastAlertToOverlay(overlayToken, alertPayload);
      }
    }

    // Broadcast updated transaction to streamer dashboard
    broadcastDonationToDashboard(streamerKey, {
      ...donation,
      status: 'PAID',
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
