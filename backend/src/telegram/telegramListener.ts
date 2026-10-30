import axios from 'axios';
import { PhraseCatcher, ParsedDonationPhrase } from './phraseCatcher';
import { v4 as uuidv4 } from 'uuid';
import { broadcastAlertToOverlay, broadcastDonationToDashboard } from '../../../src/server/services/socketService';
import { findMatchingTemporaryDonation, isGenericBankKeyword } from '../../../src/server/utils/nameMatching';
import {
  getUsersCollection,
  getDonationsCollection,
  getAlertSettingsCollection,
  getVideoAlertSettingsCollection,
  getTemporaryDonationsCollection,
  getAlertBoxesCollection,
  cleanupExpiredPendingDonationsMongo
} from '../../../src/server/database/mongo';

export interface TelegramListenerConfig {
  botToken?: string;
  defaultStreamerUsername?: string;
  autoReplyInGroup?: boolean;
}

export interface CaughtPhraseLog {
  id: string;
  timestamp: string;
  chatId: string;
  chatTitle: string;
  rawText: string;
  parsed: ParsedDonationPhrase;
  triggered: boolean;
  streamerUsername: string;
}

export class TelegramGroupListener {
  private static instance: TelegramGroupListener;
  private botToken: string = process.env.TELEGRAM_BOT_TOKEN || '';
  private isPolling: boolean = false;
  private pollOffset: number = 0;
  private pollingTimeout: any = null;
  private autoReply: boolean = true;
  private recentLogs: CaughtPhraseLog[] = [];
  private botInfo: any = null;
  private monitoredGroups: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): TelegramGroupListener {
    if (!TelegramGroupListener.instance) {
      TelegramGroupListener.instance = new TelegramGroupListener();
    }
    return TelegramGroupListener.instance;
  }

  public setToken(token: string) {
    this.botToken = token.trim();
  }

  public getToken(): string {
    return this.botToken;
  }

  public isRunning(): boolean {
    return this.isPolling;
  }

  public getBotInfo(): any {
    return this.botInfo;
  }

  public getMonitoredGroups(): string[] {
    return Array.from(this.monitoredGroups);
  }

  public getRecentLogs(): CaughtPhraseLog[] {
    return this.recentLogs.slice(0, 50);
  }

  /**
   * Start long-polling listener for group messages
   */
  public async start(token?: string): Promise<{ success: boolean; message: string; bot?: any }> {
    if (token) this.botToken = token.trim();

    if (!this.botToken) {
      return { success: false, message: 'Telegram Bot Token is required to start listener.' };
    }

    try {
      // 1. Validate bot token with getMe
      const meRes = await axios.get(`https://api.telegram.org/bot${this.botToken}/getMe`, { timeout: 10000 });
      if (!meRes.data?.ok) {
        return { success: false, message: 'Invalid Telegram Bot Token.' };
      }

      this.botInfo = meRes.data.result;
      this.isPolling = true;
      console.log(`⚡ [Telegram Listener] Connected as @${this.botInfo.username}. Starting group listener...`);

      // 2. Begin Polling Loop
      this.pollLoop();

      return {
        success: true,
        message: `Listening to Telegram group messages as @${this.botInfo.username}`,
        bot: this.botInfo
      };
    } catch (err: any) {
      console.error('[Telegram Listener] Connection failed:', err?.response?.data || err.message);
      return {
        success: false,
        message: err?.response?.data?.description || err.message || 'Connection failed'
      };
    }
  }

  /**
   * Stop long-polling listener
   */
  public stop() {
    this.isPolling = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
    console.log('⚡ [Telegram Listener] Stopped listening.');
  }

  /**
   * The long-polling loop
   */
  private async pollLoop() {
    if (!this.isPolling || !this.botToken) return;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
      const response = await axios.get(url, {
        params: {
          offset: this.pollOffset,
          timeout: 25, // 25 seconds long-polling
          allowed_updates: JSON.stringify(['message', 'channel_post'])
        },
        timeout: 35000
      });

      if (response.data?.ok && Array.isArray(response.data.result)) {
        for (const update of response.data.result) {
          this.pollOffset = update.update_id + 1;
          await this.processUpdate(update);
        }
      }
    } catch (error: any) {
      // Handle network or polling errors gracefully without crashing
      if (error?.code !== 'ECONNABORTED' && !error?.message?.includes('timeout')) {
        console.warn('[Telegram Listener] Polling warning:', error?.response?.data?.description || error.message);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }

    if (this.isPolling) {
      this.pollingTimeout = setTimeout(() => this.pollLoop(), 300);
    }
  }

  /**
   * Process a single incoming Telegram update from a group or channel
   */
  public async processUpdate(update: any) {
    const message = update?.message || update?.channel_post;
    if (!message) return;

    const text = message.text || message.caption || '';
    if (!text.trim()) return;

    const chat = message.chat;
    const chatId = chat.id.toString();
    const chatTitle = chat.title || chat.username || `Chat_${chatId}`;

    // Track group
    if (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') {
      this.monitoredGroups.add(`${chatTitle} (${chatId})`);
    }

    const sender = message.from;
    const senderName = sender
      ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.username || 'Anonymous'
      : 'Anonymous Donor';

    // Run the Phrase Catcher Engine
    const parsed = PhraseCatcher.parse(text, senderName);

    if (parsed.matched) {
      console.log(`🎯 [Phrase Catcher] Matched donation in "${chatTitle}": $${parsed.amount} ${parsed.currency} from ${parsed.donorName}`);
      await this.dispatchDonationAlert(parsed, chatId, chatTitle, message.message_id);
    }

    // Record in memory log
    this.recentLogs.unshift({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      chatId,
      chatTitle,
      rawText: text,
      parsed,
      triggered: parsed.matched,
      streamerUsername: 'neonstreamer'
    });

    if (this.recentLogs.length > 100) {
      this.recentLogs = this.recentLogs.slice(0, 100);
    }
  }

  /**
   * Save donation to database and fire real-time OBS alert via Socket.IO
   */
  public async dispatchDonationAlert(
    parsed: ParsedDonationPhrase,
    chatId: string,
    chatTitle: string,
    messageId?: number,
    targetStreamerUsername: string = 'neonstreamer'
  ) {
    try {
      // 1. Locate streamer
      const usersCol = await getUsersCollection();
      let streamer = await usersCol.findOne({
        $or: [
          { telegramChatId: chatId },
          { telegram_chat_id: chatId },
          { username: targetStreamerUsername },
          { id: targetStreamerUsername },
          { userId: targetStreamerUsername }
        ]
      });
      if (!streamer) {
        streamer = await usersCol.findOne({});
      }

      if (!streamer) {
        console.warn('[Telegram Listener] No streamer found in database to dispatch alert.');
        return;
      }

      const streamerId = (streamer as any).userId || (streamer as any).id || String(streamer._id);
      const streamerOverlayToken = streamer.overlayToken || (streamer as any).overlay_token;

      // 2. Fetch streamer's alert settings
      let alertSettings: any = null;
      try {
        const alertSettingsCol = await getAlertSettingsCollection();
        alertSettings = await alertSettingsCol.findOne({
          $or: [
            { streamerId },
            ...(streamer.username ? [{ streamerId: streamer.username }] : [])
          ]
        });
      } catch (e) {}

      let videoSettings: any = null;
      try {
        const videoSettingsCol = await getVideoAlertSettingsCollection();
        videoSettings = await videoSettingsCol.findOne({
          $or: [
            { streamerId },
            ...(streamer.username ? [{ streamerId: streamer.username }] : [])
          ]
        });
      } catch (e) {}

      const tranId = parsed.transactionRef || `TG-${Date.now().toString().slice(-8)}`;

      // 1. Clean expired sessions (>5m) and gather active candidates within 10 minutes
      let matchedTemp: any = null;
      let dbDonation: any = null;
      const donationsCol = await getDonationsCollection();
      try {
        await cleanupExpiredPendingDonationsMongo();

        const seenIds = new Set<string>();
        const candidates: any[] = [];

        // A. MongoDB temporary_donations
        try {
          const tempCol = await getTemporaryDonationsCollection();
          const mongoRecent = await tempCol
            .find({
              $or: [
                { streamerId },
                ...(streamer.username ? [{ streamerId: streamer.username }] : [])
              ],
              createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) }
            })
            .sort({ createdAt: -1 })
            .limit(30)
            .toArray();

          for (const doc of mongoRecent) {
            const docId = doc.id || (doc as any).donationId || String(doc._id);
            if (docId && !seenIds.has(docId)) {
              seenIds.add(docId);
              candidates.push({
                id: docId,
                streamer_id: doc.streamerId,
                donor_name: doc.donorName,
                donor_message: doc.donorMessage,
                amount: doc.amount,
                currency: doc.currency,
                banking_name: doc.bankingName,
                video_url: doc.videoUrl,
                video_title: doc.videoTitle,
                video_start_time: doc.videoStartTime,
                video_end_time: doc.videoEndTime,
                created_at: doc.createdAt
              });
            }
          }
        } catch (e) {}

        // B. MongoDB pending donations
        try {
          const pendingCandidates = await donationsCol
            .find({
              $or: [
                { streamerId },
                { streamer_id: streamerId }
              ],
              status: 'PENDING',
              createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) }
            })
            .sort({ createdAt: -1 })
            .limit(30)
            .toArray();

          for (const c of pendingCandidates) {
            const cId = c.id || String(c._id);
            if (cId && !seenIds.has(cId)) {
              seenIds.add(cId);
              candidates.push({
                id: cId,
                streamer_id: c.streamerId || (c as any).streamer_id,
                donor_name: c.donorName || (c as any).donor_name,
                donor_message: c.donorMessage || (c as any).donor_message,
                amount: c.amount,
                currency: c.currency,
                banking_name: c.bankingName || (c as any).banking_name,
                video_url: c.videoUrl || (c as any).video_url,
                video_title: c.videoTitle || (c as any).video_title,
                video_start_time: c.videoStartTime ?? (c as any).video_start_time,
                video_end_time: c.videoEndTime ?? (c as any).video_end_time,
                created_at: c.createdAt || (c as any).created_at
              });
            }
          }
        } catch (e) {}

        matchedTemp = findMatchingTemporaryDonation(candidates, {
          donorName: parsed.donorName,
          payerName: parsed.payerName || parsed.donorName,
          bankingName: parsed.bankingName,
          rawText: parsed.rawText,
          senderName: parsed.donorName,
          amount: parsed.amount,
          currency: parsed.currency
        });

        if (matchedTemp) {
          console.log(`🎯 [Group Listener Matched] Found active donation session ${matchedTemp.id} in MongoDB (Bank Name: "${matchedTemp.banking_name}", Donor: "${matchedTemp.donor_name}").`);
          try {
            const col = await getTemporaryDonationsCollection();
            await col.deleteMany({
              $or: [{ id: matchedTemp.id }, { donationId: matchedTemp.id }]
            });
          } catch (e) {}

          try {
            dbDonation = await donationsCol.findOne({
              $or: [{ id: matchedTemp.id }, { donationId: matchedTemp.id }]
            });
          } catch (e) {}
        }
      } catch (matchErr) {
        console.warn('[Temporary Listener] Error checking temporary donations in MongoDB:', matchErr);
      }

      // Preserve active session ID so modal receives PAID status
      const activeDonationId = matchedTemp ? matchedTemp.id : uuidv4();

      // Prioritize donor name from username entered on the donation form (fallback to payer bank name)
      const sessionDonorName = (matchedTemp?.donor_name || dbDonation?.donor_name || dbDonation?.donorName || '').trim();
      const payerBankName = (matchedTemp?.banking_name || dbDonation?.banking_name || dbDonation?.bankingName || '').trim();
      const parsedPayer = (parsed.payerName || parsed.donorName || '').trim();

      let effectiveDonorName = '';
      if (sessionDonorName && !isGenericBankKeyword(sessionDonorName)) {
        effectiveDonorName = sessionDonorName;
      } else if (parsedPayer && !isGenericBankKeyword(parsedPayer)) {
        effectiveDonorName = parsedPayer;
      } else if (payerBankName && !isGenericBankKeyword(payerBankName)) {
        effectiveDonorName = payerBankName;
      } else {
        effectiveDonorName = 'Generous Supporter';
      }

      const rawMsg = matchedTemp?.donor_message || dbDonation?.donor_message || dbDonation?.donorMessage || (parsed.donorMessage ? parsed.donorMessage.trim() : '');
      const isMeaningful = Boolean(
        rawMsg &&
        typeof rawMsg === 'string' &&
        rawMsg.trim() &&
        rawMsg.trim().toLowerCase() !== 'none' &&
        rawMsg.trim().toLowerCase() !== '(none)' &&
        rawMsg.trim().toLowerCase() !== 'null' &&
        rawMsg.trim().toLowerCase() !== 'undefined'
      );
      const effectiveDonorMessage = isMeaningful ? rawMsg.trim() : '';
      const effectiveAmount = parsed.amount > 0 ? parsed.amount : (matchedTemp?.amount || dbDonation?.amount || 1.0);
      const effectiveCurrency = parsed.currency || matchedTemp?.currency || dbDonation?.currency || 'USD';
      const effectiveBankingName = matchedTemp?.banking_name || dbDonation?.banking_name || dbDonation?.bankingName || parsed.bankingName || 'Bakong KHQR';
      const effectiveVideoUrl = matchedTemp?.video_url || dbDonation?.video_url || dbDonation?.videoUrl || undefined;
      const effectiveVideoTitle = matchedTemp?.video_title || dbDonation?.video_title || dbDonation?.videoTitle || undefined;
      const effectiveVideoStartTime = Number(matchedTemp?.video_start_time ?? dbDonation?.video_start_time ?? dbDonation?.videoStartTime ?? 0);
      const effectiveVideoEndTime = Number(matchedTemp?.video_end_time ?? dbDonation?.video_end_time ?? dbDonation?.videoEndTime ?? 0);

      // Update or insert into MongoDB donations ledger
      try {
        await donationsCol.updateOne(
          { id: activeDonationId },
          {
            $set: {
              id: activeDonationId,
              streamerId,
              donorName: effectiveDonorName,
              donorMessage: effectiveDonorMessage,
              amount: effectiveAmount,
              currency: effectiveCurrency,
              bankingName: effectiveBankingName,
              paymentMethod: 'TELEGRAM_GROUP_ALERT',
              paywayTranId: tranId,
              videoUrl: effectiveVideoUrl || null,
              videoTitle: effectiveVideoTitle || null,
              videoStartTime: effectiveVideoStartTime,
              videoEndTime: effectiveVideoEndTime,
              status: 'PAID',
              isAlerted: 1,
              paidAt: new Date(),
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );
      } catch (dbErr) {
        console.error('[DB] Error updating/inserting telegram listener donation in MongoDB:', dbErr);
      }

      // Fetch current saved condition alert box from MongoDB for this streamer
      let matchingBox: any = null;
      try {
        const alertBoxesCol = await getAlertBoxesCollection();
        const activeBoxes = await alertBoxesCol
          .find({
            $or: [
              { userId: streamerId },
              { streamerId },
              ...(streamer.username ? [{ userId: streamer.username }, { streamerId: streamer.username }] : []),
              ...(streamer.email ? [{ userId: streamer.email }, { userEmail: streamer.email }] : []),
              ...(streamerOverlayToken ? [{ overlayToken: streamerOverlayToken }, { token: streamerOverlayToken }] : [])
            ],
            isEnabled: true
          })
          .sort({ minAmountCondition: -1 })
          .toArray();

        const effectiveAmountUsd = effectiveCurrency === 'KHR' ? effectiveAmount / 4000 : effectiveAmount;
        const matchingBoxes = activeBoxes.filter(
          (b) => effectiveAmountUsd >= ((Number(b.minAmountCondition) || 0) - 0.0001)
        );
        matchingBox = matchingBoxes.length > 0
          ? matchingBoxes[0]
          : (activeBoxes.length > 0 ? activeBoxes[activeBoxes.length - 1] : null);
      } catch (e) {
        console.warn('[TelegramListener] Could not fetch mongo alert boxes:', e);
      }

      // 3. Construct live alert payload for OBS Studio overlay with current saved alert settings
      const alertPayload = {
        boxId: matchingBox?._id ? String(matchingBox._id) : undefined,
        donationId: activeDonationId,
        id: activeDonationId,
        streamerId,
        donorName: effectiveDonorName,
        donorMessage: effectiveDonorMessage,
        donor_message: effectiveDonorMessage,
        message: effectiveDonorMessage,
        amount: effectiveAmount,
        currency: effectiveCurrency,
        bankingName: effectiveBankingName,
        videoUrl: effectiveVideoUrl,
        videoTitle: effectiveVideoTitle,
        videoStartTime: effectiveVideoStartTime,
        videoEndTime: effectiveVideoEndTime,
        videoAlertEnabled: videoSettings ? (videoSettings.isEnabled === true || videoSettings.is_enabled === 1 || videoSettings.is_enabled === true) : true,
        videoMinTipAmount: videoSettings ? Number(videoSettings.minTipAmount ?? videoSettings.min_tip_amount ?? 0.25) : 0.25,
        videoMaxDurationSeconds: videoSettings ? Number(videoSettings.maxDurationSeconds ?? videoSettings.max_duration_seconds ?? 300) : 300,
        templateStyle: matchingBox?.templateStyle || alertSettings?.template_style || 'neon-box',
        textTemplate: matchingBox?.textTemplate || alertSettings?.text_template || '{donator} donated {amount} through superchat!',
        textColor: matchingBox?.textColor || alertSettings?.text_color || '#FFFFFF',
        donorColor: matchingBox?.donorColor || undefined,
        amountColor: matchingBox?.amountColor || undefined,
        customGifUrl: matchingBox?.mediaUrl || alertSettings?.custom_gif_url,
        mediaUrl: matchingBox?.mediaUrl || alertSettings?.custom_gif_url,
        showImage: matchingBox?.showImage !== undefined ? matchingBox.showImage : (alertSettings?.show_image !== 0),
        fontFamily: matchingBox?.fontFamily || alertSettings?.font_family || 'Chakra Petch',
        fontSize: matchingBox?.fontSize || alertSettings?.font_size || 28,
        layoutMode: matchingBox?.layoutMode || alertSettings?.layout_mode || 'top',
        animationStyle: matchingBox?.animationStyle || alertSettings?.animation_style || 'fade',
        glowColor: matchingBox?.glowColor || alertSettings?.glow_color || '#00F0FF',
        soundUrl: (matchingBox?.soundUrl && !matchingBox.soundUrl.includes('neon-chime'))
          ? matchingBox.soundUrl
          : (alertSettings?.sound_url && !alertSettings.sound_url.includes('neon-chime')
              ? alertSettings.sound_url
              : '/sounds/cash-register-kaching.mp3'),
        soundVolume: matchingBox?.soundVolume ?? alertSettings?.sound_volume ?? 0.85,
        durationSeconds: effectiveVideoEndTime && effectiveVideoStartTime && (effectiveVideoEndTime - effectiveVideoStartTime > 0)
          ? Math.max(matchingBox?.durationSeconds || alertSettings?.duration_seconds || 8, effectiveVideoEndTime - effectiveVideoStartTime + 2)
          : (matchingBox?.durationSeconds || alertSettings?.duration_seconds || 8),
        ttsEnabled: matchingBox?.ttsEnabled !== undefined ? matchingBox.ttsEnabled : ((alertSettings?.tts_enabled ?? 1) === 1),
        ttsType: matchingBox?.ttsType || alertSettings?.tts_type || 'google',
        clonedVoiceSampleUrl: matchingBox?.clonedVoiceSampleUrl || alertSettings?.cloned_voice_sample_url
      };

      // 4. Broadcast to OBS Browser Source Overlay & Streamer Dashboard
      if (streamerOverlayToken) {
        broadcastAlertToOverlay(streamerOverlayToken, alertPayload);
      }
      broadcastDonationToDashboard(streamerId, {
        id: activeDonationId,
        donor_name: effectiveDonorName,
        donor_message: effectiveDonorMessage,
        amount: effectiveAmount,
        currency: effectiveCurrency,
        banking_name: effectiveBankingName,
        payment_method: 'TELEGRAM_GROUP_ALERT',
        status: 'PAID',
        created_at: new Date().toISOString()
      });

      console.log(`🚀 [OBS Overlay Alert Dispatched] Streamer: @${streamer.username} | Amount: ${parsed.currency === 'KHR' ? `${parsed.amount} ៛` : `$${parsed.amount}`} | Donor: ${parsed.donorName}`);

      // 6. Send confirmation reply into the Telegram group if auto-reply is enabled
      if (this.autoReply && this.botToken && chatId) {
        const formattedAmount = parsed.currency === 'KHR'
          ? `${parsed.amount.toLocaleString()} ៛`
          : `$${parsed.amount.toFixed(2)}`;

        const replyText = `
🎉 <b>Live Alert Dispatched on Stream!</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Donor:</b> <code>${parsed.donorName}</code>
💰 <b>Amount:</b> <b>${formattedAmount}</b> (${parsed.bankingName})
${parsed.donorMessage ? `💬 <b>Message:</b> <i>"${parsed.donorMessage}"</i>\n` : ''}📺 <b>Streamer:</b> @${streamer.username}
━━━━━━━━━━━━━━━━━━━━
<i>Alert is now animating on OBS overlay with audio chime! 💥</i>
        `.trim();

        try {
          await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            chat_id: chatId,
            text: replyText,
            parse_mode: 'HTML',
            reply_to_message_id: messageId
          });
        } catch (e) {
          // ignore reply errors
        }
      }
    } catch (err: any) {
      console.error('[Telegram Listener] Error dispatching alert:', err);
    }
  }

  /**
   * Simulate parsing and alert dispatch without needing live Telegram connection
   */
  public async simulateTestPhrase(phraseText: string, senderName: string = 'TestUser', streamerUsername: string = 'neonstreamer') {
    const parsed = PhraseCatcher.parse(phraseText, senderName);
    if (parsed.matched) {
      await this.dispatchDonationAlert(parsed, 'SIMULATED_GROUP_CHAT', 'Simulated Streamer Group', undefined, streamerUsername);
    }

    this.recentLogs.unshift({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      chatId: 'SIMULATED_GROUP',
      chatTitle: 'Test Group Simulator',
      rawText: phraseText,
      parsed,
      triggered: parsed.matched,
      streamerUsername
    });

    return parsed;
  }
}

export const telegramGroupListener = TelegramGroupListener.getInstance();
