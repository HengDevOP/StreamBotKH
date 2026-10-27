import { Request, Response } from 'express';
import { handleSuccessfulPayment } from '../services/paywayService';
import { handleTelegramUpdate } from '../services/telegramService';
import { db } from '../database/db';

/**
 * ABA PayWay Pushback / Webhook handler
 * ABA sends POST with transaction confirmation
 */
export async function paywayWebhook(req: Request, res: Response) {
  try {
    const { tran_id, status, apv, payment_status, hash } = req.body;
    console.log('[PayWay Webhook] Received callback:', req.body);

    // In ABA PayWay, status == 0 or payment_status == 'APPROVED' means successful transaction
    if (status === 0 || status === '0' || payment_status === 'APPROVED') {
      // Find donation by tran_id or ID
      let donation = db.prepare('SELECT id FROM donations WHERE id = ? OR payway_tran_id = ?').get(tran_id, tran_id) as any;

      if (donation) {
        await handleSuccessfulPayment({
          donationId: donation.id,
          paywayTranId: tran_id,
          bakongHash: apv || `ABA-APV-${Date.now()}`
        });
      }
    }

    // ABA PayWay expects status 200 or { status: 0 }
    return res.status(200).json({ status: 0, message: 'Webhook processed' });
  } catch (err: any) {
    console.error('[PayWay Webhook] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Instant Simulator / Mock Payment Trigger
 * Allows donors, streamers, or tests to mark a donation as PAID immediately
 * and observe live OBS alerts and Telegram messages in real time!
 */
export async function simulatePayment(req: Request, res: Response) {
  try {
    const { donationId } = req.body;

    if (!donationId) {
      return res.status(400).json({ error: 'donationId is required' });
    }

    const result = await handleSuccessfulPayment({
      donationId,
      paywayTranId: `SIM-ABA-${Date.now()}`,
      bakongHash: `SIM-BKG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    });

    return res.json({
      success: true,
      message: 'Payment simulation succeeded. Alert dispatched to OBS overlay and Telegram bot.',
      result
    });
  } catch (err: any) {
    console.error('[Simulate Payment] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Telegram Bot Webhook endpoint
 */
export async function telegramWebhook(req: Request, res: Response) {
  try {
    const update = req.body;
    console.log('[Telegram Webhook] Received update:', JSON.stringify(update).slice(0, 150));
    await handleTelegramUpdate(update);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram Webhook] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
