import axios from 'axios';
import { ENV } from '../config/env';
import { db } from '../database/db';
import { broadcastAlertToOverlay } from './socketService';

export interface TelegramDonationNotification {
  chatId: string;
  streamerName: string;
  donorName: string;
  donorMessage?: string;
  amount: number;
  currency: string;
  tranId: string;
  bankingName?: string;
}

export async function sendTelegramMessage(chatId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  if (!ENV.TELEGRAM_BOT_TOKEN) {
    console.log(`[Telegram] [MOCK BOT] Would send to Chat ID ${chatId}:\n${text}`);
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: parseMode
    });
  } catch (error: any) {
    console.error('[Telegram] Failed to send message:', error?.response?.data || error.message);
  }
}

export async function sendTelegramDonationAlert(params: TelegramDonationNotification) {
  const { chatId, streamerName, donorName, donorMessage, amount, currency, tranId, bankingName } = params;

  const formattedAmount = currency === 'KHR'
    ? `${amount.toLocaleString()} ៛`
    : `$${amount.toFixed(2)}`;

  const messageText = `
⚡ <b>StreamNeon VIP Alert!</b> ⚡
━━━━━━━━━━━━━━━━━━━━
🎉 <b>New Donation Received!</b>
👤 <b>Donor:</b> <code>${donorName}</code>
💰 <b>Amount:</b> <b>${formattedAmount}</b>
${bankingName ? `🏦 <b>Bank App:</b> <code>${bankingName}</code>\n` : ''}${donorMessage ? `💬 <b>Message:</b> <i>"${donorMessage}"</i>\n` : ''}🔖 <b>Ref:</b> <code>${tranId}</code>
━━━━━━━━━━━━━━━━━━━━
<i>Live alert dispatched to your OBS overlay screen!</i> 🚀
`.trim();

  await sendTelegramMessage(chatId, messageText);
}

/**
 * Handle incoming Telegram bot messages (via webhook or polling)
 */
export async function handleTelegramUpdate(update: any) {
  const message = update?.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  // 1. /start [code]
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const code = parts[1]?.trim();

    if (code) {
      // Find streamer by pairing code or overlay token
      const streamer = db.prepare(`
        SELECT id, display_name, overlay_token
        FROM streamers
        WHERE telegram_pairing_code = ? OR overlay_token = ?
      `).get(code, code) as any;

      if (streamer) {
        db.prepare('UPDATE streamers SET telegram_chat_id = ? WHERE id = ?').run(chatId, streamer.id);

        const welcomeText = `
✅ <b>Connected Successfully to StreamNeon.vip!</b>

Welcome, <b>${streamer.display_name}</b>!
Your Telegram account is now linked. You will receive instant notifications whenever a fan tips you via ABA PayWay or Bakong KHQR.

<b>Available Commands:</b>
/balance - Check today's earnings & stats
/recent - View latest donations
/testalert - Trigger a test alert on your OBS overlay
/unlink - Disconnect this Telegram account
        `.trim();
        await sendTelegramMessage(chatId, welcomeText);
        return;
      }
    }

    const helpText = `
👋 <b>Welcome to StreamNeon Alert Bot!</b>

To connect your streamer account:
1. Go to your <b>StreamNeon VIP Dashboard</b>
2. Click on the <b>Telegram Alerts</b> card
3. Click your pairing link or type:
<code>/start &lt;YOUR_PAIRING_CODE&gt;</code>
    `.trim();
    await sendTelegramMessage(chatId, helpText);
    return;
  }

  // Find linked streamer for this chat
  const streamer = db.prepare('SELECT * FROM streamers WHERE telegram_chat_id = ?').get(chatId) as any;

  if (!streamer) {
    await sendTelegramMessage(chatId, '⚠️ This Telegram chat is not linked to any StreamNeon account yet. Please send <code>/start &lt;PAIRING_CODE&gt;</code>.');
    return;
  }

  // 2. /balance
  if (text === '/balance') {
    const statsToday = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_usd
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'USD'
      AND date(paid_at) = date('now')
    `).get(streamer.id) as any;

    const statsTodayKhr = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_khr
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'KHR'
      AND date(paid_at) = date('now')
    `).get(streamer.id) as any;

    const allTimeUsd = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID' AND currency = 'USD'
    `).get(streamer.id) as any;

    const balText = `
📊 <b>Donation Summary for ${streamer.display_name}</b>
━━━━━━━━━━━━━━━━━━━━
<b>Today's Tips:</b>
• Total Donors: <b>${statsToday.count}</b>
• Revenue USD: <b>$${Number(statsToday.total_usd).toFixed(2)}</b>
• Revenue KHR: <b>${Number(statsTodayKhr.total_khr).toLocaleString()} ៛</b>

<b>All-Time Revenue:</b>
• Total USD: <b>$${Number(allTimeUsd.total).toFixed(2)}</b>
━━━━━━━━━━━━━━━━━━━━
    `.trim();
    await sendTelegramMessage(chatId, balText);
    return;
  }

  // 3. /recent
  if (text === '/recent') {
    const recent = db.prepare(`
      SELECT donor_name, amount, currency, donor_message, paid_at
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID'
      ORDER BY paid_at DESC
      LIMIT 5
    `).all(streamer.id) as any[];

    if (recent.length === 0) {
      await sendTelegramMessage(chatId, '📭 No donations recorded yet. Share your stream link to start receiving tips!');
      return;
    }

    let listText = `<b>Recent 5 Donations for ${streamer.display_name}:</b>\n\n`;
    for (const d of recent) {
      const amt = d.currency === 'KHR' ? `${d.amount.toLocaleString()} ៛` : `$${d.amount.toFixed(2)}`;
      listText += `• <b>${d.donor_name}</b>: <b>${amt}</b>\n  <i>"${d.donor_message || 'No message'}"</i>\n`;
    }
    await sendTelegramMessage(chatId, listText);
    return;
  }

  // 4. /testalert
  if (text === '/testalert') {
    const alertSettings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(streamer.id) as any;
    broadcastAlertToOverlay(streamer.overlay_token, {
      donationId: 'tg-test-' + Date.now(),
      donorName: 'Telegram Bot',
      donorMessage: 'Test alert sent directly from Telegram! 🚀',
      amount: 10.0,
      currency: 'USD',
      templateStyle: alertSettings?.template_style || 'neon-box',
      glowColor: alertSettings?.glow_color || '#00F0FF',
      soundUrl: alertSettings?.sound_url || '/sounds/neon-chime.mp3',
      soundVolume: alertSettings?.sound_volume || 0.8,
      durationSeconds: alertSettings?.duration_seconds || 8,
      ttsEnabled: true,
      ttsVoice: 'Google US English',
      isTest: true
    });

    await sendTelegramMessage(chatId, '⚡ <b>Test alert fired!</b> Check your OBS overlay screen.');
    return;
  }

  // 5. /unlink
  if (text === '/unlink') {
    db.prepare('UPDATE streamers SET telegram_chat_id = NULL WHERE id = ?').run(streamer.id);
    await sendTelegramMessage(chatId, '🔌 Disconnected. This Telegram account will no longer receive alerts.');
    return;
  }

  await sendTelegramMessage(chatId, '❓ Unknown command. Try /balance, /recent, or /testalert.');
}
