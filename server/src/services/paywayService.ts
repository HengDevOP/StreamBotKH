import crypto from 'crypto';
import axios from 'axios';
import { ENV } from '../config/env';
import { db } from '../database/db';
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

  if (streamer && alertSettings) {
    // Only alert if amount is >= min_amount_alert
    if (donation.amount >= (alertSettings.min_amount_alert || 0)) {
      const alertPayload = {
        donationId: donation.id,
        donorName: donation.donor_name,
        donorMessage: donation.donor_message,
        amount: donation.amount,
        currency: donation.currency,
        bankingName: donation.banking_name || 'Bakong KHQR',
        templateStyle: alertSettings.template_style,
        glowColor: alertSettings.glow_color,
        soundUrl: alertSettings.sound_url,
        soundVolume: alertSettings.sound_volume,
        durationSeconds: alertSettings.duration_seconds,
        ttsEnabled: alertSettings.tts_enabled === 1 && donation.amount >= (alertSettings.tts_min_amount || 0),
        ttsVoice: alertSettings.tts_voice,
        customGifUrl: alertSettings.custom_gif_url
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
 * Checks transaction status with ABA PayWay API
 */
export async function checkPayWayTransaction(tranId: string, streamerId: string) {
  const paymentSettings = db.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(streamerId) as any;
  const merchantId = paymentSettings?.aba_merchant_id || ENV.ABA_PAYWAY_MERCHANT_ID;
  const apiKey = paymentSettings?.aba_api_key || ENV.ABA_PAYWAY_API_KEY;

  const reqTime = Math.floor(Date.now() / 1000).toString();
  // Hash for check-transaction: req_time + merchant_id + tran_id
  const hashString = `${reqTime}${merchantId}${tranId}`;
  const hash = generatePayWayHash(hashString, apiKey);

  try {
    const response = await axios.post(
      ENV.ABA_PAYWAY_CHECK_TRAN_URL,
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
