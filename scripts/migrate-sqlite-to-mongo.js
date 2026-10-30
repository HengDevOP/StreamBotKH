const Database = require('better-sqlite3');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function migrate() {
  const db = new Database('streamneon.db');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streamneon';
  const client = new MongoClient(mongoUri);
  await client.connect();
  const mdb = client.db();

  console.log('--- Migrating SQLite to MongoDB ---');

  // 1. streamers -> users
  const streamers = db.prepare('SELECT * FROM streamers').all();
  for (const s of streamers) {
    await mdb.collection('users').updateOne(
      { userId: s.id },
      {
        $set: {
          userId: s.id,
          username: s.username,
          displayName: s.display_name,
          email: s.email,
          avatarUrl: s.avatar_url,
          bio: s.bio || '',
          overlayToken: s.overlay_token,
          telegramChatId: s.telegram_chat_id,
          telegramPairingCode: s.telegram_pairing_code,
          telegramPhone: s.telegram_phone,
          telegramSession: s.telegram_session,
          telegramUserName: s.telegram_user_name,
          telegramApiId: s.telegram_api_id,
          telegramApiHash: s.telegram_api_hash,
          telegramPendingPhone: s.telegram_pending_phone,
          telegramPendingHash: s.telegram_pending_hash,
          telegramPendingSession: s.telegram_pending_session,
          plan: s.plan || 'free',
          planStartedAt: s.plan_started_at,
          planExpiresAt: s.plan_expires_at,
          planDurationDays: s.plan_duration_days || 0,
          customThanksMessage: s.custom_thanks_message || '',
          isVerified: s.is_verified === 1,
          socialLinks: s.social_links ? JSON.parse(s.social_links) : [],
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date(s.created_at || Date.now()) }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', streamers.length, 'streamers to users');

  // 2. alert_settings
  const alertSettings = db.prepare('SELECT * FROM alert_settings').all();
  for (const a of alertSettings) {
    await mdb.collection('alert_settings').updateOne(
      { streamerId: a.streamer_id },
      {
        $set: {
          streamerId: a.streamer_id,
          templateStyle: a.template_style || 'neon-box',
          glowColor: a.glow_color || '#00F0FF',
          soundUrl: a.sound_url || '/sounds/neon-chime.mp3',
          soundVolume: a.sound_volume ?? 0.85,
          minAmountAlert: a.min_amount_alert ?? 1.0,
          durationSeconds: a.duration_seconds ?? 8,
          ttsEnabled: a.tts_enabled === 1,
          ttsMinAmount: a.tts_min_amount ?? 2.0,
          ttsVoice: a.tts_voice || 'Google US English',
          customGifUrl: a.custom_gif_url,
          textTemplate: a.text_template || '{donator} donated {amount} through superchat!',
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', alertSettings.length, 'alert_settings');

  // 3. payment_settings & gateway_settings
  const paymentSettings = db.prepare('SELECT * FROM payment_settings').all();
  for (const p of paymentSettings) {
    await mdb.collection('payment_settings').updateOne(
      { streamerId: p.streamer_id },
      {
        $set: {
          streamerId: p.streamer_id,
          abaMerchantId: p.aba_merchant_id,
          abaApiKey: p.aba_api_key,
          bakongAccountId: p.bakong_account_id,
          bakongAccountName: p.bakong_account_name,
          isSandbox: p.is_sandbox === 1,
          masterKhqrImage: p.master_khqr_image,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    if (p.master_khqr_image) {
      await mdb.collection('gateway_settings').updateOne(
        { _id: 'khqr_' + p.streamer_id },
        {
          $set: {
            _id: 'khqr_' + p.streamer_id,
            streamerId: p.streamer_id,
            khqrImageUrl: p.master_khqr_image,
            bakongAccountId: p.bakong_account_id,
            bankAccountName: p.bakong_account_name,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    }
  }
  console.log('✅ Migrated', paymentSettings.length, 'payment_settings');

  // 4. video_alert_settings
  const videoSettings = db.prepare('SELECT * FROM video_alert_settings').all();
  for (const v of videoSettings) {
    await mdb.collection('video_alert_settings').updateOne(
      { streamerId: v.streamer_id },
      {
        $set: {
          streamerId: v.streamer_id,
          isEnabled: v.is_enabled === 1,
          minTipAmount: v.min_tip_amount ?? 2.0,
          maxDurationSeconds: v.max_duration_seconds ?? 30,
          videoVolume: v.video_volume ?? 85,
          autoDucking: v.auto_ducking === 1,
          updatedAt: new Date(v.updated_at || Date.now())
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', videoSettings.length, 'video_alert_settings');

  // 5. donations
  const donations = db.prepare('SELECT * FROM donations').all();
  for (const d of donations) {
    await mdb.collection('donations').updateOne(
      { id: d.id },
      {
        $set: {
          id: d.id,
          streamerId: d.streamer_id,
          donorName: d.donor_name,
          donorMessage: d.donor_message,
          amount: d.amount,
          currency: d.currency,
          bankingName: d.banking_name,
          paymentMethod: d.payment_method,
          qrString: d.qr_string,
          videoUrl: d.video_url,
          videoTitle: d.video_title,
          videoStartTime: d.video_start_time,
          videoEndTime: d.video_end_time,
          status: d.status,
          isAlerted: d.is_alerted === 1,
          paidAt: d.paid_at,
          createdAt: new Date(d.created_at || Date.now())
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', donations.length, 'donations');

  // 6. overlay_token_history
  const history = db.prepare('SELECT * FROM overlay_token_history').all();
  for (const h of history) {
    await mdb.collection('overlay_token_history').updateOne(
      { token: h.token },
      {
        $set: {
          token: h.token,
          streamerId: h.streamer_id,
          createdAt: new Date(h.created_at || Date.now())
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', history.length, 'overlay_token_history');

  // 7. telegram_monitored_groups
  const tgGroups = db.prepare('SELECT * FROM telegram_monitored_groups').all();
  for (const tg of tgGroups) {
    await mdb.collection('telegram_monitored_groups').updateOne(
      { id: tg.id },
      {
        $set: {
          id: tg.id,
          streamerId: tg.streamer_id,
          chatId: tg.chat_id,
          title: tg.title,
          username: tg.username,
          createdAt: new Date(tg.created_at || Date.now()),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', tgGroups.length, 'telegram_monitored_groups');

  // 8. stream_timers
  const timers = db.prepare('SELECT * FROM stream_timers').all();
  for (const tm of timers) {
    await mdb.collection('stream_timers').updateOne(
      { streamerId: tm.streamer_id },
      {
        $set: {
          streamerId: tm.streamer_id,
          token: tm.token,
          title: tm.title,
          durationSeconds: tm.duration_seconds,
          remainingSeconds: tm.remaining_seconds,
          isActive: tm.is_active === 1,
          templateStyle: tm.template_style,
          glowColor: tm.glow_color,
          topUpRules: tm.top_up_rules ? JSON.parse(tm.top_up_rules) : [],
          updatedAt: new Date(tm.updated_at || Date.now())
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', timers.length, 'stream_timers');

  // 9. stream_goals
  const goals = db.prepare('SELECT * FROM stream_goals').all();
  for (const g of goals) {
    await mdb.collection('stream_goals').updateOne(
      { id: g.id },
      {
        $set: {
          id: g.id,
          streamerId: g.streamer_id,
          title: g.title,
          targetAmount: g.target_amount,
          currentAmount: g.current_amount,
          currency: g.currency,
          endDate: g.end_date,
          theme: g.theme,
          isActive: g.is_active === 1,
          createdAt: new Date(g.created_at || Date.now()),
          updatedAt: new Date(g.updated_at || Date.now())
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', goals.length, 'stream_goals');

  // 10. stream_leaderboards
  const leaderboards = db.prepare('SELECT * FROM stream_leaderboards').all();
  for (const lb of leaderboards) {
    await mdb.collection('stream_leaderboards').updateOne(
      { streamerId: lb.streamer_id },
      {
        $set: {
          streamerId: lb.streamer_id,
          token: lb.token,
          title: lb.title,
          timeframe: lb.timeframe,
          layoutStyle: lb.layout_style,
          maxItems: lb.max_items,
          glowColor: lb.glow_color,
          showAmounts: lb.show_amounts === 1,
          showAvatars: lb.show_avatars === 1,
          updatedAt: new Date(lb.updated_at || Date.now())
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', leaderboards.length, 'stream_leaderboards');

  // 11. stream_soundboards & items
  const soundboards = db.prepare('SELECT * FROM stream_soundboards').all();
  for (const sb of soundboards) {
    await mdb.collection('stream_soundboards').updateOne(
      { streamerId: sb.streamer_id },
      {
        $set: {
          streamerId: sb.streamer_id,
          token: sb.token,
          masterVolume: sb.master_volume,
          isMuted: sb.is_muted === 1,
          updatedAt: new Date(sb.updated_at || Date.now())
        }
      },
      { upsert: true }
    );
  }
  const soundItems = db.prepare('SELECT * FROM stream_soundboard_items').all();
  for (const si of soundItems) {
    await mdb.collection('stream_soundboard_items').updateOne(
      { id: si.id },
      {
        $set: {
          id: si.id,
          streamerId: si.streamer_id,
          soundId: si.sound_id,
          title: si.title,
          fileUrl: si.file_url,
          volume: si.volume,
          hotkey: si.hotkey,
          category: si.category,
          sortOrder: si.sort_order,
          createdAt: new Date(si.created_at || Date.now())
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', soundboards.length, 'soundboards and', soundItems.length, 'soundboard items');

  // 12. pokemon_widget_settings
  const pokemonSettings = db.prepare('SELECT * FROM pokemon_widget_settings').all();
  for (const pk of pokemonSettings) {
    await mdb.collection('pokemon_widget_settings').updateOne(
      { streamerId: pk.streamer_id },
      {
        $set: {
          streamerId: pk.streamer_id,
          token: pk.token,
          defaultPokemonId: pk.default_pokemon_id,
          soundEnabled: pk.sound_enabled === 1,
          levelUpThreshold: pk.level_up_threshold,
          updatedAt: new Date(pk.updated_at || Date.now())
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', pokemonSettings.length, 'pokemon_widget_settings');

  // 13. platform_promotions
  const promos = db.prepare('SELECT * FROM platform_promotions').all();
  for (const pr of promos) {
    await mdb.collection('platform_promotions').updateOne(
      { id: pr.id },
      {
        $set: {
          id: pr.id,
          title: pr.title,
          bannerUrl: pr.banner_url,
          targetUrl: pr.target_url,
          isActive: pr.is_active === 1,
          createdAt: new Date(pr.created_at || Date.now())
        }
      },
      { upsert: true }
    );
  }
  console.log('✅ Migrated', promos.length, 'platform_promotions');

  console.log('🎉 ALL SQLITE DATA SUCCESSFULLY MIGRATED TO MONGODB 100%!');
  await client.close();
}

migrate().catch(console.error);
