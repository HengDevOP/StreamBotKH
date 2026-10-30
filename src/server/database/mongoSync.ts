import {
  getUsersCollection,
  getDonationsCollection,
  getAlertSettingsCollection,
  getPaymentSettingsCollection,
  getVideoAlertSettingsCollection,
  getOverlayTokenHistoryCollection,
  getStreamTimersCollection,
  getStreamGoalsCollection,
  getStreamLeaderboardsCollection,
  getSoundboardsCollection,
  getSoundboardItemsCollection,
  getPokemonSettingsCollection,
  getPromotionsCollection,
  getIssueReportsCollection,
  getTelegramMonitoredGroupsCollection
} from './mongo';

/**
 * Seed in-memory SQLite database tables from MongoDB Atlas collections
 */
export async function seedMemoryDbFromMongo(db: any) {
  try {
    console.log('⚡ [MongoDB Atlas -> Memory] Loading collections into memory...');

    // 1. Streamers / Users
    try {
      const usersCol = await getUsersCollection();
      const users = await usersCol.find({}).toArray();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO streamers (
          id, email, username, display_name, avatar_url, bio, custom_thanks_message,
          is_verified, plan, plan_started_at, plan_expires_at, plan_duration_days,
          overlay_token, telegram_phone, telegram_session, telegram_user_name,
          telegram_api_id, telegram_api_hash, telegram_pairing_code, social_links, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of users) {
        const uId = u.userId || (u as any).id || String(u._id);
        stmt.run(
          uId,
          u.email || null,
          u.username || 'streamer',
          u.displayName || u.username || 'Streamer',
          u.avatarUrl || null,
          u.bio || null,
          u.customThanksMessage || null,
          u.isVerified ? 1 : 0,
          u.plan || 'free',
          u.planStartedAt || null,
          u.planExpiresAt || null,
          u.planDurationDays || 0,
          u.overlayToken || u.overlay_token || null,
          u.telegramPhone || null,
          u.telegramSession || null,
          u.telegramUserName || null,
          u.telegramApiId || null,
          u.telegramApiHash || null,
          u.telegramPairingCode || null,
          JSON.stringify(u.socialLinks || []),
          u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString()
        );
      }
    } catch (e) {
      console.warn('[MongoSync] Users load warning:', e);
    }

    // 2. Alert Settings
    try {
      const alertCol = await getAlertSettingsCollection();
      const alerts = await alertCol.find({}).toArray();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO alert_settings (
          streamer_id, template_style, glow_color, sound_url, sound_volume,
          min_amount_alert, duration_seconds, tts_enabled, tts_min_amount,
          tts_voice, custom_gif_url, text_template
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const a of alerts) {
        stmt.run(
          a.streamerId,
          a.templateStyle || (a as any).template_style || 'neon-box',
          a.glowColor || (a as any).glow_color || '#00F0FF',
          a.soundUrl || (a as any).sound_url || '/sounds/neon-chime.mp3',
          a.soundVolume ?? (a as any).sound_volume ?? 0.85,
          a.minAmountAlert ?? (a as any).min_amount_alert ?? 1.0,
          a.durationSeconds ?? (a as any).duration_seconds ?? 8,
          a.ttsEnabled !== undefined ? (a.ttsEnabled ? 1 : 0) : ((a as any).tts_enabled ?? 1),
          (a as any).tts_min_amount ?? 1.0,
          a.ttsVoice || (a as any).tts_voice || 'Google US English',
          a.customGifUrl || (a as any).custom_gif_url || null,
          a.textTemplate || (a as any).text_template || '{name} dropped {amount} on the stream! 💥'
        );
      }
    } catch (e) {
      console.warn('[MongoSync] Alert settings load warning:', e);
    }

    // 3. Video Alert Settings
    try {
      const videoCol = await getVideoAlertSettingsCollection();
      const videos = await videoCol.find({}).toArray();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO video_alert_settings (
          streamer_id, is_enabled, min_tip_amount, max_duration_seconds, video_volume, auto_ducking
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const v of videos) {
        stmt.run(
          v.streamerId,
          v.isEnabled !== undefined ? (v.isEnabled ? 1 : 0) : ((v as any).is_enabled ?? 1),
          Number(v.minTipAmount ?? (v as any).min_tip_amount ?? 2.0),
          Number(v.maxDurationSeconds ?? (v as any).max_duration_seconds ?? 30),
          Number((v as any).videoVolume ?? (v as any).video_volume ?? 85),
          (v as any).autoDucking !== undefined ? ((v as any).autoDucking ? 1 : 0) : ((v as any).auto_ducking ?? 1)
        );
      }
    } catch (e) {
      console.warn('[MongoSync] Video alert settings load warning:', e);
    }

    // 4. Payment Settings
    try {
      const payCol = await getPaymentSettingsCollection();
      const pays = await payCol.find({}).toArray();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO payment_settings (
          streamer_id, aba_merchant_id, aba_api_key, bakong_account_id, bakong_account_name, is_sandbox, master_khqr_image
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of pays) {
        stmt.run(
          p.streamerId,
          p.abaPaywayMerchantId || (p as any).aba_merchant_id || 'ec439126',
          p.abaPaywayApiKey || (p as any).aba_api_key || 'f60b06ca198c61e8601ff7a68393ceee47cb50cb',
          p.bakongAccountId || (p as any).bakong_account_id || 'streamneon@abaa',
          p.bankAccountName || (p as any).bakong_account_name || 'NEON STREAMER VIP',
          p.isLiveMode !== undefined ? (p.isLiveMode ? 0 : 1) : ((p as any).is_sandbox ?? 1),
          p.masterKhqrImage || (p as any).master_khqr_image || null
        );
      }
    } catch (e) {
      console.warn('[MongoSync] Payment settings load warning:', e);
    }

    // 5. Donations (last 500)
    try {
      const donCol = await getDonationsCollection();
      const dons = await donCol.find({}).sort({ createdAt: -1 }).limit(500).toArray();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO donations (
          id, streamer_id, donor_name, donor_message, amount, currency, banking_name,
          payment_method, payway_tran_id, qr_string, video_url, video_title,
          video_start_time, video_end_time, status, is_alerted, paid_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of dons) {
        stmt.run(
          d.id,
          d.streamerId || (d as any).streamer_id,
          d.donorName || (d as any).donor_name,
          d.donorMessage || (d as any).donor_message || null,
          d.amount,
          d.currency,
          d.bankingName || (d as any).banking_name || null,
          d.paymentMethod || (d as any).payment_method || 'BAKONG_KHQR',
          d.paywayTranId || (d as any).payway_tran_id || null,
          d.qrString || (d as any).qr_string || null,
          d.videoUrl || (d as any).video_url || null,
          d.videoTitle || (d as any).video_title || null,
          d.videoStartTime ?? (d as any).video_start_time ?? 0,
          d.videoEndTime ?? (d as any).video_end_time ?? 0,
          d.status,
          d.isAlerted !== undefined ? (d.isAlerted ? 1 : 0) : ((d as any).is_alerted ?? 0),
          d.paidAt ? new Date(d.paidAt).toISOString() : null,
          d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString()
        );
      }
    } catch (e) {
      console.warn('[MongoSync] Donations load warning:', e);
    }

    // 6. Overlay Token History
    try {
      const histCol = await getOverlayTokenHistoryCollection();
      const hists = await histCol.find({}).toArray();
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO overlay_token_history (token, streamer_id, created_at)
        VALUES (?, ?, ?)
      `);
      for (const h of hists) {
        stmt.run(h.token, h.streamerId, h.createdAt ? new Date(h.createdAt).toISOString() : new Date().toISOString());
      }
    } catch (e) {}

    // 7. Telegram Monitored Groups
    try {
      const grpCol = await getTelegramMonitoredGroupsCollection();
      const grps = await grpCol.find({}).toArray();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO telegram_monitored_groups (id, streamer_id, chat_id, title, username, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const g of grps) {
        stmt.run(
          g.id,
          g.streamerId,
          g.chatId || (g as any).chat_id,
          g.title,
          g.username || null,
          g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString()
        );
      }
    } catch (e) {}

    // 8. Stream Goals
    try {
      const goalCol = await getStreamGoalsCollection();
      const goals = await goalCol.find({}).toArray();
      const usersCol = await getUsersCollection();

      // Build a streamerId → overlayToken lookup for resolving goals with no streamerToken
      const streamerTokenMap = new Map<string, string>();
      const allUsers = await usersCol.find({}, { projection: { userId: 1, overlayToken: 1, overlay_token: 1 } }).toArray();
      for (const u of allUsers) {
        const uid = (u as any).userId || (u as any).id;
        const tok = (u as any).overlayToken || (u as any).overlay_token;
        if (uid && tok) streamerTokenMap.set(uid, tok);
      }

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO stream_goals (
          id, streamer_token, title, target_amount, current_amount,
          initial_amount, accent_color, template_style,
          show_balance, show_background, show_animation,
          end_date, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const defaultStreamerToken = streamerTokenMap.get('fabfcb4c-6719-42fb-aa74-bfdf5619c6dc') || Array.from(streamerTokenMap.values())[0] || 'demo-token';
      for (const g of goals) {
        // Resolve the SQLite streamer_token: prefer streamerToken, then look up streamerId → overlayToken
        const resolvedToken = (g as any).streamerToken
          || (g.streamerId ? streamerTokenMap.get(g.streamerId) : null)
          || g.streamerId
          || defaultStreamerToken;
        const goalId = (g as any).id || String(g._id);
        stmt.run(
          goalId,
          resolvedToken,
          g.title,
          g.targetAmount ?? 0,
          g.currentAmount ?? 0,
          (g as any).initialAmount ?? 0,
          (g as any).accentColor || '#10B981',
          (g as any).templateStyle || g.theme || 'cyber-neon',
          (g as any).showBalance !== false ? 1 : 0,
          (g as any).showBackground !== false ? 1 : 0,
          (g as any).showAnimation !== false ? 1 : 0,
          (g as any).endDate || null,
          g.isActive ? 1 : 0,
          g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString(),
          g.updatedAt ? new Date(g.updatedAt).toISOString() : new Date().toISOString()
        );
      }
    } catch (e) {}

    // 9. Soundboard & Items
    try {
      const sbCol = await getSoundboardsCollection();
      const sbs = await sbCol.find({}).toArray();
      const sbStmt = db.prepare(`
        INSERT OR REPLACE INTO stream_soundboards (id, streamer_token, is_enabled, master_volume, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const sb of (sbs as any[])) {
        sbStmt.run(String(sb._id), sb.streamerToken, sb.isEnabled ? 1 : 0, sb.masterVolume, new Date().toISOString());
      }

      const sbiCol = await getSoundboardItemsCollection();
      const items = await sbiCol.find({}).toArray();
      const itemStmt = db.prepare(`
        INSERT OR REPLACE INTO stream_soundboard_items (id, streamer_token, label, audio_url, volume, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of (items as any[])) {
        itemStmt.run(
          String(item._id),
          item.streamerToken,
          item.label,
          item.audioUrl,
          item.volume,
          item.sortOrder,
          new Date().toISOString()
        );
      }
    } catch (e) {}

    // 10. Pokemon Widget Settings
    try {
      const pokeCol = await getPokemonSettingsCollection();
      const pokes = await pokeCol.find({}).toArray();
      const pokeStmt = db.prepare(`
        INSERT OR REPLACE INTO pokemon_widget_settings (id, streamer_token, is_enabled, theme, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const p of (pokes as any[])) {
        pokeStmt.run(String(p._id), p.streamerToken, (p.isEnabled ?? p.enabled) ? 1 : 0, p.theme || 'default', new Date().toISOString());
      }
    } catch (e) {}

    // 11. Platform Promotions
    try {
      const promoCol = await getPromotionsCollection();
      const promos = await promoCol.find({}).toArray();
      const promoStmt = db.prepare(`
        INSERT OR REPLACE INTO platform_promotions (
          id, is_enabled, promo_title, promo_price_usd, promo_price_khr,
          original_price_usd, original_price_khr, annual_discount_percent, start_date, end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of (promos as any[])) {
        promoStmt.run(
          p.id,
          (p.isEnabled ?? p.is_enabled) ? 1 : 0,
          p.promoTitle ?? p.promo_title,
          p.promoPriceUsd ?? p.promo_price_usd,
          p.promoPriceKhr ?? p.promo_price_khr,
          p.originalPriceUsd ?? p.original_price_usd,
          p.originalPriceKhr ?? p.original_price_khr,
          p.annualDiscountPercent || p.annual_discount_percent || 10,
          p.startDate || p.start_date ? new Date(p.startDate || p.start_date).toISOString() : null,
          p.endDate || p.end_date ? new Date(p.endDate || p.end_date).toISOString() : null
        );
      }
    } catch (e) {}

    // 12. Issue Reports
    try {
      const issueCol = await getIssueReportsCollection();
      const issues = await issueCol.find({}).toArray();
      const issueStmt = db.prepare(`
        INSERT OR REPLACE INTO issue_reports (
          id, streamer_id, streamer_username, title, description, category, priority, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const iss of (issues as any[])) {
        issueStmt.run(
          iss.id,
          iss.streamerId,
          iss.streamerUsername,
          iss.title,
          iss.description,
          iss.category,
          iss.priority,
          iss.status,
          iss.createdAt ? new Date(iss.createdAt).toISOString() : new Date().toISOString()
        );
      }
    } catch (e) {}

    console.log('✅ [MongoDB Atlas -> Memory] Successfully loaded MongoDB collections into in-memory database!');
  } catch (err: any) {
    console.error('❌ [MongoSync] Error during seedMemoryDbFromMongo:', err?.message || err);
  }
}

/**
 * Intercept SQLite write statements and mirror modifications to MongoDB Atlas
 */
export function mirrorSqlWriteToMongo(sql: string, params: any[], memoryDb: any) {
  const cleanSql = sql.trim().toUpperCase();
  if (!cleanSql.startsWith('INSERT') && !cleanSql.startsWith('UPDATE') && !cleanSql.startsWith('DELETE')) {
    return;
  }

  // Asynchronously sync to MongoDB Atlas without blocking memory query execution
  setImmediate(async () => {
    try {
      // Streamers
      if (cleanSql.includes('INTO STREAMERS') || cleanSql.includes('UPDATE STREAMERS')) {
        const usersCol = await getUsersCollection();
        const idParam = params[0] || params[params.length - 1];
        if (idParam) {
          const row = memoryDb.prepare('SELECT * FROM streamers WHERE id = ?').get(idParam) as any;
          if (row) {
            let parsedLinks: any[] = [];
            try { parsedLinks = JSON.parse(row.social_links); } catch (_) {}
            await usersCol.updateOne(
              { $or: [{ userId: row.id }, { id: row.id as any }] },
              {
                $set: {
                  userId: row.id,
                  username: row.username,
                  displayName: row.display_name,
                  email: row.email,
                  avatarUrl: row.avatar_url,
                  bio: row.bio,
                  customThanksMessage: row.custom_thanks_message,
                  isVerified: row.is_verified === 1,
                  plan: row.plan,
                  overlayToken: row.overlay_token,
                  overlay_token: row.overlay_token,
                  telegramPhone: row.telegram_phone,
                  telegramSession: row.telegram_session,
                  telegramUserName: row.telegram_user_name,
                  telegramApiId: row.telegram_api_id,
                  telegramApiHash: row.telegram_api_hash,
                  telegramPairingCode: row.telegram_pairing_code,
                  socialLinks: parsedLinks,
                  updatedAt: new Date()
                },
                $setOnInsert: { createdAt: new Date() }
              },
              { upsert: true }
            );
          }
        }
      }

      // Video Alert Settings
      if (cleanSql.includes('VIDEO_ALERT_SETTINGS')) {
        const videoCol = await getVideoAlertSettingsCollection();
        const streamerId = params[0] || params[params.length - 1];
        if (streamerId) {
          const row = memoryDb.prepare('SELECT * FROM video_alert_settings WHERE streamer_id = ?').get(streamerId) as any;
          if (row) {
            await videoCol.updateOne(
              { streamerId: row.streamer_id },
              {
                $set: {
                  streamerId: row.streamer_id,
                  isEnabled: row.is_enabled === 1,
                  is_enabled: row.is_enabled,
                  minTipAmount: Number(row.min_tip_amount),
                  maxDurationSeconds: Number(row.max_duration_seconds),
                  videoVolume: Number(row.video_volume),
                  autoDucking: row.auto_ducking === 1,
                  updatedAt: new Date()
                },
                $setOnInsert: { createdAt: new Date() }
              },
              { upsert: true }
            );
          }
        }
      }

      // Alert Settings
      if (cleanSql.includes('ALERT_SETTINGS') && !cleanSql.includes('VIDEO_ALERT_SETTINGS')) {
        const alertCol = await getAlertSettingsCollection();
        const streamerId = params[0] || params[params.length - 1];
        if (streamerId) {
          const row = memoryDb.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(streamerId) as any;
          if (row) {
            await alertCol.updateOne(
              { streamerId: row.streamer_id },
              {
                $set: {
                  streamerId: row.streamer_id,
                  templateStyle: row.template_style,
                  glowColor: row.glow_color,
                  soundUrl: row.sound_url,
                  soundVolume: row.sound_volume,
                  minAmountAlert: row.min_amount_alert,
                  durationSeconds: row.duration_seconds,
                  ttsEnabled: row.tts_enabled === 1,
                  ttsVoice: row.tts_voice,
                  customGifUrl: row.custom_gif_url,
                  textTemplate: row.text_template,
                  updatedAt: new Date()
                },
                $setOnInsert: { createdAt: new Date() }
              },
              { upsert: true }
            );
          }
        }
      }

      // Payment Settings
      if (cleanSql.includes('PAYMENT_SETTINGS')) {
        const payCol = await getPaymentSettingsCollection();
        const streamerId = params[0] || params[params.length - 1];
        if (streamerId) {
          const row = memoryDb.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(streamerId) as any;
          if (row) {
            await payCol.updateOne(
              { streamerId: row.streamer_id },
              {
                $set: {
                  streamerId: row.streamer_id,
                  abaPaywayMerchantId: row.aba_merchant_id,
                  abaPaywayApiKey: row.aba_api_key,
                  bakongAccountId: row.bakong_account_id,
                  bankAccountName: row.bakong_account_name,
                  isLiveMode: row.is_sandbox === 0,
                  masterKhqrImage: row.master_khqr_image,
                  updatedAt: new Date()
                },
                $setOnInsert: { createdAt: new Date() }
              },
              { upsert: true }
            );
          }
        }
      }

      // Donations
      if (cleanSql.includes('DONATIONS')) {
        const donCol = await getDonationsCollection();
        if (cleanSql.startsWith('DELETE')) {
          const id = params[0];
          if (id) {
            await donCol.deleteMany({ $or: [{ id }, { streamerId: id }] });
          }
        } else {
          const id = params[0];
          if (id) {
            const row = memoryDb.prepare('SELECT * FROM donations WHERE id = ?').get(id) as any;
            if (row) {
              await donCol.updateOne(
                { id: row.id },
                {
                  $set: {
                    id: row.id,
                    streamerId: row.streamer_id,
                    donorName: row.donor_name,
                    donorMessage: row.donor_message,
                    amount: row.amount,
                    currency: row.currency,
                    bankingName: row.banking_name,
                    paymentMethod: row.payment_method,
                    paywayTranId: row.payway_tran_id,
                    videoUrl: row.video_url,
                    videoTitle: row.video_title,
                    videoStartTime: row.video_start_time,
                    videoEndTime: row.video_end_time,
                    status: row.status,
                    isAlerted: row.is_alerted,
                    paidAt: row.paid_at ? new Date(row.paid_at) : null,
                    updatedAt: new Date()
                  },
                  $setOnInsert: { createdAt: row.created_at ? new Date(row.created_at) : new Date() }
                },
                { upsert: true }
              );
            }
          }
        }
      }

      // Stream Goals
      if (cleanSql.includes('STREAM_GOALS')) {
        const goalsCol = await getStreamGoalsCollection();
        if (cleanSql.startsWith('DELETE')) {
          const id = params[0];
          if (id) {
            await goalsCol.deleteMany({ $or: [{ id }, { _id: id as any }] });
          }
        } else {
          const id = params[0] || params[params.length - 2];
          if (id) {
            const row = memoryDb.prepare('SELECT * FROM stream_goals WHERE id = ?').get(id) as any;
            if (row) {
              const usersCol = await getUsersCollection();
              const owner = await usersCol.findOne({
                $or: [{ overlayToken: row.streamer_token }, { overlay_token: row.streamer_token } as any]
              });
              await goalsCol.updateOne(
                { $or: [{ id: row.id }, { _id: row.id as any }] },
                {
                  $set: {
                    id: row.id,
                    streamerToken: row.streamer_token,
                    streamerId: owner?.userId || (owner as any)?.id || null,
                    title: row.title,
                    targetAmount: Number(row.target_amount),
                    currentAmount: Number(row.current_amount),
                    initialAmount: Number(row.initial_amount || 0),
                    accentColor: row.accent_color,
                    templateStyle: row.template_style,
                    theme: row.template_style,
                    showBalance: row.show_balance === 1,
                    showBackground: row.show_background === 1,
                    showAnimation: row.show_animation === 1,
                    endDate: row.end_date,
                    isActive: row.is_active === 1,
                    updatedAt: new Date()
                  },
                  $setOnInsert: { createdAt: row.created_at ? new Date(row.created_at) : new Date() }
                },
                { upsert: true }
              );
            }
          }
        }
      }
    } catch (mirrorErr) {
      // Non-fatal background sync error
    }
  });
}
