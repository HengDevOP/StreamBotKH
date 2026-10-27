CREATE TABLE IF NOT EXISTS streamers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  overlay_token TEXT UNIQUE NOT NULL,
  telegram_chat_id TEXT,
  telegram_pairing_code TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_settings (
  streamer_id TEXT PRIMARY KEY,
  template_style TEXT DEFAULT 'neon-box',
  glow_color TEXT DEFAULT '#00F0FF',
  sound_url TEXT DEFAULT '/sounds/neon-chime.mp3',
  sound_volume REAL DEFAULT 0.8,
  min_amount_alert REAL DEFAULT 1.0,
  duration_seconds INTEGER DEFAULT 8,
  tts_enabled INTEGER DEFAULT 1,
  tts_min_amount REAL DEFAULT 2.0,
  tts_voice TEXT DEFAULT 'Google US English',
  custom_gif_url TEXT DEFAULT 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
  text_template TEXT DEFAULT '{name} just dropped {amount}!',
  FOREIGN KEY (streamer_id) REFERENCES streamers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_settings (
  streamer_id TEXT PRIMARY KEY,
  aba_merchant_id TEXT DEFAULT 'ec439126',
  aba_api_key TEXT DEFAULT 'f60b06ca198c61e8601ff7a68393ceee47cb50cb',
  bakong_account_id TEXT DEFAULT 'streamneon@abaa',
  bakong_account_name TEXT DEFAULT 'STREAMNEON VIP',
  is_sandbox INTEGER DEFAULT 1,
  FOREIGN KEY (streamer_id) REFERENCES streamers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  streamer_id TEXT NOT NULL,
  donor_name TEXT NOT NULL,
  donor_message TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT DEFAULT 'BAKONG_KHQR',
  payway_tran_id TEXT,
  bakong_hash TEXT,
  qr_string TEXT,
  status TEXT DEFAULT 'PENDING',
  is_alerted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME,
  FOREIGN KEY (streamer_id) REFERENCES streamers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_donations_streamer ON donations(streamer_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_streamers_overlay_token ON streamers(overlay_token);
CREATE INDEX IF NOT EXISTS idx_streamers_username ON streamers(username);
