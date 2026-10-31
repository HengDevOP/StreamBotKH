import axios from 'axios';
import {
  getUsersCollection,
  getDonationsCollection,
  getAlertSettingsCollection
} from '../database/mongo';
import { broadcastAlertToOverlay } from './socketService';

export interface TelegramDonationAlertParams {
  chatId: string;
  streamerName: string;
  donorName: string;
  donorMessage?: string;
  amount: number;
  currency: 'USD' | 'KHR';
  bankingName?: string;
  tranId: string;
}

/**
 * Sends formatted Telegram message via Bot API
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }, { timeout: 6000 });
    return true;
  } catch (err: any) {
    console.error('[Telegram Bot] Send message error:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Sends real-time tip alert to streamer's private Telegram chat
 */
export async function sendTelegramDonationAlert(params: TelegramDonationAlertParams): Promise<boolean> {
  const { chatId, streamerName, donorName, donorMessage, amount, currency, bankingName, tranId } = params;

  const formattedAmount = currency === 'KHR'
    ? `${Number(amount).toLocaleString()} ៛`
    : `$${Number(amount).toFixed(2)}`;

  const messageText = `
⚡ <b>NEW BAKONG KHQR DONATION!</b> ⚡
━━━━━━━━━━━━━━━━━━━━
👤 <b>Supporter:</b> ${donorName}
💰 <b>Amount:</b> <code>${formattedAmount}</code>
🏦 <b>Via:</b> ${bankingName || 'Bakong KHQR'}
${donorMessage ? `💬 <b>Message:</b> <i>"${donorMessage}"</i>` : ''}
━━━━━━━━━━━━━━━━━━━━
🆔 <b>Tran ID:</b> <code>${tranId}</code>
🎉 Alert broadcasted live to your OBS overlay!
  `.trim();

  return sendTelegramMessage(chatId, messageText);
}

/**
 * Handles incoming Telegram bot webhook updates (/start, /balance, /recent, /unlink)
 */
export async function handleTelegramWebhookUpdate(body: any) {
  const message = body?.message;
  if (!message || !message.text) return;

  const chatId = String(message.chat.id);
  const text = message.text.trim();
  const usersCol = await getUsersCollection();
  const donationsCol = await getDonationsCollection();

  // 1. /start [code]
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const code = parts[1]?.trim();

    if (code) {
      // Find streamer by pairing code or overlay token in MongoDB
      const streamer = await usersCol.findOne({
        $or: [
          { telegramPairingCode: code },
          { overlayToken: code },
          { ['overlay_token']: code } as any,
          { ['telegram_pairing_code']: code } as any
        ]
      });

      if (streamer) {
        await usersCol.updateOne(
          { _id: streamer._id },
          {
            $set: {
              telegramChatId: chatId,
              telegram_chat_id: chatId,
              updatedAt: new Date()
            }
          }
        );

        const welcomeText = `
✅ <b>Connected Successfully to StreamNeon.vip!</b>

Welcome, <b>${streamer.displayName || streamer.username}</b>!
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

  // Find linked streamer for this chat in MongoDB
  const streamer = await usersCol.findOne({
    $or: [{ telegramChatId: chatId }, { ['telegram_chat_id']: chatId } as any]
  });

  if (!streamer) {
    await sendTelegramMessage(chatId, '⚠️ This Telegram chat is not linked to any StreamNeon account yet. Please send <code>/start &lt;PAIRING_CODE&gt;</code>.');
    return;
  }

  const streamerKey = streamer.userId || (streamer as any).id || String(streamer._id);

  // 2. /balance
  if (text === '/balance') {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const paidDonations = await donationsCol.find({
      $or: [{ streamerId: streamerKey }, ...(streamer.username ? [{ streamerUsername: streamer.username }] : [])],
      status: 'PAID'
    }).toArray();

    const todayDonations = paidDonations.filter((d) => {
      const dt = d.paidAt || d.createdAt;
      return dt && new Date(dt) >= startOfToday;
    });

    const todayUsd = todayDonations
      .filter((d) => d.currency === 'USD')
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const todayKhr = todayDonations
      .filter((d) => d.currency === 'KHR')
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const allTimeUsd = paidDonations
      .filter((d) => d.currency === 'USD')
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const balText = `
📊 <b>Donation Summary for ${streamer.displayName || streamer.username}</b>
━━━━━━━━━━━━━━━━━━━━
<b>Today's Tips:</b>
• Total Donors: <b>${todayDonations.length}</b>
• Revenue USD: <b>$${todayUsd.toFixed(2)}</b>
• Revenue KHR: <b>${todayKhr.toLocaleString()} ៛</b>

<b>All-Time Revenue:</b>
• Total USD: <b>$${allTimeUsd.toFixed(2)}</b>
━━━━━━━━━━━━━━━━━━━━
    `.trim();
    await sendTelegramMessage(chatId, balText);
    return;
  }

  // 3. /recent
  if (text === '/recent') {
    const recent = await donationsCol.find({
      $or: [{ streamerId: streamerKey }, ...(streamer.username ? [{ streamerUsername: streamer.username }] : [])],
      status: 'PAID'
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

    if (recent.length === 0) {
      await sendTelegramMessage(chatId, '📭 No donations recorded yet. Share your stream link to start receiving tips!');
      return;
    }

    let listText = `<b>Recent 5 Donations for ${streamer.displayName || streamer.username}:</b>\n\n`;
    for (const d of recent) {
      const amt = d.currency === 'KHR' ? `${Number(d.amount).toLocaleString()} ៛` : `$${Number(d.amount).toFixed(2)}`;
      listText += `• <b>${d.donorName}</b>: <b>${amt}</b>\n  <i>"${d.donorMessage || 'No message'}"</i>\n`;
    }
    await sendTelegramMessage(chatId, listText);
    return;
  }

  // 4. /testalert
  if (text === '/testalert') {
    const alertSettingsCol = await getAlertSettingsCollection();
    const alertSettings = await alertSettingsCol.findOne({
      $or: [{ streamerId: streamerKey }, ...(streamer.username ? [{ streamerId: streamer.username }] : [])]
    });

    const overlayToken = streamer.overlayToken || (streamer as any).overlay_token;
    if (overlayToken) {
      broadcastAlertToOverlay(overlayToken, {
        donationId: 'tg-test-' + Date.now(),
        donorName: 'Telegram Bot',
        donorMessage: 'Test alert sent directly from Telegram! 🚀',
        amount: 10.0,
        currency: 'USD',
        templateStyle: alertSettings?.templateStyle || 'neon-box',
        glowColor: alertSettings?.glowColor || '#00F0FF',
        soundUrl: alertSettings?.soundUrl || '/sounds/neon-chime.mp3',
        soundVolume: alertSettings?.soundVolume ?? 0.8,
        durationSeconds: alertSettings?.durationSeconds || 8,
        ttsEnabled: true,
        ttsVoice: 'Google US English',
        isTest: true
      });
      await sendTelegramMessage(chatId, '⚡ <b>Test alert fired!</b> Check your OBS overlay screen.');
    } else {
      await sendTelegramMessage(chatId, '⚠️ Could not find active overlay token.');
    }
    return;
  }

  // 5. /unlink
  if (text === '/unlink') {
    await usersCol.updateOne(
      { _id: streamer._id },
      {
        $unset: {
          telegramChatId: '',
          telegram_chat_id: ''
        }
      }
    );
    await sendTelegramMessage(chatId, '🔌 Disconnected. This Telegram account will no longer receive alerts.');
    return;
  }

  await sendTelegramMessage(chatId, '❓ Unknown command. Try /balance, /recent, or /testalert.');
}
