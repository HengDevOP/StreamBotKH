import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { SCHEMA_SQL } from './schema';

const dbPath = path.resolve(process.cwd(), 'streamneon.db');
export const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Immediate safe schema migrations for telegram user client
try {
  db.exec('ALTER TABLE streamers ADD COLUMN telegram_phone TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN telegram_session TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN telegram_user_name TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN telegram_api_id INTEGER');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN telegram_api_hash TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN telegram_pending_phone TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN telegram_pending_hash TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN telegram_pending_session TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE donations ADD COLUMN banking_name TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN plan TEXT DEFAULT "free"');
} catch (e) {}

// Video overlay & temporary listener migrations
try {
  db.exec('ALTER TABLE donations ADD COLUMN video_url TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE donations ADD COLUMN video_title TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE donations ADD COLUMN video_start_time INTEGER DEFAULT 0');
} catch (e) {}
try {
  db.exec('ALTER TABLE donations ADD COLUMN video_end_time INTEGER DEFAULT 0');
} catch (e) {}

// Clean any legacy temporary_donations table from SQLite (now 100% in MongoDB)
try {
  db.exec('DROP TABLE IF EXISTS temporary_donations');
} catch (e) {}

// Telegram Monitored Groups table: GramJS listens ONLY from these target groups
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_monitored_groups (
      id TEXT PRIMARY KEY,
      streamer_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      title TEXT NOT NULL,
      username TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {}

// Stream subathon timer countdown table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stream_timers (
      id TEXT PRIMARY KEY,
      streamer_token TEXT NOT NULL UNIQUE,
      title TEXT DEFAULT 'SUBATHON COUNTDOWN',
      remaining_seconds INTEGER DEFAULT 7200,
      initial_seconds INTEGER DEFAULT 7200,
      rate_minutes_per_usd REAL DEFAULT 10.0,
      rate_minutes_per_khr REAL DEFAULT 10.0,
      is_running INTEGER DEFAULT 1,
      glow_color TEXT DEFAULT '#00F0FF',
      font_family TEXT DEFAULT 'Chakra Petch',
      layout_mode TEXT DEFAULT 'neon',
      template_style TEXT DEFAULT 'cyber-neon',
      show_background INTEGER DEFAULT 1,
      show_animation INTEGER DEFAULT 1,
      sound_enabled INTEGER DEFAULT 1,
      max_cap_seconds INTEGER DEFAULT 86400,
      last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {}
try {
  db.exec("ALTER TABLE stream_timers ADD COLUMN template_style TEXT DEFAULT 'cyber-neon'");
} catch (e) {}
try {
  db.exec("ALTER TABLE stream_timers ADD COLUMN show_background INTEGER DEFAULT 1");
} catch (e) {}
try {
  db.exec("ALTER TABLE stream_timers ADD COLUMN show_animation INTEGER DEFAULT 1");
} catch (e) {}

// Stream donation goals table for multi-goal tracking & OBS overlay
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stream_goals (
      id TEXT PRIMARY KEY,
      streamer_token TEXT NOT NULL,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      initial_amount REAL NOT NULL DEFAULT 0,
      accent_color TEXT DEFAULT '#10B981',
      template_style TEXT DEFAULT 'cyber-neon',
      show_balance INTEGER DEFAULT 1,
      show_background INTEGER DEFAULT 1,
      show_animation INTEGER DEFAULT 1,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {}
// Stream leaderboards table for top supporters widget & OBS overlay
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stream_leaderboards (
      id TEXT PRIMARY KEY,
      streamer_token TEXT NOT NULL UNIQUE,
      title TEXT DEFAULT 'TOP SUPPORTERS',
      period TEXT DEFAULT 'all',
      max_rows INTEGER DEFAULT 3,
      accent_color TEXT DEFAULT '#F59E0B',
      template_style TEXT DEFAULT 'cyber-neon',
      show_background INTEGER DEFAULT 1,
      show_animation INTEGER DEFAULT 1,
      show_rank_badges INTEGER DEFAULT 1,
      font_family TEXT DEFAULT 'Chakra Petch',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {}

// Soundboard settings table & items for PC Keybind listener & OBS overlay
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stream_soundboards (
      id TEXT PRIMARY KEY,
      streamer_token TEXT NOT NULL UNIQUE,
      master_volume REAL DEFAULT 0.8,
      is_listening INTEGER DEFAULT 1,
      output_mode TEXT DEFAULT 'both',
      playback_mode TEXT DEFAULT 'overlap',
      show_visual_alert INTEGER DEFAULT 1,
      stop_keybind TEXT DEFAULT 'Escape',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stream_soundboard_items (
      id TEXT PRIMARY KEY,
      streamer_token TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Memes',
      sound_url TEXT NOT NULL,
      keybind TEXT,
      keybind_code TEXT,
      keybind_display TEXT,
      volume REAL DEFAULT 0.8,
      color TEXT DEFAULT '#00F0FF',
      icon_name TEXT DEFAULT 'Volume2',
      duration_seconds REAL DEFAULT 2.0,
      is_loop INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {}




// Video alert settings table (Media Share configuration)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_alert_settings (
      streamer_id TEXT PRIMARY KEY,
      is_enabled INTEGER DEFAULT 1,
      min_tip_amount REAL DEFAULT 2.0,
      max_duration_seconds INTEGER DEFAULT 30,
      video_volume INTEGER DEFAULT 85,
      auto_ducking INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {}
try {
  // Ensure default row for demo streamer
  db.prepare(`
    INSERT OR IGNORE INTO video_alert_settings (streamer_id, is_enabled, min_tip_amount, max_duration_seconds, video_volume, auto_ducking)
    VALUES ('demo-streamer-id-1001', 1, 2.0, 30, 85, 1)
  `).run();
} catch (e) {}




export function initDatabase() {
  db.exec(SCHEMA_SQL);

  // Safe migration for existing SQLite database
  try {
    db.exec('ALTER TABLE donations ADD COLUMN banking_name TEXT');
  } catch (e) {
    // Column already exists
  }

  // Telegram User Account client fields
  try {
    db.exec('ALTER TABLE streamers ADD COLUMN telegram_phone TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE streamers ADD COLUMN telegram_session TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE streamers ADD COLUMN telegram_user_name TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE streamers ADD COLUMN telegram_api_id INTEGER');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE streamers ADD COLUMN telegram_api_hash TEXT');
  } catch (e) {}

  // Check if default streamer exists, if not seed one
  const existing = db.prepare('SELECT id FROM streamers WHERE id = ? OR username = ? OR telegram_pairing_code = ?').get('demo-streamer-id-1001', 'neonstreamer', 'NEON-8899');
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

/**
 * 5-Minute Cache Duration Expiration:
 * Automatically expires and cleans up pending donation sessions older than 5 minutes (300 seconds)
 * to prevent unknown or lingering alerts from triggering on delayed bank transfers.
 */
export function cleanupExpiredPendingDonations(): { expiredDonations: number; clearedTemporary: number } {
  try {
    const expiredDonations = db.prepare(`
      UPDATE donations
      SET status = 'EXPIRED'
      WHERE status = 'PENDING'
        AND created_at <= datetime('now', '-5 minutes')
    `).run().changes;

    let clearedTemporary = 0;

    // Auto-clean expired records from MongoDB temporary_donations
    try {
      const { getTemporaryDonationsCollection } = require('./mongo');
      getTemporaryDonationsCollection().then((col: any) => {
        col.deleteMany({
          createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
        }).then((res: any) => {
          if (res?.deletedCount) {
            clearedTemporary = res.deletedCount;
            console.log(`🧹 [MongoDB Cache] Cleared ${clearedTemporary} expired temporary donation sessions (>5 mins).`);
          }
        }).catch(() => {});
      }).catch(() => {});
    } catch (e) {}

    if (expiredDonations > 0) {
      console.log(`🧹 [Cache Timer] Auto-cleared ${expiredDonations} expired pending donations (>5 mins).`);
    }

    return { expiredDonations, clearedTemporary };
  } catch (e) {
    console.warn('[Cache Timer] Error in cleanupExpiredPendingDonations:', e);
    return { expiredDonations: 0, clearedTemporary: 0 };
  }
}

/**
 * Telegram Monitored Groups Helpers
 */
export function getMonitoredGroups(streamerId: string) {
  try {
    return db.prepare('SELECT * FROM telegram_monitored_groups WHERE streamer_id = ? ORDER BY created_at DESC').all(streamerId) as Array<{
      id: string;
      streamer_id: string;
      chat_id: string;
      title: string;
      username?: string;
      created_at: string;
    }>;
  } catch (e) {
    return [];
  }
}

export function addMonitoredGroup(streamerId: string, chatId: string, title: string, username?: string) {
  const cleanChatId = chatId.trim();
  const cleanTitle = title.trim();
  const cleanUsername = username ? username.trim().replace(/^@/, '') : null;
  
  // Check if exists
  const existing = db.prepare('SELECT id FROM telegram_monitored_groups WHERE streamer_id = ? AND chat_id = ?').get(streamerId, cleanChatId) as any;
  if (existing) {
    db.prepare('UPDATE telegram_monitored_groups SET title = ?, username = ? WHERE streamer_id = ? AND chat_id = ?')
      .run(cleanTitle, cleanUsername, streamerId, cleanChatId);
    return db.prepare('SELECT * FROM telegram_monitored_groups WHERE streamer_id = ? AND chat_id = ?').get(streamerId, cleanChatId);
  }

  const id = uuidv4();
  db.prepare('INSERT INTO telegram_monitored_groups (id, streamer_id, chat_id, title, username) VALUES (?, ?, ?, ?, ?)')
    .run(id, streamerId, cleanChatId, cleanTitle, cleanUsername);
  return db.prepare('SELECT * FROM telegram_monitored_groups WHERE id = ?').get(id);
}

export function deleteMonitoredGroup(id: string, streamerId: string) {
  return db.prepare('DELETE FROM telegram_monitored_groups WHERE id = ? AND streamer_id = ?').run(id, streamerId);
}

