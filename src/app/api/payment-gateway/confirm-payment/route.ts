import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { broadcastAlertToOverlay, broadcastDonationToDashboard, getIO } from '@/server/services/socketService';
import { findMatchingTemporaryDonation, isGenericBankKeyword } from '@/server/utils/nameMatching';
import {
  getUsersCollection,
  getDonationsCollection,
  getTemporaryDonationsCollection,
  getAlertBoxesCollection,
  getAlertSettingsCollection,
  getVideoAlertSettingsCollection,
  getStreamGoalsCollection
} from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      streamerUsername,
      streamerId,
      donorName = 'Generous Supporter',
      donorMessage = '',
      amount = 5.0,
      currency = 'USD',
      bankingName = 'ABA Bank'
    } = body;

    // 1. Resolve streamer from MongoDB
    const usersCol = await getUsersCollection();
    let streamer: any = null;
    if (streamerUsername) {
      const clean = streamerUsername.replace(/^@/, '').trim();
      const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      streamer = await usersCol.findOne({
        username: { $regex: new RegExp(`^${escaped}$`, 'i') }
      });
    }
    if (!streamer && streamerId) {
      streamer = await usersCol.findOne({
        $or: [{ userId: streamerId }, { id: streamerId as any }]
      });
    }
    if (!streamer) {
      // Default fallback
      streamer = await usersCol.findOne({
        $or: [{ username: 'streambotkh' }, { username: 'neonstreamer' }]
      });
      if (!streamer) {
        streamer = await usersCol.findOne({});
      }
    }

    if (!streamer) {
      return NextResponse.json(
        { error: 'Streamer channel not found' },
        { status: 404 }
      );
    }

    const resolvedStreamerId = streamer.userId || streamer.id || String(streamer._id);
    const resolvedOverlayToken = streamer.overlayToken || streamer.overlay_token;

    const numericAmount = Math.max(0.01, parseFloat(String(amount)) || 1.0);

    // Check MongoDB temporary_donations listener queue for matching bank name
    let matchedTemp: any = null;
    const tempCol = await getTemporaryDonationsCollection();
    const donationsCol = await getDonationsCollection();

    try {
      const seenIds = new Set<string>();
      const candidates: any[] = [];
      const mongoDocs = await tempCol
        .find({
          $or: [
            { streamerId: resolvedStreamerId },
            ...(streamer.username ? [{ streamerId: streamer.username }] : [])
          ],
          createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) }
        })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray();

      for (const doc of mongoDocs) {
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

      // Also check MongoDB pending donations for this streamer
      try {
        const pendingMongo = await donationsCol
          .find({
            $or: [
              { streamerId: resolvedStreamerId },
              { streamer_id: resolvedStreamerId as any }
            ],
            status: 'PENDING',
            createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) }
          })
          .sort({ createdAt: -1 })
          .limit(30)
          .toArray();

        for (const doc of pendingMongo) {
          const docId = doc.id || String(doc._id);
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
      } catch (sqlErr) {}

      matchedTemp = findMatchingTemporaryDonation(candidates, {
        donorName: donorName.trim(),
        payerName: (bankingName || donorName).trim(),
        bankingName,
        rawText: `${bankingName} ${donorName}`,
        senderName: donorName.trim(),
        amount: numericAmount,
        currency
      });

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

    // Prioritize donor name from username entered on the donation form (fallback to payer bank name)
    const sessionDonorName = ((matchedTemp && matchedTemp.donor_name) || donorName || '').trim();
    const payerBankName = (matchedTemp?.banking_name || bankingName || '').trim();
    let effectiveDonorName = '';
    if (sessionDonorName && !isGenericBankKeyword(sessionDonorName)) {
      effectiveDonorName = sessionDonorName;
    } else if (payerBankName && !isGenericBankKeyword(payerBankName)) {
      effectiveDonorName = payerBankName;
    } else {
      effectiveDonorName = 'Generous Supporter';
    }

    const effectiveDonorMessage =
      (matchedTemp && (matchedTemp.donor_message || matchedTemp.donorMessage))
        ? (matchedTemp.donor_message || matchedTemp.donorMessage)
        : (donorMessage ? donorMessage.trim() : '');
    const effectiveAmount = numericAmount > 0 ? numericAmount : (matchedTemp?.amount || 1.0);
    const effectiveCurrency = currency.toUpperCase() === 'KHR' ? 'KHR' : (matchedTemp?.currency || 'USD');
    const effectiveBankingName = matchedTemp?.banking_name || bankingName;
    const effectiveVideoUrl = matchedTemp?.video_url || undefined;
    const effectiveVideoTitle = matchedTemp?.video_title || undefined;
    const effectiveVideoStartTime = Number(matchedTemp?.video_start_time) || 0;
    const effectiveVideoEndTime = Number(matchedTemp?.video_end_time) || 0;

    const now = new Date();

    // 2. Update or insert into MongoDB donations table with status PAID
    try {
      await donationsCol.updateOne(
        { id: activeDonationId },
        {
          $set: {
            id: activeDonationId,
            streamerId: resolvedStreamerId,
            donorName: effectiveDonorName,
            donorMessage: effectiveDonorMessage,
            amount: effectiveAmount,
            currency: effectiveCurrency,
            bankingName: effectiveBankingName,
            paymentMethod: bankingName.toLowerCase().includes('aba') ? 'ABA_PAYWAY' : 'BAKONG_KHQR',
            videoUrl: effectiveVideoUrl || null,
            videoTitle: effectiveVideoTitle || null,
            videoStartTime: effectiveVideoStartTime,
            videoEndTime: effectiveVideoEndTime,
            status: 'PAID',
            isAlerted: 1,
            paidAt: now,
            updatedAt: now
          },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );
    } catch (dbErr) {
      console.error('[DB] Error updating/inserting confirm-payment donation in MongoDB:', dbErr);
    }

    // 3. Get streamer alert settings from MongoDB alert_boxes
    let matchingBox: any = null;
    try {
      const alertBoxesCol = await getAlertBoxesCollection();
      const activeBoxes = await alertBoxesCol
        .find({
          $or: [
            { userId: resolvedStreamerId },
            { streamerId: resolvedStreamerId },
            ...(streamer.username ? [{ userId: streamer.username }, { streamerId: streamer.username }] : []),
            ...(streamer.email ? [{ userId: streamer.email }, { userEmail: streamer.email }] : []),
            ...(resolvedOverlayToken ? [{ overlayToken: resolvedOverlayToken }, { token: resolvedOverlayToken }] : [])
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
      console.warn('[PaymentGateway] Could not fetch mongo alert boxes:', e);
    }

    let alertSettings: any = null;
    try {
      const alertSettingsCol = await getAlertSettingsCollection();
      alertSettings = await alertSettingsCol.findOne({
        $or: [
          { streamerId: resolvedStreamerId },
          ...(streamer.username ? [{ streamerId: streamer.username }] : [])
        ]
      });
    } catch (e) {}

    let videoSettings: any = null;
    try {
      const videoSettingsCol = await getVideoAlertSettingsCollection();
      videoSettings = await videoSettingsCol.findOne({
        $or: [
          { streamerId: resolvedStreamerId },
          ...(streamer.username ? [{ streamerId: streamer.username }] : [])
        ]
      });
    } catch (e) {}

    // 4. Trigger Real-Time OBS Studio Overlay Alert with current saved settings
    broadcastAlertToOverlay(resolvedOverlayToken, {
      boxId: matchingBox?._id ? String(matchingBox._id) : undefined,
      donationId: activeDonationId,
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
      ttsType: matchingBox?.ttsType || (
        (alertSettings?.tts_voice || '').toLowerCase() === 'google-male' || (alertSettings?.tts_voice || '').toLowerCase().includes('christopher') ? 'google-male'
        : (alertSettings?.tts_voice || '').toLowerCase().includes('female') || (alertSettings?.tts_voice || '').toLowerCase().includes('sreymom') ? 'kiritts-female'
        : (alertSettings?.tts_voice || '').toLowerCase().includes('male') || (alertSettings?.tts_voice || '').toLowerCase().includes('piseth') ? 'kiritts-male'
        : alertSettings?.tts_voice === 'cloned' ? 'cloned'
        : (alertSettings?.tts_type || 'google')
      ),
      clonedVoiceSampleUrl: matchingBox?.clonedVoiceSampleUrl || alertSettings?.cloned_voice_sample_url
    });

    // 5. Broadcast to Streamer Live Dashboard (Updates revenue & recent list immediately)
    broadcastDonationToDashboard(resolvedStreamerId, {
      id: activeDonationId,
      donor_name: effectiveDonorName,
      donor_message: effectiveDonorMessage,
      amount: effectiveAmount,
      currency: effectiveCurrency,
      banking_name: effectiveBankingName,
      payment_method: bankingName,
      status: 'PAID',
      created_at: now.toISOString(),
      paid_at: now.toISOString()
    });

    // 5b. Update Active Stream Goal in Real Time if active in MongoDB
    try {
      const goalsCol = await getStreamGoalsCollection();
      const activeGoal = await goalsCol.findOne({
        $or: [
          { streamerId: resolvedStreamerId },
          ...(resolvedOverlayToken ? [{ streamerToken: resolvedOverlayToken as any }] : [])
        ],
        isActive: true
      });

      if (activeGoal) {
        const addedUsd = effectiveCurrency === 'KHR' ? (effectiveAmount / 4100) : effectiveAmount;
        const newGoalAmount = (activeGoal.currentAmount || 0) + addedUsd;
        await goalsCol.updateOne(
          { _id: activeGoal._id },
          { $set: { currentAmount: newGoalAmount, updatedAt: new Date() } }
        );

        const io = getIO();
        if (io && resolvedOverlayToken) {
          io.to(`overlay:${resolvedOverlayToken}`).emit('goal:update', {
            id: activeGoal._id.toString(),
            token: resolvedOverlayToken,
            title: activeGoal.title,
            targetAmount: Number(activeGoal.targetAmount),
            currentAmount: newGoalAmount,
            theme: activeGoal.theme,
            isActive: true,
            donorName: effectiveDonorName,
            addedAmount: addedUsd
          });
        }
      }
    } catch (e) {
      console.warn('[PaymentGateway] Could not update active goal:', e);
    }

    // 6. Calculate total updated revenue from MongoDB
    let totalUsd = 0;
    let totalKhr = 0;
    try {
      const revenueAgg = await donationsCol.aggregate([
        {
          $match: {
            $or: [
              { streamerId: resolvedStreamerId },
              { streamer_id: resolvedStreamerId as any }
            ],
            status: 'PAID'
          }
        },
        {
          $group: {
            _id: '$currency',
            total: { $sum: '$amount' }
          }
        }
      ]).toArray();

      for (const r of revenueAgg) {
        if (r._id === 'USD') totalUsd = r.total;
        if (r._id === 'KHR') totalKhr = r.total;
      }
    } catch (e) {}

    console.log(`✅ [Payment Gateway] Donation confirmed for @${streamer.username}: ${donorName} ($${numericAmount}). Overlay alert fired!`);

    return NextResponse.json({
      success: true,
      message: `Payment confirmed for @${streamer.username}! Alert triggered on OBS and revenue updated.`,
      donationId: activeDonationId,
      streamer: {
        id: resolvedStreamerId,
        username: streamer.username,
        displayName: streamer.displayName || streamer.display_name
      },
      updatedRevenue: {
        usd: totalUsd,
        khr: totalKhr
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
