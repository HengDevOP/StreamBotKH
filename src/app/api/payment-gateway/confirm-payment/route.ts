import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/server/database/db';
import { broadcastAlertToOverlay, broadcastDonationToDashboard, getIO } from '@/server/services/socketService';
import { findMatchingTemporaryDonation, isGenericBankKeyword } from '@/server/utils/nameMatching';
import { getTemporaryDonationsCollection, getAlertBoxesCollection } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      streamerUsername,
      streamerId,
      donorName = 'Generous Supporter',
      donorMessage = '',
      amount = 5.0,
      currency = 'USD',
      bankingName = 'ABA Bank'
    } = body;

    // 1. Resolve streamer
    let streamer: any = null;
    if (streamerUsername) {
      const clean = streamerUsername.replace(/^@/, '').trim();
      streamer = db.prepare('SELECT * FROM streamers WHERE username = ? COLLATE NOCASE').get(clean);
    }
    if (!streamer && streamerId) {
      streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(streamerId);
    }
    if (!streamer) {
      // Default fallback
      streamer = db.prepare('SELECT * FROM streamers WHERE username = ?').get('neonstreamer');
    }

    if (!streamer) {
      return NextResponse.json(
        { error: 'Streamer channel not found' },
        { status: 404 }
      );
    }

    const numericAmount = Math.max(0.01, parseFloat(String(amount)) || 1.0);

    // 1. Check MongoDB temporary_donations listener queue for matching bank name (First/Last name, any case)
    let matchedTemp: any = null;
    try {
      const candidates: any[] = [];
      const tempCol = await getTemporaryDonationsCollection();
      const mongoDocs = await tempCol
        .find({
          $or: [
            { streamerId: streamer.id },
            { streamerId: 'demo-streamer-id-1001' }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray();

      for (const doc of mongoDocs) {
        const docId = doc.id || (doc as any).donationId || String(doc._id);
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

      matchedTemp = findMatchingTemporaryDonation(candidates, {
        donorName: donorName.trim(),
        bankingName,
        rawText: `${bankingName} ${donorName}`,
        senderName: donorName.trim(),
        amount: numericAmount
      });

      if (!matchedTemp) {
        const recentCandidates: any[] = [];
        const allRecentMongo = await tempCol
          .find({})
          .sort({ createdAt: -1 })
          .limit(30)
          .toArray();
        for (const doc of allRecentMongo) {
          const docId = doc.id || (doc as any).donationId || String(doc._id);
          recentCandidates.push({
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

        matchedTemp = findMatchingTemporaryDonation(recentCandidates, {
          donorName: donorName.trim(),
          bankingName,
          rawText: `${bankingName} ${donorName}`,
          senderName: donorName.trim(),
          amount: numericAmount
        });
      }

      if (matchedTemp) {
        console.log(`🎯 [Gateway Matched] Found active temporary donation session ${matchedTemp.id} in MongoDB (Bank Name: "${matchedTemp.banking_name}", Donor: "${matchedTemp.donor_name}").`);
        try {
          await tempCol.deleteMany({
            $or: [{ id: matchedTemp.id }, { donationId: matchedTemp.id }]
          });
        } catch (e) {}
      }
    } catch (matchErr) {
      console.warn('[Temporary Listener] Error checking temporary donations in MongoDB:', matchErr);
    }

    // Preserve active session ID so frontend modal poller immediately sees PAID
    const activeDonationId = matchedTemp ? matchedTemp.id : uuidv4();

    // Ensure donor matches the full Payer Name (Bank Account) with both first name & surname (e.g. "HO CHENHENG")
    const payerBankName = (matchedTemp?.banking_name || bankingName || '').trim();
    let effectiveDonorName = '';
    if (payerBankName && !isGenericBankKeyword(payerBankName)) {
      effectiveDonorName = payerBankName;
    } else {
      effectiveDonorName = (matchedTemp && matchedTemp.donor_name) ? matchedTemp.donor_name : donorName.trim();
    }

    const effectiveDonorMessage = (matchedTemp && matchedTemp.donor_message) ? matchedTemp.donor_message : (donorMessage ? donorMessage.trim() : '');
    const effectiveAmount = numericAmount > 0 ? numericAmount : (matchedTemp?.amount || 1.0);
    const effectiveCurrency = currency.toUpperCase() === 'KHR' ? 'KHR' : (matchedTemp?.currency || 'USD');
    const effectiveBankingName = matchedTemp?.banking_name || bankingName;
    const effectiveVideoUrl = matchedTemp?.video_url || undefined;
    const effectiveVideoTitle = matchedTemp?.video_title || undefined;
    const effectiveVideoStartTime = Number(matchedTemp?.video_start_time) || 0;
    const effectiveVideoEndTime = Number(matchedTemp?.video_end_time) || 0;

    // 2. Update or insert into SQLite donations table with status PAID
    try {
      if (matchedTemp) {
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
          bankingName.toLowerCase().includes('aba') ? 'ABA_PAYWAY' : 'BAKONG_KHQR',
          effectiveVideoUrl || null,
          effectiveVideoTitle || null,
          effectiveVideoStartTime,
          effectiveVideoEndTime,
          activeDonationId
        );

        if (updateResult.changes === 0) {
          db.prepare(`
            INSERT INTO donations (
              id, streamer_id, donor_name, donor_message, amount, currency,
              banking_name, payment_method, video_url, video_title,
              video_start_time, video_end_time, status, is_alerted, paid_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', 1, datetime('now'))
          `).run(
            activeDonationId,
            streamer.id,
            effectiveDonorName,
            effectiveDonorMessage,
            effectiveAmount,
            effectiveCurrency,
            effectiveBankingName,
            bankingName.toLowerCase().includes('aba') ? 'ABA_PAYWAY' : 'BAKONG_KHQR',
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
          streamer.id,
          effectiveDonorName,
          effectiveDonorMessage,
          effectiveAmount,
          effectiveCurrency,
          effectiveBankingName,
          bankingName.toLowerCase().includes('aba') ? 'ABA_PAYWAY' : 'BAKONG_KHQR',
          effectiveVideoUrl || null,
          effectiveVideoTitle || null,
          effectiveVideoStartTime,
          effectiveVideoEndTime
        );
      }
    } catch (dbErr) {
      console.error('[DB] Error updating/inserting confirm-payment donation:', dbErr);
    }

    // 3. Get streamer alert settings from MongoDB alert_boxes
    let matchingBox: any = null;
    try {
      const alertBoxesCol = await getAlertBoxesCollection();
      const activeBoxes = await alertBoxesCol
        .find({ userId: streamer.id, isEnabled: true })
        .sort({ minAmountCondition: -1 })
        .toArray();
      matchingBox = activeBoxes.find((b) => effectiveAmount >= (Number(b.minAmountCondition) || 0)) || activeBoxes[0];
    } catch (e) {
      console.warn('[PaymentGateway] Could not fetch mongo alert boxes:', e);
    }

    const alertSettings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(streamer.id) as any;
    const videoSettings = db.prepare('SELECT * FROM video_alert_settings WHERE streamer_id = ?').get(streamer.id) as any;

    // 4. Trigger Real-Time OBS Studio Overlay Alert with current saved settings
    broadcastAlertToOverlay(streamer.overlay_token, {
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
      videoAlertEnabled: videoSettings ? (videoSettings.is_enabled === 1) : false,
      videoMinTipAmount: videoSettings ? Number(videoSettings.min_tip_amount) : 0.25,
      videoMaxDurationSeconds: videoSettings ? Number(videoSettings.max_duration_seconds) : 300,
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

    // 5. Broadcast to Streamer Live Dashboard (Updates revenue & recent list immediately)
    broadcastDonationToDashboard(streamer.id, {
      id: activeDonationId,
      donor_name: effectiveDonorName,
      donor_message: effectiveDonorMessage,
      amount: effectiveAmount,
      currency: effectiveCurrency,
      banking_name: effectiveBankingName,
      payment_method: bankingName,
      status: 'PAID'
    });

    // 5b. Update Active Stream Goal in Real Time if active
    try {
      const activeGoal = db.prepare(`
        SELECT * FROM stream_goals 
        WHERE streamer_token = ? AND is_active = 1
        LIMIT 1
      `).get(streamer.overlay_token) as any;

      if (activeGoal) {
        const addedUsd = effectiveCurrency === 'KHR' ? (effectiveAmount / 4100) : effectiveAmount;
        const newGoalAmount = activeGoal.current_amount + addedUsd;
        db.prepare("UPDATE stream_goals SET current_amount = ?, updated_at = datetime('now') WHERE id = ?")
          .run(newGoalAmount, activeGoal.id);

        const io = getIO();
        if (io) {
          io.to(`overlay:${streamer.overlay_token}`).emit('goal:update', {
            id: activeGoal.id,
            token: streamer.overlay_token,
            title: activeGoal.title,
            targetAmount: Number(activeGoal.target_amount),
            currentAmount: newGoalAmount,
            accentColor: activeGoal.accent_color,
            endDate: activeGoal.end_date,
            isActive: true,
            donorName: effectiveDonorName,
            addedAmount: addedUsd
          });
        }
      }
    } catch (e) {
      console.warn('[PaymentGateway] Could not update active goal:', e);
    }

    // 6. Calculate total updated revenue
    const revenueRow = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0) as totalUsd,
        COALESCE(SUM(CASE WHEN currency = 'KHR' THEN amount ELSE 0 END), 0) as totalKhr
      FROM donations
      WHERE streamer_id = ? AND status = 'PAID'
    `).get(streamer.id) as any;

    console.log(`✅ [Payment Gateway] Donation confirmed for @${streamer.username}: ${donorName} ($${numericAmount}). Overlay alert fired!`);

    return NextResponse.json({
      success: true,
      message: `Payment confirmed for @${streamer.username}! Alert triggered on OBS and revenue updated.`,
      donationId: activeDonationId,
      streamer: {
        id: streamer.id,
        username: streamer.username,
        displayName: streamer.display_name
      },
      updatedRevenue: {
        usd: revenueRow?.totalUsd || 0,
        khr: revenueRow?.totalKhr || 0
      }
    });
  } catch (err: any) {
    console.error('API /api/payment-gateway/confirm-payment error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process payment confirmation' },
      { status: 500 }
    );
  }
}
