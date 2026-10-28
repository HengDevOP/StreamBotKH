import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import { NewMessage } from 'telegram/events';
import { v4 as uuidv4 } from 'uuid';
import { db, cleanupExpiredPendingDonations } from '../../../src/server/database/db';
import { broadcastAlertToOverlay, broadcastDonationToDashboard } from '../../../src/server/services/socketService';
import { PhraseCatcher } from './phraseCatcher';
import { findMatchingTemporaryDonation, matchBankNames, isGenericBankKeyword } from '../../../src/server/utils/nameMatching';
import { getTemporaryDonationsCollection, getAlertBoxesCollection } from '../../../src/server/database/mongo';

export interface PendingAuth {
  client?: TelegramClient;
  phoneNumber: string;
  phoneCodeHash: string;
  apiId: number;
  apiHash: string;
  isSimulation?: boolean;
  simulationCode?: string;
  createdAt: number;
}

interface TelegramGlobalState {
  pendingAuth: Map<string, PendingAuth>;
  activeClients: Map<string, TelegramClient>;
  monitoredChats: Map<string, string[]>;
  managerInstance?: TelegramUserClientManager;
}

// Preserve state across Next.js webpack HMR & separate route bundle evaluations
const g = globalThis as unknown as {
  __telegramGlobalState?: TelegramGlobalState;
};

if (!g.__telegramGlobalState) {
  g.__telegramGlobalState = {
    pendingAuth: new Map(),
    activeClients: new Map(),
    monitoredChats: new Map(),
  };
}

class TelegramUserClientManager {
  private get pendingAuth(): Map<string, PendingAuth> {
    return g.__telegramGlobalState!.pendingAuth;
  }

  private get activeClients(): Map<string, TelegramClient> {
    return g.__telegramGlobalState!.activeClients;
  }

  private get monitoredChats(): Map<string, string[]> {
    return g.__telegramGlobalState!.monitoredChats;
  }

  constructor() {
    // Attempt auto-restore on boot
    setTimeout(() => {
      this.restoreAllSavedSessions();
    }, 2000);
  }

  /**
   * Request Telegram verification code via TelegramJS (GramJS)
   */
  public async sendVerificationCode(params: {
    streamerId: string;
    phoneNumber: string;
    apiId?: number;
    apiHash?: string;
  }): Promise<{
    success: boolean;
    phoneCodeHash: string;
    isCodeViaApp?: boolean;
    phoneNumber: string;
    isSimulation?: boolean;
    simulationCode?: string;
    message: string;
  }> {
    const { streamerId } = params;

    // Clean & format Cambodia/International phone number (e.g. +855...)
    let cleanPhone = params.phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('855')) {
        cleanPhone = '+' + cleanPhone;
      } else if (cleanPhone.startsWith('0')) {
        cleanPhone = '+855' + cleanPhone.slice(1);
      } else {
        cleanPhone = '+855' + cleanPhone;
      }
    }

    const apiId = params.apiId || (process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 32427800);
    const apiHash = params.apiHash || process.env.TELEGRAM_API_HASH || '8f8e70605256a4e08a81bd5e45481ceb';

    try {
      console.log(`⚡ [TelegramJS] Connecting to REAL Telegram MTProto for ${cleanPhone} (API ID: ${apiId})...`);

      const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
        connectionRetries: 5,
      });

      await client.connect();

      console.log(`⚡ [TelegramJS] Connected to Telegram DC: ${client.session.dcId}. Requesting official verification code...`);

      const sendResult = await client.sendCode(
        { apiId, apiHash },
        cleanPhone
      );

      // Save current session string (including DC migration and initial keys)
      const pendingSession = client.session.save() as unknown as string;

      const record: PendingAuth = {
        client,
        phoneNumber: cleanPhone,
        phoneCodeHash: sendResult.phoneCodeHash,
        apiId,
        apiHash,
        isSimulation: false,
        createdAt: Date.now()
      };

      // Store in memory by multiple keys (streamerId, phoneCodeHash, cleanPhone)
      this.pendingAuth.set(streamerId, record);
      this.pendingAuth.set(sendResult.phoneCodeHash, record);
      this.pendingAuth.set(cleanPhone, record);

      // Persist pending auth state to SQLite for rock-solid recovery across reloads
      try {
        db.prepare(`
          UPDATE streamers 
          SET telegram_pending_phone = ?,
              telegram_pending_hash = ?,
              telegram_pending_session = ?,
              telegram_api_id = ?,
              telegram_api_hash = ?
          WHERE id = ?
        `).run(cleanPhone, sendResult.phoneCodeHash, pendingSession, apiId, apiHash, streamerId);
        console.log(`💾 [TelegramJS] Pending verification saved to SQLite for ${cleanPhone} (Hash: ${sendResult.phoneCodeHash.slice(0, 8)}...)`);
      } catch (dbErr) {
        console.error('[DB] Failed saving pending auth in SQLite:', dbErr);
      }

      console.log(`⚡ [TelegramJS] Official verification code delivered by Telegram to ${cleanPhone}!`);

      return {
        success: true,
        phoneCodeHash: sendResult.phoneCodeHash,
        isCodeViaApp: sendResult.isCodeViaApp,
        phoneNumber: cleanPhone,
        isSimulation: false,
        message: `Real Telegram verification code has been sent directly to your Telegram app (${cleanPhone})!`
      };
    } catch (err: any) {
      console.error('❌ [TelegramJS] sendCode error:', err);
      throw new Error(err.message || 'Failed to send Telegram verification code. Please check that your phone number is correct.');
    }
  }

  /**
   * Verify 5-digit Telegram code and sign in
   */
  public async verifyCode(params: {
    streamerId: string;
    phoneCode: string;
    phoneCodeHash?: string;
    phoneNumber?: string;
    password?: string;
  }): Promise<{
    success: boolean;
    needPassword?: boolean;
    user?: any;
    message: string;
  }> {
    const { streamerId, phoneCode, phoneCodeHash, phoneNumber, password } = params;

    // 1. Locate pending auth from memory by streamerId, hash, or phoneNumber
    let pending = this.pendingAuth.get(streamerId);
    if (!pending && phoneCodeHash) {
      pending = this.pendingAuth.get(phoneCodeHash);
    }
    if (!pending && phoneNumber) {
      const clean = phoneNumber.replace(/[\s\-\(\)]/g, '');
      pending = this.pendingAuth.get(clean) || this.pendingAuth.get('+' + clean.replace(/^\+/, ''));
    }
    if (!pending && this.pendingAuth.size > 0) {
      pending = this.pendingAuth.values().next().value;
    }

    // 2. Fallback: Restore from SQLite if memory was purged or compiled separately
    if (!pending) {
      console.log(`🔍 [TelegramJS] Checking SQLite for pending login: streamerId=${streamerId}, hash=${phoneCodeHash}...`);
      try {
        let row: any = db.prepare(`
          SELECT telegram_pending_phone, telegram_pending_hash, telegram_pending_session, telegram_api_id, telegram_api_hash
          FROM streamers
          WHERE id = ? AND telegram_pending_hash IS NOT NULL
        `).get(streamerId);

        if (!row && phoneCodeHash) {
          row = db.prepare(`
            SELECT telegram_pending_phone, telegram_pending_hash, telegram_pending_session, telegram_api_id, telegram_api_hash
            FROM streamers
            WHERE telegram_pending_hash = ?
          `).get(phoneCodeHash);
        }

        if (row && row.telegram_pending_session && row.telegram_pending_hash) {
          console.log(`⚡ [TelegramJS] Restoring pending client session from SQLite for ${row.telegram_pending_phone}...`);
          const apiId = row.telegram_api_id || (process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 32427800);
          const apiHash = row.telegram_api_hash || process.env.TELEGRAM_API_HASH || '8f8e70605256a4e08a81bd5e45481ceb';

          const restoredClient = new TelegramClient(new StringSession(row.telegram_pending_session), apiId, apiHash, {
            connectionRetries: 5,
          });
          await restoredClient.connect();

          pending = {
            client: restoredClient,
            phoneNumber: row.telegram_pending_phone,
            phoneCodeHash: row.telegram_pending_hash,
            apiId,
            apiHash,
            isSimulation: false,
            createdAt: Date.now()
          };

          this.pendingAuth.set(streamerId, pending);
          this.pendingAuth.set(row.telegram_pending_hash, pending);
        }
      } catch (dbErr) {
        console.error('[DB] Error restoring pending session from SQLite:', dbErr);
      }
    }

    if (!pending) {
      throw new Error('No pending login found. Please enter your phone number and request a code first.');
    }

    // Check expiration (10 minutes)
    if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
      this.pendingAuth.delete(streamerId);
      if (pending.phoneCodeHash) this.pendingAuth.delete(pending.phoneCodeHash);
      throw new Error('Verification code has expired. Please request a new one.');
    }

    // Handle Simulation Mode if enabled
    if (pending.isSimulation) {
      if (phoneCode.trim() !== pending.simulationCode && phoneCode.trim() !== '12345') {
        throw new Error(`Invalid verification code. Please enter: ${pending.simulationCode}`);
      }

      const userDisplay = `Telegram User (${pending.phoneNumber})`;
      const fakeSession = 'sim_session_' + Buffer.from(pending.phoneNumber).toString('base64');

      try {
        db.prepare(`
          UPDATE streamers 
          SET telegram_phone = ?, telegram_user_name = ?, telegram_session = ?,
              telegram_pending_phone = NULL, telegram_pending_hash = NULL, telegram_pending_session = NULL
          WHERE id = ?
        `).run(pending.phoneNumber, userDisplay, fakeSession, streamerId);
      } catch (e) {
        console.error('[DB] Failed updating telegram user in db:', e);
      }

      this.pendingAuth.delete(streamerId);
      this.monitoredChats.set(streamerId, ['Streamer Group Chat (Simulated)', 'ABA & Bakong Alerts']);

      return {
        success: true,
        user: {
          phone: pending.phoneNumber,
          username: 'cambodia_streamer',
          firstName: 'Live Streamer'
        },
        message: `Successfully connected Telegram account (${pending.phoneNumber})!`
      };
    }

    // Handle Real Telegram Client with MTProto
    let client = pending.client;
    if (!client) {
      throw new Error('Telegram client session was lost. Please request a new verification code.');
    }

    // Ensure client is connected before invoking
    if (!client.connected) {
      console.log('⚡ [TelegramJS] Reconnecting pending client...');
      await client.connect();
    }

    try {
      let user: any;

      try {
        console.log(`⚡ [TelegramJS] Invoking Api.auth.SignIn for ${pending.phoneNumber}...`);
        const result = await client.invoke(
          new Api.auth.SignIn({
            phoneNumber: pending.phoneNumber,
            phoneCodeHash: pending.phoneCodeHash,
            phoneCode: phoneCode.trim(),
          })
        );

        if (result instanceof Api.auth.AuthorizationSignUpRequired) {
          throw new Error('New account sign up required. Please log into Telegram on your phone first.');
        }

        user = (result as any).user;
      } catch (err: any) {
        if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          if (!password) {
            return {
              success: false,
              needPassword: true,
              message: '2-Step Verification Password required for this Telegram account.'
            };
          }

          // Sign in with 2FA Password
          user = await client.signInWithPassword(
            { apiId: pending.apiId, apiHash: pending.apiHash },
            {
              password: async () => password,
              onError: (err: Error) => { throw err; }
            }
          );
        } else {
          throw err;
        }
      }

      const sessionString = client.session.save() as unknown as string;
      const displayName = user?.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : pending.phoneNumber;

      // Save authenticated session to SQLite & clear pending auth state
      db.prepare(`
        UPDATE streamers 
        SET telegram_phone = ?,
            telegram_user_name = ?,
            telegram_session = ?,
            telegram_api_id = ?,
            telegram_api_hash = ?,
            telegram_pending_phone = NULL,
            telegram_pending_hash = NULL,
            telegram_pending_session = NULL
        WHERE id = ?
      `).run(pending.phoneNumber, displayName, sessionString, pending.apiId, pending.apiHash, streamerId);

      // Attach PhraseCatcher message listener for live donations
      this.attachMessageListener(streamerId, client);

      this.activeClients.set(streamerId, client);
      this.pendingAuth.delete(streamerId);
      if (pending.phoneCodeHash) this.pendingAuth.delete(pending.phoneCodeHash);
      if (pending.phoneNumber) this.pendingAuth.delete(pending.phoneNumber);

      // Fetch dialogs to populate monitored groups
      this.refreshMonitoredChats(streamerId, client);

      console.log(`✅ [TelegramJS] Successfully authenticated and connected as ${displayName} (${pending.phoneNumber})!`);

      return {
        success: true,
        user: {
          phone: pending.phoneNumber,
          username: user?.username,
          firstName: user?.firstName || displayName
        },
        message: `Connected successfully as ${displayName} (${pending.phoneNumber})!`
      };
    } catch (err: any) {
      console.error('❌ [TelegramJS] verifyCode error:', err);
      throw new Error(err.message || 'Invalid verification code. Please check the code and try again.');
    }
  }

  /**
   * Attach listener to catch bank transfer phrases strictly in monitored target groups
   */
  private attachMessageListener(streamerId: string, client: TelegramClient) {
    client.addEventHandler(async (event: any) => {
      const msg = event.message;
      if (!msg) return;

      const text = msg.message || msg.text || '';
      if (!text.trim()) return;

      // STRICT TARGET GROUP ENFORCEMENT: GramJS will ONLY listen from configured target groups!
      let targetGroups: Array<{ id: string; streamer_id: string; chat_id: string; title: string; username?: string }> = [];
      try {
        targetGroups = db.prepare('SELECT * FROM telegram_monitored_groups WHERE streamer_id = ?').all(streamerId) as any[];
      } catch (e) {}

      // If no target groups configured, ignore incoming message
      if (!targetGroups || targetGroups.length === 0) {
        return;
      }

      const rawChatId = msg.chatId ? msg.chatId.toString() : '';
      const cleanRawChatId = rawChatId.replace(/^-100/, '').replace(/^-/, '');

      let chatTitle = '';
      let chatUsername = '';
      try {
        const chat: any = await msg.getChat();
        if (chat) {
          chatTitle = (chat.title || chat.name || '').trim().toLowerCase();
          chatUsername = (chat.username || '').replace(/^@/, '').trim().toLowerCase();
        }
      } catch (e) {
        // Safe fallback
      }

      const isTarget = targetGroups.some((tg) => {
        // 1. Match Chat ID (exact string or stripped numeric id)
        if (tg.chat_id) {
          const cleanTgId = tg.chat_id.replace(/^-100/, '').replace(/^-/, '');
          if (tg.chat_id === rawChatId || (cleanTgId && cleanTgId === cleanRawChatId)) {
            return true;
          }
        }
        // 2. Match Telegram Username
        if (tg.username && chatUsername) {
          const cleanTgUser = tg.username.replace(/^@/, '').trim().toLowerCase();
          if (cleanTgUser && cleanTgUser === chatUsername) {
            return true;
          }
        }
        // 3. Match Group Title
        if (tg.title && chatTitle) {
          if (tg.title.trim().toLowerCase() === chatTitle) {
            return true;
          }
        }
        return false;
      });

      if (!isTarget) {
        // Strictly ignore messages outside target groups
        return;
      }

      let senderName = 'Telegram Member';
      try {
        const sender = await msg.getSender();
        if (sender) {
          const s = sender as any;
          // Combine first name and surname so full donor identity is preserved
          const full = [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
          senderName = full || s.title || s.username || 'Telegram Member';
        }
      } catch (e) {
        // Safe fallback
      }

      // Check if message matches any Cambodian banking or donation phrase
      const parsed = PhraseCatcher.parse(text, senderName);

      if (parsed.matched) {
        console.log(`\n⚡ [TelegramJS Client] Donation detected from target group "${chatTitle || rawChatId}"!`);
        console.log(`   Payer: ${parsed.payerName || parsed.donorName}`);
        console.log(`   Amount: ${parsed.currency === 'KHR' ? `${parsed.amount.toLocaleString()} ៛` : `$${parsed.amount.toFixed(2)}`}`);
        console.log(`   Bank: ${parsed.bankingName}`);
        console.log(`   Message: ${parsed.donorMessage || 'None'}`);
        console.log(`   Raw Text: ${text.replace(/\r?\n+/g, ' ')}`);

        // Resolve target streamer:
        let targetStreamer: any = null;
        if (parsed.recipient) {
          const matchedByRecipient = db.prepare('SELECT * FROM streamers WHERE username = ? COLLATE NOCASE OR display_name = ? COLLATE NOCASE').get(parsed.recipient, parsed.recipient) as any;
          if (matchedByRecipient) {
            targetStreamer = matchedByRecipient;
            console.log(`🎯 [TelegramJS] Routed payment to streamer @${targetStreamer.username} via recipient "${parsed.recipient}"`);
          }
        }
        if (!targetStreamer) {
          const usernameMatch = text.match(/@([a-zA-Z0-9_]+)/);
          if (usernameMatch && usernameMatch[1]) {
            const matched = db.prepare('SELECT * FROM streamers WHERE username = ? COLLATE NOCASE').get(usernameMatch[1]) as any;
            if (matched) {
              targetStreamer = matched;
              console.log(`🎯 [TelegramJS] Routed payment to streamer @${targetStreamer.username}`);
            }
          }
        }
        if (!targetStreamer) {
          targetStreamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(streamerId) as any;
        }
        if (!targetStreamer) {
          targetStreamer = db.prepare('SELECT * FROM streamers LIMIT 1').get() as any;
        }

        if (targetStreamer) {
          const alertSettings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(targetStreamer.id) as any;

          // 1. Clean expired sessions (>5m) and gather active candidates within 5 minutes
          let matchedTemp: any = null;
          let dbDonation: any = null;
          try {
            cleanupExpiredPendingDonations();

            // Collect active candidates within 10 minutes window (MongoDB temporary queue + pending donations)
            const seenIds = new Set<string>();
            const candidates: any[] = [];

            // A. MongoDB temporary_donations collection
            try {
              const tempCol = await getTemporaryDonationsCollection();
              const mongoRecent = await tempCol
                .find({
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

            // B. SQLite pending donations (for original video & alert metadata)
            try {
              const pendingCandidates = db.prepare(`
                SELECT * FROM donations
                WHERE status = 'PENDING'
                  AND created_at > datetime('now', '-10 minutes')
                ORDER BY created_at DESC
                LIMIT 30
              `).all() as any[];
              for (const c of pendingCandidates) {
                if (c && c.id && !seenIds.has(c.id)) {
                  seenIds.add(c.id);
                  candidates.push(c);
                }
              }
            } catch (e) {}

            matchedTemp = findMatchingTemporaryDonation(candidates, {
              donorName: parsed.donorName,
              payerName: parsed.payerName || parsed.donorName,
              bankingName: parsed.bankingName,
              rawText: text,
              senderName,
              amount: parsed.amount
            });

            if (matchedTemp) {
              console.log(`🎯 [GramJS Listener Matched] Found active donation session ${matchedTemp.id} in MongoDB (Bank Name: "${matchedTemp.banking_name}", Donor: "${matchedTemp.donor_name}").`);
              try {
                const col = await getTemporaryDonationsCollection();
                await col.deleteMany({
                  $or: [{ id: matchedTemp.id }, { donationId: matchedTemp.id }]
                });
              } catch (e) {}

              // Also load full pending record from donations table to preserve all original video & donor data
              try {
                dbDonation = db.prepare('SELECT * FROM donations WHERE id = ?').get(matchedTemp.id);
              } catch (e) {}
            }
          } catch (matchErr) {
            console.warn('[Temporary Listener] Error checking temporary donations in MongoDB:', matchErr);
          }

          // Preserve the original active session ID so the modal poller receives PAID status
          const activeDonationId = matchedTemp ? matchedTemp.id : uuidv4();

          // Ensure donor matches the full Payer Name (Bank Account) with both first name & surname (e.g. "HO CHENHENG")
          const payerBankName = (matchedTemp?.banking_name || dbDonation?.banking_name || '').trim();
          const parsedPayer = (parsed.payerName || parsed.donorName || '').trim();

          let effectiveDonorName = '';
          if (payerBankName && !isGenericBankKeyword(payerBankName)) {
            effectiveDonorName = payerBankName;
          } else if (parsedPayer && !isGenericBankKeyword(parsedPayer)) {
            effectiveDonorName = parsedPayer;
          } else {
            effectiveDonorName = matchedTemp?.donor_name || dbDonation?.donor_name || parsed.donorName || 'Generous Supporter';
          }

          const effectiveDonorMessage = matchedTemp?.donor_message || dbDonation?.donor_message || (parsed.donorMessage ? parsed.donorMessage.trim() : '');
          const effectiveAmount = parsed.amount > 0 ? parsed.amount : (matchedTemp?.amount || dbDonation?.amount || 1.0);
          const effectiveCurrency = parsed.currency || matchedTemp?.currency || dbDonation?.currency || 'USD';
          const effectiveBankingName = matchedTemp?.banking_name || dbDonation?.banking_name || parsed.bankingName || 'Bakong KHQR';
          const effectiveVideoUrl = matchedTemp?.video_url || dbDonation?.video_url || undefined;
          const effectiveVideoTitle = matchedTemp?.video_title || dbDonation?.video_title || undefined;
          const effectiveVideoStartTime = Number(matchedTemp?.video_start_time ?? dbDonation?.video_start_time ?? 0);
          const effectiveVideoEndTime = Number(matchedTemp?.video_end_time ?? dbDonation?.video_end_time ?? 0);

          try {
            if (matchedTemp) {
              // Update the active pending donation to PAID
              const updateResult = db.prepare(`
                UPDATE donations SET
                  donor_name = ?,
                  donor_message = ?,
                  amount = ?,
                  currency = ?,
                  banking_name = ?,
                  payment_method = ?,
                  video_url = ?,
                  video_title = ?,
                  video_start_time = ?,
                  video_end_time = ?,
                  status = 'PAID',
                  is_alerted = 1,
                  paid_at = datetime('now')
                WHERE id = ?
              `).run(
                effectiveDonorName,
                effectiveDonorMessage,
                effectiveAmount,
                effectiveCurrency,
                effectiveBankingName,
                parsed.bankingName.toLowerCase().includes('aba') ? 'ABA_PAYWAY' : 'BAKONG_KHQR',
                effectiveVideoUrl || null,
                effectiveVideoTitle || null,
                effectiveVideoStartTime,
                effectiveVideoEndTime,
                activeDonationId
              );

              if (updateResult.changes === 0) {
                // If not found in donations table, insert directly
                db.prepare(`
                  INSERT INTO donations (
                    id, streamer_id, donor_name, donor_message, amount, currency,
                    banking_name, payment_method, video_url, video_title,
                    video_start_time, video_end_time, status, is_alerted, paid_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', 1, datetime('now'))
                `).run(
                  activeDonationId,
                  targetStreamer.id,
                  effectiveDonorName,
                  effectiveDonorMessage,
                  effectiveAmount,
                  effectiveCurrency,
                  effectiveBankingName,
                  parsed.bankingName.toLowerCase().includes('aba') ? 'ABA_PAYWAY' : 'BAKONG_KHQR',
                  effectiveVideoUrl || null,
                  effectiveVideoTitle || null,
                  effectiveVideoStartTime,
                  effectiveVideoEndTime
                );
              }
            } else {
              db.prepare(`
                INSERT INTO donations (
                  id, streamer_id, donor_name, donor_message, amount, currency,
                  banking_name, payment_method, video_url, video_title,
                  video_start_time, video_end_time, status, is_alerted, paid_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', 1, datetime('now'))
              `).run(
                activeDonationId,
                targetStreamer.id,
                effectiveDonorName,
                effectiveDonorMessage,
                effectiveAmount,
                effectiveCurrency,
                effectiveBankingName,
                parsed.bankingName.toLowerCase().includes('aba') ? 'ABA_PAYWAY' : 'BAKONG_KHQR',
                effectiveVideoUrl || null,
                effectiveVideoTitle || null,
                effectiveVideoStartTime,
                effectiveVideoEndTime
              );
            }
          } catch (dbErr) {
            console.error('[DB] Error updating/inserting telegram donation:', dbErr);
          }

          // Fetch current saved condition alert box from MongoDB for this streamer & amount
          let matchingBox: any = null;
          try {
            const alertBoxesCol = await getAlertBoxesCollection();
            const activeBoxes = await alertBoxesCol
              .find({ isEnabled: true })
              .sort({ minAmountCondition: -1 })
              .toArray();

            matchingBox = activeBoxes.find((b) => effectiveAmount >= (Number(b.minAmountCondition) || 0)) || activeBoxes[0];
          } catch (e) {
            console.warn('[TelegramJS] Could not fetch mongo alert boxes, using sqlite fallback:', e);
          }

          // Broadcast alert to OBS Studio overlay in real-time with current saved settings
          broadcastAlertToOverlay(targetStreamer.overlay_token, {
            donationId: activeDonationId,
            donorName: effectiveDonorName,
            donorMessage: effectiveDonorMessage,
            amount: effectiveAmount,
            currency: effectiveCurrency,
            bankingName: effectiveBankingName,
            videoUrl: effectiveVideoUrl,
            videoTitle: effectiveVideoTitle,
            videoStartTime: effectiveVideoStartTime,
            videoEndTime: effectiveVideoEndTime,
            templateStyle: matchingBox?.templateStyle || alertSettings?.template_style || 'neon-box',
            textTemplate: matchingBox?.textTemplate || alertSettings?.text_template || '{donator} donated {amount} through superchat!',
            textColor: matchingBox?.textColor || alertSettings?.text_color || '#FFFFFF',
            customGifUrl: matchingBox?.mediaUrl || alertSettings?.custom_gif_url,
            mediaUrl: matchingBox?.mediaUrl || alertSettings?.custom_gif_url,
            showImage: matchingBox?.showImage !== undefined ? matchingBox.showImage : (alertSettings?.show_image !== 0),
            fontFamily: matchingBox?.fontFamily || alertSettings?.font_family || 'Chakra Petch',
            fontSize: matchingBox?.fontSize || alertSettings?.font_size || 28,
            layoutMode: matchingBox?.layoutMode || alertSettings?.layout_mode || 'top',
            animationStyle: matchingBox?.animationStyle || alertSettings?.animation_style || 'fade',
            glowColor: matchingBox?.glowColor || alertSettings?.glow_color || '#00F0FF',
            soundUrl: matchingBox?.soundUrl || alertSettings?.sound_url || '/sounds/neon-chime.mp3',
            soundVolume: matchingBox?.soundVolume ?? alertSettings?.sound_volume ?? 0.85,
            durationSeconds: effectiveVideoEndTime && effectiveVideoStartTime && (effectiveVideoEndTime - effectiveVideoStartTime > 0)
              ? Math.max(matchingBox?.durationSeconds || alertSettings?.duration_seconds || 8, effectiveVideoEndTime - effectiveVideoStartTime + 2)
              : (matchingBox?.durationSeconds || alertSettings?.duration_seconds || 8),
            ttsEnabled: matchingBox?.ttsEnabled !== undefined ? matchingBox.ttsEnabled : ((alertSettings?.tts_enabled ?? 1) === 1),
            ttsType: matchingBox?.ttsType || alertSettings?.tts_type || 'google',
            clonedVoiceSampleUrl: matchingBox?.clonedVoiceSampleUrl || alertSettings?.cloned_voice_sample_url
          });

          // Broadcast to Streamer Dashboard (Updates revenue live)
          broadcastDonationToDashboard(targetStreamer.id, {
            id: activeDonationId,
            donor_name: effectiveDonorName,
            donor_message: effectiveDonorMessage,
            amount: effectiveAmount,
            currency: effectiveCurrency,
            banking_name: effectiveBankingName,
            payment_method: parsed.bankingName,
            status: 'PAID'
          });
        }
      }
    }, new NewMessage({}));
  }

  /**
   * Refresh list of target groups for the streamer
   */
  private async refreshMonitoredChats(streamerId: string, client: TelegramClient) {
    try {
      const saved = db.prepare('SELECT title, chat_id FROM telegram_monitored_groups WHERE streamer_id = ?').all(streamerId) as any[];
      if (saved && saved.length > 0) {
        this.monitoredChats.set(streamerId, saved.map(s => `${s.title} (${s.chat_id})`));
      } else {
        this.monitoredChats.set(streamerId, []);
      }
    } catch (e) {
      // Ignored
    }
  }

  /**
   * Fetch Telegram chats/groups the connected account is a member of
   */
  public async getAvailableDialogs(streamerId: string): Promise<Array<{
    id: string;
    title: string;
    username?: string;
    isGroup: boolean;
    isChannel: boolean;
  }>> {
    const client = this.activeClients.get(streamerId);
    if (!client) {
      return [];
    }
    try {
      const dialogs = await client.getDialogs({ limit: 40 });
      return dialogs
        .filter((d) => d.isGroup || d.isChannel)
        .map((d) => {
          const entity = d.entity as any;
          return {
            id: d.id ? d.id.toString() : '',
            title: d.title || d.name || 'Untitled Group',
            username: entity?.username || undefined,
            isGroup: Boolean(d.isGroup),
            isChannel: Boolean(d.isChannel)
          };
        })
        .filter((d) => Boolean(d.id));
    } catch (err) {
      console.warn('[TelegramJS] getAvailableDialogs error:', err);
      return [];
    }
  }

  /**
   * Resolve a Telegram group by link (e.g. https://t.me/group or @group or chat ID)
   */
  public async resolveGroupEntity(streamerId: string, query: string): Promise<{
    id: string;
    title?: string;
    username?: string;
  } | null> {
    const client = this.activeClients.get(streamerId);
    if (!client) return null;
    try {
      let clean = query.trim()
        .replace(/^https?:\/\/t\.me\//i, '')
        .replace(/^t\.me\//i, '')
        .replace(/^\+/, '');

      if (!clean) return null;

      const entity = await client.getEntity(clean) as any;
      if (entity) {
        const rawId = entity.id ? entity.id.toString() : '';
        let formattedId = rawId;
        if (formattedId && !formattedId.startsWith('-')) {
          formattedId = `-100${formattedId}`;
        }
        const title = entity.title || entity.firstName || entity.username || clean;
        const username = entity.username ? `@${entity.username.replace(/^@/, '')}` : undefined;
        return {
          id: formattedId || clean,
          title,
          username
        };
      }
    } catch (err) {
      // Entity not found via client cache or requires join
    }
    return null;
  }

  /**
   * Get live connection status
   */
  public getStatus(streamerId: string): {
    isConnected: boolean;
    phoneNumber?: string;
    userName?: string;
    monitoredChats: string[];
    isSimulation?: boolean;
    hasPendingCode?: boolean;
    pendingPhone?: string;
    pendingHash?: string;
  } {
    const streamer = db.prepare('SELECT telegram_phone, telegram_user_name, telegram_session, telegram_pending_phone, telegram_pending_hash FROM streamers WHERE id = ?').get(streamerId) as any;

    const hasActiveClient = this.activeClients.has(streamerId);
    const hasSession = Boolean(streamer?.telegram_session);

    let chats: string[] = [];
    try {
      const saved = db.prepare('SELECT title, chat_id FROM telegram_monitored_groups WHERE streamer_id = ?').all(streamerId) as any[];
      if (saved && saved.length > 0) {
        chats = saved.map(g => `${g.title} (${g.chat_id})`);
      }
    } catch (e) {}

    const pending = this.pendingAuth.get(streamerId);
    const hasPending = Boolean(pending || streamer?.telegram_pending_hash);
    const pendingPhone = pending?.phoneNumber || streamer?.telegram_pending_phone || undefined;
    const pendingHash = pending?.phoneCodeHash || streamer?.telegram_pending_hash || undefined;

    return {
      isConnected: hasActiveClient || hasSession,
      phoneNumber: streamer?.telegram_phone || undefined,
      userName: streamer?.telegram_user_name || undefined,
      monitoredChats: chats,
      isSimulation: streamer?.telegram_session?.startsWith('sim_session'),
      hasPendingCode: hasPending && !hasActiveClient && !hasSession,
      pendingPhone,
      pendingHash
    };
  }

  /**
   * Disconnect Telegram account
   */
  public async disconnect(streamerId: string): Promise<{ success: boolean; message: string }> {
    const client = this.activeClients.get(streamerId);
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {}
      this.activeClients.delete(streamerId);
    }

    this.pendingAuth.delete(streamerId);
    this.monitoredChats.delete(streamerId);

    try {
      db.prepare(`
        UPDATE streamers 
        SET telegram_phone = NULL,
            telegram_user_name = NULL,
            telegram_session = NULL,
            telegram_pending_phone = NULL,
            telegram_pending_hash = NULL,
            telegram_pending_session = NULL
        WHERE id = ?
      `).run(streamerId);
    } catch (e) {}

    return {
      success: true,
      message: 'Telegram account disconnected.'
    };
  }

  /**
   * Restore all saved sessions on startup
   */
  private async restoreAllSavedSessions() {
    try {
      const rows = db.prepare('SELECT id, telegram_phone, telegram_session, telegram_api_id, telegram_api_hash FROM streamers WHERE telegram_session IS NOT NULL').all() as any[];

      for (const row of rows) {
        if (!row.telegram_session || row.telegram_session.startsWith('sim_session')) {
          continue;
        }

        const apiId = row.telegram_api_id || (process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 32427800);
        const apiHash = row.telegram_api_hash || process.env.TELEGRAM_API_HASH || '8f8e70605256a4e08a81bd5e45481ceb';

        if (!apiId || !apiHash) continue;

        try {
          console.log(`⚡ [TelegramJS] Restoring saved session for ${row.telegram_phone}...`);
          const client = new TelegramClient(new StringSession(row.telegram_session), apiId, apiHash, {
            connectionRetries: 5
          });

          await client.connect();

          if (await client.isUserAuthorized()) {
            this.attachMessageListener(row.id, client);
            this.activeClients.set(row.id, client);
            this.refreshMonitoredChats(row.id, client);
            console.log(`⚡ [TelegramJS] Session restored successfully for ${row.telegram_phone}!`);
          }
        } catch (err) {
          console.error(`❌ [TelegramJS] Failed restoring session for ${row.telegram_phone}:`, err);
        }
      }
    } catch (e) {
      // Safe fallback
    }
  }
}

// Singleton instance preserved across Next.js webpack route reloads
if (!g.__telegramGlobalState.managerInstance) {
  g.__telegramGlobalState.managerInstance = new TelegramUserClientManager();
}

export const telegramUserManager = g.__telegramGlobalState.managerInstance;
