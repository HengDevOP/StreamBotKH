import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { SCHEMA_SQL } from './schema';
import { seedMemoryDbFromMongo, mirrorSqlWriteToMongo } from './mongoSync';
import { cleanupExpiredPendingDonationsMongo, cleanupOlderDonationsMongo } from './mongo';

// Remove legacy streamneon.db file from disk to ensure 100% MongoDB Atlas usage
try {
  const dbPath = path.resolve(process.cwd(), 'streamneon.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️ [Database] Removed legacy streamneon.db from disk. Running 100% on MongoDB Atlas!');
  }
  const shmPath = path.resolve(process.cwd(), 'streamneon.db-shm');
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  const walPath = path.resolve(process.cwd(), 'streamneon.db-wal');
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
} catch (e) {}

// Pure in-memory SQLite instance for zero disk footprint & instant synchronous queries
const rawDb = new Database(':memory:');

// Wrap rawDb with auto-sync to MongoDB Atlas
export const db = new Proxy(rawDb, {
  get(target, prop, receiver) {
    if (prop === 'prepare') {
      return (sql: string) => {
        const stmt = target.prepare(sql);
        const originalRun = stmt.run.bind(stmt);
        stmt.run = (...args: any[]) => {
          const res = originalRun(...args);
          try {
            mirrorSqlWriteToMongo(sql, args, target);
          } catch (_) {}
          return res;
        };
        return stmt;
      };
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
});

// Seed in-memory tables from MongoDB Atlas
rawDb.exec(SCHEMA_SQL);
seedMemoryDbFromMongo(rawDb).catch((err) => {
  console.warn('[DB] Failed initial seed from MongoDB Atlas:', err);
});

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

// Overlay token history table to ensure old OBS browser source URLs never break when regenerating
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS overlay_token_history (
      token TEXT PRIMARY KEY,
      streamer_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
} catch (e) {}

// Ensure all existing streamers have unique, non-null telegram_pairing_code
try {
  const existingRows = db.prepare('SELECT id, telegram_pairing_code FROM streamers').all() as Array<{ id: string; telegram_pairing_code?: string | null }>;
  const seenCodes = new Set<string>();
  for (const s of existingRows) {
    if (!s.telegram_pairing_code || seenCodes.has(s.telegram_pairing_code)) {
      let freshCode = '';
      for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = 'NEON-' + Math.floor(100000 + Math.random() * 900000);
        if (!seenCodes.has(candidate)) {
          const dbCheck = db.prepare('SELECT id FROM streamers WHERE telegram_pairing_code = ?').get(candidate);
          if (!dbCheck) {
            freshCode = candidate;
            break;
          }
        }
      }
      if (!freshCode) {
        freshCode = 'NEON-' + uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
      }
      db.prepare('UPDATE streamers SET telegram_pairing_code = ? WHERE id = ?').run(freshCode, s.id);
      seenCodes.add(freshCode);
    } else {
      seenCodes.add(s.telegram_pairing_code);
    }
  }
} catch (e) {}
try {
  db.exec('ALTER TABLE donations ADD COLUMN banking_name TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN plan TEXT DEFAULT "free"');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN plan_started_at TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN plan_expires_at TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN custom_thanks_message TEXT');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN is_verified INTEGER DEFAULT 0');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN plan_duration_days INTEGER DEFAULT 0');
} catch (e) {}
try {
  db.exec('ALTER TABLE streamers ADD COLUMN social_links TEXT');
} catch (e) {}

// Client Issue Reports / Pull Requests table for Admin Panel
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS issue_reports (
      id TEXT PRIMARY KEY,
      streamer_id TEXT NOT NULL,
      streamer_username TEXT,
      streamer_display_name TEXT,
      streamer_email TEXT,
      streamer_avatar TEXT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'bug',
      priority TEXT DEFAULT 'medium',
      description TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      admin_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {}

// Platform Promotions table for Admin Panel (Pro Plan Promotional Pricing)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_promotions (
      id TEXT PRIMARY KEY,
      is_enabled INTEGER DEFAULT 0,
      promo_title TEXT DEFAULT 'SPECIAL PROMOTION',
      promo_price_usd REAL DEFAULT 2.99,
      promo_price_khr INTEGER DEFAULT 12000,
      original_price_usd REAL DEFAULT 4.99,
      original_price_khr INTEGER DEFAULT 20000,
      annual_discount_percent INTEGER DEFAULT 10,
      start_date TEXT,
      end_date TEXT,
      updated_by TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {}

try {
  db.exec('ALTER TABLE platform_promotions ADD COLUMN annual_discount_percent INTEGER DEFAULT 10');
} catch (e) {}

try {
  const existingPromo = db.prepare('SELECT id FROM platform_promotions WHERE id = ?').get('pro_plan_promo');
  if (!existingPromo) {
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
    db.prepare(`
      INSERT INTO platform_promotions (
        id, is_enabled, promo_title, promo_price_usd, promo_price_khr,
        original_price_usd, original_price_khr, start_date, end_date
      ) VALUES (?, 0, 'SPECIAL PROMOTION', 2.99, 12000, 4.99, 20000, ?, ?)
    `).run('pro_plan_promo', now.toISOString(), nextMonth.toISOString());
  }
} catch (e) {}

export const ADMIN_EMAILS = ['hchenheng@gmail.com'];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

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
try {
  db.exec("ALTER TABLE stream_timers ADD COLUMN show_title INTEGER DEFAULT 1");
} catch (e) {}
try {
  db.exec("ALTER TABLE stream_timers ADD COLUMN show_description INTEGER DEFAULT 1");
} catch (e) {}
try {
  db.exec("ALTER TABLE stream_timers ADD COLUMN description TEXT DEFAULT ''");
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




// Video alert settings table (Media Share configuration - disabled by default)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_alert_settings (
      streamer_id TEXT PRIMARY KEY,
      is_enabled INTEGER DEFAULT 0,
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
    VALUES ('demo-streamer-id-1001', 0, 2.0, 30, 85, 1)
  `).run();
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pokemon_widget_settings (
      streamer_token TEXT PRIMARY KEY,
      youtube_url TEXT DEFAULT '',
      listener_active INTEGER DEFAULT 0,
      default_pokemon INTEGER DEFAULT 1,
      allowed_pokemon TEXT DEFAULT '1,4,7,25,39,54,94,133,143,149,151,448',
      bubble_duration INTEGER DEFAULT 8,
      max_on_screen INTEGER DEFAULT 12,
      walk_speed TEXT DEFAULT 'normal',
      scale TEXT DEFAULT 'medium',
      show_name INTEGER DEFAULT 1,
      sound_enabled INTEGER DEFAULT 1,
      theme TEXT DEFAULT 'transparent',
      overlay_width INTEGER DEFAULT 1920,
      overlay_height INTEGER DEFAULT 360,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mailbox_messages (
      id TEXT PRIMARY KEY,
      streamer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sender_name TEXT DEFAULT 'StreamBotKH System',
      sender_avatar TEXT,
      category TEXT DEFAULT 'system',
      content TEXT NOT NULL,
      preview TEXT,
      is_read INTEGER DEFAULT 0,
      action_url TEXT,
      action_label TEXT,
      priority TEXT DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
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
 * to prevent unknown or lingering alerts from triggering on delayed bank transfers (100% MongoDB).
 */
export function cleanupExpiredPendingDonations(): { expiredDonations: number; clearedTemporary: number } {
  try {
    let expiredDonations = 0;
    try {
      expiredDonations = db.prepare(`
        UPDATE donations
        SET status = 'EXPIRED'
        WHERE status = 'PENDING'
          AND created_at <= datetime('now', '-5 minutes')
      `).run().changes;
    } catch (_) {}

    cleanupExpiredPendingDonationsMongo().catch(() => {});

    return { expiredDonations, clearedTemporary: 0 };
  } catch (e) {
    console.warn('[Cache Timer] Error in cleanupExpiredPendingDonations:', e);
    return { expiredDonations: 0, clearedTemporary: 0 };
  }
}

/**
 * 6-Month Transaction Donation Retention Policy:
 * Automatically cleans up transaction donations older than 6 months (180 days)
 * to maintain ledger performance and enforce data retention limits (100% MongoDB).
 */
export function cleanupOlderDonations(months = 6): { deletedDonations: number } {
  try {
    let deletedDonations = 0;
    try {
      deletedDonations = db.prepare(`
        DELETE FROM donations
        WHERE datetime(created_at) <= datetime('now', '-' || ? || ' months')
      `).run(months).changes;
    } catch (_) {}

    cleanupOlderDonationsMongo(months).catch(() => {});

    return { deletedDonations };
  } catch (e) {
    console.warn('[Retention Policy] Error in cleanupOlderDonations:', e);
    return { deletedDonations: 0 };
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

export function addMonitoredGroup(streamerId: string, chatId: string, title: string, username?: string, customId?: string) {
  const cleanChatId = chatId.trim();
  const cleanTitle = title.trim();
  const cleanUsername = username ? username.trim().replace(/^@/, '') : null;
  const strippedId = cleanChatId.replace(/^-100/, '').replace(/^-/, '');
  const variants = Array.from(new Set([cleanChatId, strippedId, `-${strippedId}`, `-100${strippedId}`].filter(Boolean)));
  const placeholders = variants.map(() => '?').join(', ');
  
  // Check if exists
  const existing = db.prepare(`SELECT id FROM telegram_monitored_groups WHERE streamer_id = ? AND chat_id IN (${placeholders})`).get(streamerId, ...variants) as any;
  if (existing) {
    db.prepare(`UPDATE telegram_monitored_groups SET title = ?, username = ? WHERE streamer_id = ? AND id = ?`)
      .run(cleanTitle, cleanUsername, streamerId, existing.id);
    return db.prepare('SELECT * FROM telegram_monitored_groups WHERE id = ?').get(existing.id);
  }

  const id = customId || uuidv4();
  db.prepare('INSERT INTO telegram_monitored_groups (id, streamer_id, chat_id, title, username) VALUES (?, ?, ?, ?, ?)')
    .run(id, streamerId, cleanChatId, cleanTitle, cleanUsername);

  // Sync to MongoDB
  try {
    const { addMongoMonitoredGroup } = require('./mongo');
    addMongoMonitoredGroup(streamerId, cleanChatId, cleanTitle, cleanUsername || undefined, id).catch(() => {});
  } catch (_) {}

  return db.prepare('SELECT * FROM telegram_monitored_groups WHERE id = ?').get(id);
}

export function deleteMonitoredGroup(idOrChatId: string, streamerId: string) {
  try {
    const cleanId = String(idOrChatId || '').trim();
    if (!cleanId) return null;
    const strippedId = cleanId.replace(/^-100/, '').replace(/^-/, '');
    const variants = Array.from(new Set([cleanId, strippedId, `-${strippedId}`, `-100${strippedId}`].filter(Boolean)));
    const placeholders = variants.map(() => '?').join(', ');

    // Sync to MongoDB
    try {
      const { deleteMongoMonitoredGroup } = require('./mongo');
      deleteMongoMonitoredGroup(cleanId, streamerId).catch(() => {});
    } catch (_) {}

    return db.prepare(`DELETE FROM telegram_monitored_groups WHERE streamer_id = ? AND (id IN (${placeholders}) OR chat_id IN (${placeholders}))`)
      .run(streamerId, ...variants, ...variants);
  } catch (e) {
    return null;
  }
}

export function clearMonitoredGroups(streamerId: string) {
  try {
    // Sync to MongoDB
    try {
      const { clearMongoMonitoredGroups } = require('./mongo');
      clearMongoMonitoredGroups(streamerId).catch(() => {});
    } catch (_) {}

    return db.prepare('DELETE FROM telegram_monitored_groups WHERE streamer_id = ?').run(streamerId);
  } catch (e) {
    return null;
  }
}

