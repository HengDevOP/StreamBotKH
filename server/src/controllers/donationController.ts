import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { createBakongDonationQR } from '../services/bakongService';

/**
 * Get public profile of streamer for donation page
 */
export async function getPublicStreamer(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const rawUsername = typeof username === 'string' ? username : String(username || '');
    const cleanUsername = rawUsername.replace(/^@/, '').toLowerCase();

    const streamer = db.prepare(`
      SELECT s.id, s.username, s.display_name, s.avatar_url, s.bio,
             a.glow_color, a.template_style, a.min_amount_alert, a.tts_min_amount,
             p.bakong_account_name, p.is_sandbox
      FROM streamers s
      LEFT JOIN alert_settings a ON s.id = a.streamer_id
      LEFT JOIN payment_settings p ON s.id = p.streamer_id
      WHERE LOWER(s.username) = ?
    `).get(cleanUsername) as any;

    if (!streamer) {
      return res.status(404).json({ error: 'Streamer not found' });
    }

    return res.json({
      id: streamer.id,
      username: streamer.username,
      displayName: streamer.display_name,
      avatarUrl: streamer.avatar_url,
      bio: streamer.bio,
      glowColor: streamer.glow_color || '#00F0FF',
      minAmountAlert: streamer.min_amount_alert || 1.0,
      ttsMinAmount: streamer.tts_min_amount || 2.0,
      bakongAccountName: streamer.bakong_account_name || 'StreamNeon Merchant',
      isSandbox: streamer.is_sandbox === 1
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Create a new donation request with Bakong KHQR
 */
export async function createDonation(req: Request, res: Response) {
  try {
    const { streamerId, donorName, donorMessage, amount, currency, bankingName } = req.body;

    if (!streamerId || !donorName || !amount) {
      return res.status(400).json({ error: 'streamerId, donorName, and amount are required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const validCurrency = currency === 'KHR' ? 'KHR' : 'USD';
    const donationId = uuidv4();
    const cleanBankingName = (bankingName && typeof bankingName === 'string')
      ? bankingName.slice(0, 60).trim()
      : 'Bakong KHQR';

    // Generate dynamic Bakong KHQR
    const qrResult = await createBakongDonationQR({
      donationId,
      streamerId,
      amount: numAmount,
      currency: validCurrency,
      donorName: donorName.slice(0, 30)
    });

    // Save donation in pending state
    db.prepare(`
      INSERT INTO donations (
        id, streamer_id, donor_name, donor_message, amount, currency,
        banking_name, payment_method, qr_string, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(
      donationId,
      streamerId,
      donorName.slice(0, 50),
      (donorMessage || '').slice(0, 250),
      numAmount,
      validCurrency,
      cleanBankingName,
      'BAKONG_KHQR',
      qrResult.qrString
    );

    return res.json({
      donationId,
      amount: numAmount,
      currency: validCurrency,
      bankingName: cleanBankingName,
      qrString: qrResult.qrString,
      qrImage: qrResult.qrImage,
      abaDeepLink: qrResult.abaDeepLink,
      bakongDeepLink: qrResult.bakongDeepLink,
      expiresInSeconds: 300 // 5 minutes
    });
  } catch (err: any) {
    console.error('[Donation] Create donation error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get single donation status
 */
export async function getDonationStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const donation = db.prepare('SELECT id, streamer_id, donor_name, donor_message, amount, currency, banking_name, status, paid_at FROM donations WHERE id = ?').get(id) as any;

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    return res.json(donation);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get recent public donations for streamer's donation page
 */
export async function getStreamerRecentDonations(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const rawUsername = typeof username === 'string' ? username : String(username || '');
    const cleanUsername = rawUsername.replace(/^@/, '').toLowerCase();

    const streamer = db.prepare('SELECT id FROM streamers WHERE LOWER(username) = ?').get(cleanUsername) as any;
    if (!streamer) {
      return res.status(404).json({ error: 'Streamer not found' });
    }

    const donations = db.prepare(`
      SELECT id, donor_name, donor_message, amount, currency, banking_name, created_at, paid_at
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID'
      ORDER BY paid_at DESC, created_at DESC
      LIMIT 8
    `).all(streamer.id);

    return res.json(donations);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
