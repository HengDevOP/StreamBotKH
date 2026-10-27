import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { broadcastAlertToOverlay } from '../services/socketService';

/**
 * Get streamer dashboard statistics, recent donations, and chart analytics
 */
export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  try {
    const streamerId = req.user!.id;

    // Total earnings USD & KHR
    const totalUsdRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'USD'
    `).get(streamerId) as any;

    const totalKhrRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'KHR'
    `).get(streamerId) as any;

    // Today's earnings
    const todayUsdRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'USD'
      AND date(paid_at) = date('now')
    `).get(streamerId) as any;

    const todayKhrRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'KHR'
      AND date(paid_at) = date('now')
    `).get(streamerId) as any;

    // Top donors
    const topDonors = db.prepare(`
      SELECT donor_name, SUM(CASE WHEN currency = 'KHR' THEN amount / 4000.0 ELSE amount END) as total_usd_equiv, COUNT(*) as donations_count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID'
      GROUP BY donor_name
      ORDER BY total_usd_equiv DESC
      LIMIT 5
    `).all(streamerId);

    // Recent donations (last 20)
    const recentDonations = db.prepare(`
      SELECT *
      FROM donations
      WHERE streamer_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(streamerId);

    // Daily revenue trend (last 7 days)
    const trend = db.prepare(`
      SELECT
        strftime('%Y-%m-%d', paid_at) as date,
        SUM(CASE WHEN currency = 'KHR' THEN amount / 4000.0 ELSE amount END) as amount_usd,
        COUNT(*) as count
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID'
        AND paid_at >= datetime('now', '-7 days')
      GROUP BY date
      ORDER BY date ASC
    `).all(streamerId);

    return res.json({
      summary: {
        totalRevenueUsd: totalUsdRow.total,
        totalRevenueKhr: totalKhrRow.total,
        totalDonationsCount: (totalUsdRow.count || 0) + (totalKhrRow.count || 0),
        todayRevenueUsd: todayUsdRow.total,
        todayRevenueKhr: todayKhrRow.total,
        todayDonationsCount: todayUsdRow.count || 0
      },
      topDonors,
      recentDonations,
      trend
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get Alert Settings
 */
export async function getAlertSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const streamerId = req.user!.id;
    let settings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(streamerId);

    if (!settings) {
      db.prepare(`
        INSERT INTO alert_settings (streamer_id)
        VALUES (?)
      `).run(streamerId);
      settings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(streamerId);
    }

    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Update Alert Settings
 */
export async function updateAlertSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const streamerId = req.user!.id;
    const {
      template_style,
      glow_color,
      sound_url,
      sound_volume,
      min_amount_alert,
      duration_seconds,
      tts_enabled,
      tts_min_amount,
      tts_voice,
      custom_gif_url,
      text_template
    } = req.body;

    db.prepare(`
      INSERT INTO alert_settings (
        streamer_id, template_style, glow_color, sound_url, sound_volume,
        min_amount_alert, duration_seconds, tts_enabled, tts_min_amount,
        tts_voice, custom_gif_url, text_template
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(streamer_id) DO UPDATE SET
        template_style = excluded.template_style,
        glow_color = excluded.glow_color,
        sound_url = excluded.sound_url,
        sound_volume = excluded.sound_volume,
        min_amount_alert = excluded.min_amount_alert,
        duration_seconds = excluded.duration_seconds,
        tts_enabled = excluded.tts_enabled,
        tts_min_amount = excluded.tts_min_amount,
        tts_voice = excluded.tts_voice,
        custom_gif_url = excluded.custom_gif_url,
        text_template = excluded.text_template
    `).run(
      streamerId,
      template_style || 'neon-box',
      glow_color || '#00F0FF',
      sound_url || '/sounds/neon-chime.mp3',
      sound_volume ?? 0.8,
      min_amount_alert ?? 1.0,
      duration_seconds ?? 8,
      tts_enabled ? 1 : 0,
      tts_min_amount ?? 2.0,
      tts_voice || 'Google US English',
      custom_gif_url || '',
      text_template || '{name} dropped {amount}!'
    );

    const updated = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(streamerId);
    return res.json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get Payment Settings
 */
export async function getPaymentSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const streamerId = req.user!.id;
    let settings = db.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(streamerId);

    if (!settings) {
      db.prepare(`
        INSERT INTO payment_settings (streamer_id)
        VALUES (?)
      `).run(streamerId);
      settings = db.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(streamerId);
    }

    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Update Payment Settings
 */
export async function updatePaymentSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const streamerId = req.user!.id;
    const { aba_merchant_id, aba_api_key, bakong_account_id, bakong_account_name, is_sandbox } = req.body;

    db.prepare(`
      INSERT INTO payment_settings (
        streamer_id, aba_merchant_id, aba_api_key, bakong_account_id, bakong_account_name, is_sandbox
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(streamer_id) DO UPDATE SET
        aba_merchant_id = excluded.aba_merchant_id,
        aba_api_key = excluded.aba_api_key,
        bakong_account_id = excluded.bakong_account_id,
        bakong_account_name = excluded.bakong_account_name,
        is_sandbox = excluded.is_sandbox
    `).run(
      streamerId,
      aba_merchant_id || 'ec439126',
      aba_api_key || 'f60b06ca198c61e8601ff7a68393ceee47cb50cb',
      bakong_account_id || 'streamneon@abaa',
      bakong_account_name || 'STREAMNEON VIP',
      is_sandbox ? 1 : 0
    );

    const updated = db.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(streamerId);
    return res.json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Regenerate OBS overlay token
 */
export async function regenerateOverlayToken(req: AuthenticatedRequest, res: Response) {
  try {
    const streamerId = req.user!.id;
    const newToken = 'ovl_' + uuidv4().replace(/-/g, '').slice(0, 24);

    db.prepare('UPDATE streamers SET overlay_token = ? WHERE id = ?').run(newToken, streamerId);

    return res.json({ success: true, overlayToken: newToken });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Trigger Test Alert directly from server
 */
export async function triggerTestAlert(req: AuthenticatedRequest, res: Response) {
  try {
    const streamerId = req.user!.id;
    const streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(streamerId) as any;
    const alertSettings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(streamerId) as any;

    if (!streamer) {
      return res.status(404).json({ error: 'Streamer not found' });
    }

    const testPayload = {
      donationId: 'test-' + Date.now(),
      donorName: req.body.donorName || 'Neon Supporter 🔥',
      donorMessage: req.body.donorMessage || 'Awesome stream! Keep up the great energy! ⚡',
      amount: req.body.amount || 5.0,
      currency: req.body.currency || 'USD',
      templateStyle: alertSettings?.template_style || 'neon-box',
      glowColor: alertSettings?.glow_color || '#00F0FF',
      soundUrl: alertSettings?.sound_url || '/sounds/neon-chime.mp3',
      soundVolume: alertSettings?.sound_volume ?? 0.8,
      durationSeconds: alertSettings?.duration_seconds ?? 8,
      ttsEnabled: alertSettings?.tts_enabled === 1,
      ttsVoice: alertSettings?.tts_voice || 'Google US English',
      customGifUrl: alertSettings?.custom_gif_url,
      isTest: true
    };

    broadcastAlertToOverlay(streamer.overlay_token, testPayload);

    return res.json({ success: true, message: 'Test alert sent to OBS overlay' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
