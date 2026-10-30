import crypto from 'crypto';
import axios from 'axios';
import { db } from '../database/db';
import { getAlertBoxesCollection } from '../database/mongo';
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
 * Marks donation as PAID, triggers OBS overlay alert, updates dashboard, and sends Telegram alert
 */
export async function handleSuccessfulPayment(params: ProcessPaymentSuccessParams) {
  const { donationId, paywayTranId, bakongHash } = params;

  // 1. Retrieve donation
  const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId) as any;
  if (!donation) {
    throw new Error(`Donation not found: ${donationId}`);
  }

  if (donation.status === 'PAID') {
    console.log(`[Payment] Donation ${donationId} already marked as PAID`);
    return donation;
  }

  // 2. Update donation status in DB
  const updateDonation = db.prepare(`
    UPDATE donations
    SET status = 'PAID',
        payway_tran_id = COALESCE(?, payway_tran_id),
        bakong_hash = COALESCE(?, bakong_hash),
        paid_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  updateDonation.run(paywayTranId || `ABA-${Date.now()}`, bakongHash || `BKG-${Date.now()}`, donationId);

  // 3. Fetch streamer & alert settings
  const streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(donation.streamer_id) as any;
  const alertSettings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(donation.streamer_id) as any;

  if (streamer) {
    let matchingBox: any = null;
    try {
      const alertBoxesCol = await getAlertBoxesCollection();
      const activeBoxes = await alertBoxesCol
        .find({
          $or: [
            { userId: streamer.id },
            { streamerId: streamer.id },
            ...(streamer.username ? [{ userId: streamer.username }, { streamerId: streamer.username }] : []),
            ...(streamer.email ? [{ userId: streamer.email }, { userEmail: streamer.email }] : []),
            ...(streamer.overlay_token ? [{ overlayToken: streamer.overlay_token }, { token: streamer.overlay_token }] : [])
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
    const minAlert = matchingBox ? (Number(matchingBox.minAmountCondition) || 0) : (alertSettings?.min_amount_alert || 0);
    const donationUsd = donation.currency === 'KHR' ? donation.amount / 4000 : donation.amount;

    if (donationUsd >= minAlert - 0.0001) {
      const alertPayload = {
        boxId: matchingBox?._id ? String(matchingBox._id) : undefined,
        donationId: donation.id,
        donorName: donation.donor_name,
        donorMessage: donation.donor_message,
        donor_message: donation.donor_message,
        message: donation.donor_message,
        amount: donation.amount,
        currency: donation.currency,
        bankingName: donation.banking_name || 'Bakong KHQR',
        templateStyle: matchingBox?.templateStyle || alertSettings?.template_style || 'neon-box',
        textTemplate: matchingBox?.textTemplate || alertSettings?.text_template || '{donator} donated {amount} through superchat!',
        textColor: matchingBox?.textColor || alertSettings?.text_color || '#FFFFFF',
        donorColor: matchingBox?.donorColor || undefined,
        amountColor: matchingBox?.amountColor || undefined,
        customGifUrl: matchingBox?.mediaUrl || alertSettings?.custom_gif_url,
        mediaUrl: matchingBox?.mediaUrl || alertSettings?.custom_gif_url,
        showImage: matchingBox?.showImage !== undefined ? matchingBox.showImage : (alertSettings?.show_image !== 0),
        fontFamily: matchingBox?.fontFamily || alertSettings?.font_family || 'Chakra Petch',
        fontSize: matchingBox?.fontSize || alertSettings?.font_size || 28,
        layoutMode: matchingBox?.layoutMode || alertSettings?.layout_mode || 'top',
        animationStyle: matchingBox?.animationStyle || alertSettings?.animation_style || 'fade',
        glowColor: matchingBox?.glowColor || alertSettings?.glow_color || '#00F0FF',
        soundUrl: (matchingBox?.soundUrl && !matchingBox.soundUrl.includes('neon-chime'))
          ? matchingBox.soundUrl
          : (alertSettings?.sound_url && !alertSettings.sound_url.includes('neon-chime')
              ? alertSettings.sound_url
              : '/sounds/cash-register-kaching.mp3'),
        soundVolume: matchingBox?.soundVolume ?? alertSettings?.sound_volume ?? 0.85,
        durationSeconds: matchingBox?.durationSeconds || alertSettings?.duration_seconds || 8,
        ttsEnabled: matchingBox?.ttsEnabled !== undefined ? matchingBox.ttsEnabled : (alertSettings?.tts_enabled === 1 && donation.amount >= (alertSettings?.tts_min_amount || 0)),
        ttsType: matchingBox?.ttsType || alertSettings?.tts_voice || 'google',
        clonedVoiceSampleUrl: matchingBox?.clonedVoiceSampleUrl || alertSettings?.cloned_voice_sample_url
      };

      // Real-time broadcast to OBS overlay room
      broadcastAlertToOverlay(streamer.overlay_token, alertPayload);

      // Mark donation as alerted in DB
      db.prepare('UPDATE donations SET is_alerted = 1 WHERE id = ?').run(donation.id);
    }

    // Broadcast updated transaction to streamer dashboard
    broadcastDonationToDashboard(streamer.id, {
      ...donation,
      status: 'PAID',
      paid_at: new Date().toISOString()
    });

    // 4. Send Telegram Bot notification to streamer if linked
    if (streamer.telegram_chat_id) {
      await sendTelegramDonationAlert({
        chatId: streamer.telegram_chat_id,
        streamerName: streamer.display_name,
        donorName: donation.donor_name,
        donorMessage: donation.donor_message,
        amount: donation.amount,
        currency: donation.currency,
        bankingName: donation.banking_name,
        tranId: paywayTranId || `ABA-${donation.id.slice(0, 8)}`
      });
    }
  }

  return { success: true, donationId };
}

/**
 * Checks transaction status with ABA PayWay API.
 * Uses the Pro streamer's own merchant credentials stored in the DB.
 * Returns null if no credentials are configured.
 */
export async function checkPayWayTransaction(tranId: string, streamerId: string) {
  const paymentSettings = db.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(streamerId) as any;
  const merchantId = paymentSettings?.aba_merchant_id;
  const apiKey = paymentSettings?.aba_api_key;

  if (!merchantId || !apiKey) {
    console.warn(`[PayWay] No merchant credentials configured for streamer ${streamerId}. Skipping check.`);
    return null;
  }

  const reqTime = Math.floor(Date.now() / 1000).toString();
  // Hash for check-transaction: req_time + merchant_id + tran_id
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
