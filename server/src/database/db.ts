import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { SCHEMA_SQL } from './schema';

const dbPath = path.resolve(__dirname, '../../streamneon.db');
export const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(SCHEMA_SQL);

  // Safe migration for existing SQLite database
  try {
    db.exec('ALTER TABLE donations ADD COLUMN banking_name TEXT');
  } catch (e) {
    // Column already exists
  }

  // Check if default streamer exists, if not seed one
  const existing = db.prepare('SELECT id FROM streamers WHERE username = ?').get('neonstreamer');
  if (!existing) {
    const streamerId = 'demo-streamer-id-1001';
    const overlayToken = 'ovl_token_neon_demo_9921';
    const pairingCode = 'NEON-8899';

    const insertStreamer = db.prepare(`
      INSERT INTO streamers (id, email, username, display_name, avatar_url, bio, overlay_token, telegram_pairing_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStreamer.run(
      streamerId,
      'streamer@streamneon.vip',
      'neonstreamer',
      'Neon Master VIP',
      'https://api.dicebear.com/7.x/bottts/svg?seed=neonmaster',
      'Full-time FPS Gamer & Tech Streamer. Donations support the live stream quality! 🚀⚡',
      overlayToken,
      pairingCode
    );

    const insertAlert = db.prepare(`
      INSERT INTO alert_settings (streamer_id, template_style, glow_color, sound_url, sound_volume, min_amount_alert, duration_seconds, tts_enabled, tts_min_amount, text_template)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAlert.run(
      streamerId,
      'neon-box',
      '#00F0FF',
      '/sounds/neon-chime.mp3',
      0.85,
      1.0,
      8,
      1,
      1.0,
      '{name} dropped {amount} on the stream! 💥'
    );

    const insertPayment = db.prepare(`
      INSERT INTO payment_settings (streamer_id, aba_merchant_id, aba_api_key, bakong_account_id, bakong_account_name, is_sandbox)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertPayment.run(
      streamerId,
      'ec439126',
      'f60b06ca198c61e8601ff7a68393ceee47cb50cb',
      'neonstreamer@abaa',
      'NEON STREAMER VIP',
      1
    );

    // Add some sample donations for rich dashboard view
    const insertDonation = db.prepare(`
      INSERT INTO donations (id, streamer_id, donor_name, donor_message, amount, currency, banking_name, payment_method, status, is_alerted, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    insertDonation.run(uuidv4(), streamerId, 'CyberSamurai', 'Awesome gameplay! Ace that round!', 10.0, 'USD', 'ABA Bank', 'BAKONG_KHQR', 'PAID', 1, '-2 hours');
    insertDonation.run(uuidv4(), streamerId, 'KompongGamer', 'Keep up the good stream bro 🇰🇭🔥', 40000, 'KHR', 'Acleda Bank', 'ABA_PAYWAY', 'PAID', 1, '-4 hours');
    insertDonation.run(uuidv4(), streamerId, 'PixelQueen', 'Your neon overlay looks sick!', 5.0, 'USD', 'Wing Bank', 'BAKONG_KHQR', 'PAID', 1, '-1 day');
    insertDonation.run(uuidv4(), streamerId, 'Anonymous Fan', 'GG WP!', 2.5, 'USD', 'Bakong KHQR', 'BAKONG_KHQR', 'PAID', 1, '-2 days');

    console.log('[DB] Database seeded with default streamer @neonstreamer');
  }
}
