import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { broadcastAlertToOverlay, broadcastDonationToDashboard, getIO } from '@/server/services/socketService';
import { findMatchingTemporaryDonation, isGenericBankKeyword } from '@/server/utils/nameMatching';
import { getAuthenticatedUser } from '@/server/auth';
import { generateSecureOverlayToken } from '@/server/utils/crypto';
import {
  getUsersCollection,
  getDonationsCollection,
  getTemporaryDonationsCollection,
  getAlertBoxesCollection,
  resolveMatchingAlertBox,
  getAlertSettingsCollection,
  getVideoAlertSettingsCollection,
  getStreamGoalsCollection,
  getSubscribersCollection,
  getSubscriberSettingsCollection,
  buildSubscriberUsernameQuery
} from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    // 1. Authorization check: internal gateway secret, authenticated streamer, or local development
    const gatewaySecret = (process.env.PAYMENT_GATEWAY_SECRET || process.env.INTERNAL_API_SECRET || '').trim();
    const providedSecret =
      req.headers.get('x-gateway-secret') ||
      req.headers.get('x-internal-secret') ||
      req.nextUrl.searchParams.get('secret');

    const hasValidSecret = Boolean(gatewaySecret && providedSecret && providedSecret === gatewaySecret);
    const authUser = getAuthenticatedUser(req);
    const host = req.headers.get('host') || '';
    const isLocalDev = process.env.NODE_ENV !== 'production' && (host.includes('localhost') || host.includes('127.0.0.1'));

    if (!hasValidSecret && !authUser && !isLocalDev) {
      console.warn('[PaymentGateway] Rejected unauthorized confirm-payment request.');
      return NextResponse.json(
        { error: 'Unauthorized: Valid payment gateway secret or streamer authentication required.' },
        { status: 401 }
      );
    }

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

    // 2. Resolve streamer from MongoDB
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

    if (!streamer && body.donationId) {
      try {
        const donationsCol = await getDonationsCollection();
        const existingDoc = await donationsCol.findOne({ id: body.donationId });
        if (existingDoc?.streamerId) {
          streamer = await usersCol.findOne({
            $or: [
              { userId: existingDoc.streamerId },
              { id: existingDoc.streamerId as any },
              { username: existingDoc.streamerId }
            ]
          });
        }
        if (!streamer) {
          const tempCol = await getTemporaryDonationsCollection();
          const existingTemp = await tempCol.findOne({
            $or: [{ id: body.donationId }, { donationId: body.donationId }]
          });
          if (existingTemp?.streamerId) {
            streamer = await usersCol.findOne({
              $or: [
                { userId: existingTemp.streamerId },
                { id: existingTemp.streamerId as any },
                { username: existingTemp.streamerId }
              ]
            });
          }
        }
      } catch (err) {}
    }

    if (!streamer) {
      return NextResponse.json(
        { error: 'Streamer channel not found' },
        { status: 404 }
      );
    }

    // If caller is authenticated user (not gateway secret), verify they own this channel
    if (authUser && !hasValidSecret) {
      const streamerUserId = streamer.userId || streamer.id || String(streamer._id);
      if (streamerUserId !== authUser.id && streamer.username !== authUser.username) {
        return NextResponse.json(
          { error: 'Forbidden: You can only confirm payments for your own channel.' },
          { status: 403 }
        );
      }
    }

    const resolvedStreamerId = streamer.userId || streamer.id || String(streamer._id);
    if (!streamer.overlayToken && !streamer.overlay_token) {
      const newTok = generateSecureOverlayToken();
      streamer.overlayToken = newTok;
      try {
        await usersCol.updateOne({ _id: streamer._id }, { $set: { overlayToken: newTok, updatedAt: new Date() } });
      } catch (e) {}
    }
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
            created_at: doc.createdAt,
            is_subscription: Boolean(doc.isSubscription || (doc as any).is_subscription),
            tier_id: doc.tierId || (doc as any).tier_id,
            tier_name: doc.tierName || (doc as any).tier_name,
            badge_text: doc.badgeText || (doc as any).badge_text,
            badge_color: doc.badgeColor || (doc as any).badge_color,
            badge_bg: doc.badgeBg || (doc as any).badge_bg,
            badge_border: doc.badgeBorder || (doc as any).badge_border,
            badge_icon: doc.badgeIcon || (doc as any).badge_icon,
            badge_gif_url: doc.badgeGifUrl || (doc as any).badge_gif_url,
            badge_image: doc.badgeImage || (doc as any).badge_image
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
              created_at: doc.createdAt,
              is_subscription: Boolean(doc.isSubscription || (doc as any).is_subscription),
              tier_id: doc.tierId || (doc as any).tier_id,
              tier_name: doc.tierName || (doc as any).tier_name,
              badge_text: doc.badgeText || (doc as any).badge_text,
              badge_color: doc.badgeColor || (doc as any).badge_color,
              badge_bg: doc.badgeBg || (doc as any).badge_bg,
              badge_border: doc.badgeBorder || (doc as any).badge_border,
              badge_icon: doc.badgeIcon || (doc as any).badge_icon,
              badge_gif_url: doc.badgeGifUrl || (doc as any).badge_gif_url,
              badge_image: doc.badgeImage || (doc as any).badge_image
            });
          }
        }
      } catch (sqlErr) {}

      if (body.donationId) {
        matchedTemp = candidates.find((c) => c.id === body.donationId) || null;
      }

      if (!matchedTemp) {
        matchedTemp = findMatchingTemporaryDonation(candidates, {
          donorName: donorName.trim(),
          payerName: (bankingName || donorName).trim(),
          bankingName,
          rawText: `${bankingName} ${donorName}`,
          senderName: donorName.trim(),
          amount: numericAmount,
          currency
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

    const isSubscription = Boolean(
      matchedTemp?.is_subscription ||
      matchedTemp?.isSubscription
    );
    const tierId = matchedTemp?.tier_id || matchedTemp?.tierId || undefined;
    let tierName = matchedTemp?.tier_name || matchedTemp?.tierName || undefined;
    let badgeText = matchedTemp?.badge_text || matchedTemp?.badgeText || undefined;
    let badgeColor = matchedTemp?.badge_color || matchedTemp?.badgeColor || undefined;
    let badgeBg = matchedTemp?.badge_bg || matchedTemp?.badgeBg || undefined;
    let badgeBorder = matchedTemp?.badge_border || matchedTemp?.badgeBorder || undefined;
    let badgeIcon = matchedTemp?.badge_icon || matchedTemp?.badgeIcon || undefined;
    let badgeGifUrl = matchedTemp?.badge_gif_url || matchedTemp?.badgeGifUrl || undefined;
    let badgeImage = matchedTemp?.badge_image || matchedTemp?.badgeImage || undefined;

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
            isSubscription: isSubscription || undefined,
            tierId,
            tierName,
            badgeText,
            badgeColor,
            badgeBg,
            badgeBorder,
            badgeIcon,
            badgeGifUrl,
            badgeImage,
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

    // If subscription payment, activate 30-day membership in subscribers collection
    let subscriberRecord: any = null;
    if (isSubscription) {
      try {
        const subCol = await getSubscribersCollection();
        const subCleanName = effectiveDonorName;
        const youtubeHandle = subCleanName.replace(/^@+/, '').trim();
        const subscribedAt = now;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        subscriberRecord = {
          id: 'sub_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          streamerToken: resolvedOverlayToken || 'demo-token',
          streamerUsername: streamer?.username || resolvedStreamerId,
          subscriberName: subCleanName,
          youtubeHandle,
          tierId: tierId || 'tier_sub',
          tierName: tierName || 'Subscriber',
          price: effectiveAmount,
          currency: effectiveCurrency,
          badgeText: badgeText || 'SUB',
          badgeColor: badgeColor || '#00F0FF',
          badgeBg: badgeBg || 'rgba(0, 240, 255, 0.2)',
          badgeBorder: badgeBorder || 'rgba(0, 240, 255, 0.4)',
          badgeIcon: badgeIcon || 'Crown',
          badgeGifUrl: badgeGifUrl || badgeImage,
          badgeImage: badgeImage || badgeGifUrl,
          paymentMethod: bankingName || 'Bakong KHQR',
          status: 'active',
          subscribedAt,
          expiresAt,
          donorMessage: effectiveDonorMessage,
          transactionId: activeDonationId
        };

        await subCol.updateOne(
          {
            streamerToken: resolvedOverlayToken || 'demo-token',
            ...buildSubscriberUsernameQuery(subCleanName)
          },
          { $set: subscriberRecord },
          { upsert: true }
        );

        const io = getIO();
        if (io) {
          if (resolvedOverlayToken) io.to(`overlay:${resolvedOverlayToken}`).emit('subscriber:new', subscriberRecord);
          io.to(`dashboard:${resolvedStreamerId}`).emit('subscriber:new', subscriberRecord);
          if (resolvedOverlayToken && resolvedOverlayToken !== 'demo-token') {
            io.to(`dashboard:${resolvedOverlayToken}`).emit('subscriber:new', subscriberRecord);
            io.to('overlay:demo-token').emit('subscriber:new', subscriberRecord);
          }
        }
      } catch (subErr) {
        console.error('[Subscriber] Error creating subscriber record in confirm-payment:', subErr);
      }
    }

    // 3. Get streamer alert settings from MongoDB alert_boxes
    const effectiveAmountUsd = effectiveCurrency === 'KHR' ? effectiveAmount / 4000 : effectiveAmount;
    let matchingBox: any = null;
    let hasConfiguredBoxes = false;
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
          ]
        })
        .sort({ minAmountCondition: -1 })
        .toArray();
      hasConfiguredBoxes = activeBoxes.length > 0;
      matchingBox = resolveMatchingAlertBox(activeBoxes, effectiveAmountUsd);
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

    const videoMinTipAmount = videoSettings ? Number(videoSettings.minTipAmount ?? videoSettings.min_tip_amount ?? 2.0) : 2.0;
    const isVideoAlertEnabled = videoSettings ? (videoSettings.isEnabled === true || videoSettings.is_enabled === 1 || videoSettings.is_enabled === true) : true;
    const meetsVideoThreshold = isVideoAlertEnabled && effectiveAmountUsd + 0.0001 >= videoMinTipAmount;
    const finalVideoUrl = meetsVideoThreshold ? effectiveVideoUrl : undefined;
    const finalVideoTitle = meetsVideoThreshold ? effectiveVideoTitle : undefined;
    const finalVideoStartTime = meetsVideoThreshold ? effectiveVideoStartTime : 0;
    const finalVideoEndTime = meetsVideoThreshold ? effectiveVideoEndTime : 0;

    // If subscription, fetch subscriber tier alertSettings from MongoDB
    let tierAlertSettings: any = null;
    if (isSubscription) {
      try {
        const subSettingsCol = await getSubscriberSettingsCollection();
        const subSettingsDoc = await subSettingsCol.findOne({
          $or: [
            ...(resolvedOverlayToken ? [{ streamerToken: resolvedOverlayToken }] : []),
            ...(streamer.username ? [{ streamerUsername: streamer.username }] : []),
            { streamerToken: resolvedStreamerId }
          ]
        });
        if (subSettingsDoc && Array.isArray(subSettingsDoc.tiers)) {
          const foundTier = subSettingsDoc.tiers.find(
            (t) => (tierId && t.id === tierId) || (tierName && t.name.toLowerCase() === tierName.toLowerCase())
          ) || subSettingsDoc.tiers[0];
          if (foundTier?.alertSettings) {
            tierAlertSettings = foundTier.alertSettings;
          }
          if (foundTier) {
            if (!tierName) tierName = foundTier.name;
            if (!badgeText && foundTier.badgeText) badgeText = foundTier.badgeText;
            if (!badgeColor && foundTier.badgeColor) badgeColor = foundTier.badgeColor;
            if (!badgeBg && foundTier.badgeBg) badgeBg = foundTier.badgeBg;
            if (!badgeBorder && foundTier.badgeBorder) badgeBorder = foundTier.badgeBorder;
            if (!badgeIcon && foundTier.badgeIcon) badgeIcon = foundTier.badgeIcon;
            if (!badgeGifUrl && (foundTier.badgeGifUrl || foundTier.badgeImage)) {
              badgeGifUrl = foundTier.badgeGifUrl || foundTier.badgeImage;
              badgeImage = badgeGifUrl;
            }
          }
        }
      } catch (subErr) {
        console.warn('[ConfirmPayment] Could not fetch subscriber tier alertSettings:', subErr);
      }
    }

    const legacyMinAlertUsd = Number(alertSettings?.min_amount_alert ?? alertSettings?.minAmountAlert ?? 0.01);
    const meetsAlertThreshold = isSubscription
      ? true
      : hasConfiguredBoxes
      ? Boolean(matchingBox)
      : effectiveAmountUsd + 0.0001 >= legacyMinAlertUsd;

    const ttsMinAmountUsd = Number(
      (isSubscription && tierAlertSettings?.ttsMinAmount !== undefined)
        ? tierAlertSettings.ttsMinAmount
        : (matchingBox?.ttsMinAmount ?? alertSettings?.tts_min_amount ?? alertSettings?.ttsMinAmount ?? 0)
    );
    const meetsTtsThreshold = effectiveAmountUsd + 0.0001 >= ttsMinAmountUsd;

    // 4. Trigger Real-Time OBS Studio Overlay Alert with current saved settings (only if paid amount meets threshold)
    if (meetsAlertThreshold || Boolean(finalVideoUrl)) {
      broadcastAlertToOverlay(resolvedOverlayToken, {
        streamerId: resolvedStreamerId,
        streamerUsername: streamer.username,
        boxId: matchingBox?._id ? String(matchingBox._id) : undefined,
        donationId: activeDonationId,
        donorName: effectiveDonorName,
        donorMessage: effectiveDonorMessage,
        donor_message: effectiveDonorMessage,
        message: effectiveDonorMessage,
        amount: effectiveAmount,
        currency: effectiveCurrency,
        bankingName: effectiveBankingName,
        isSubscription: isSubscription || undefined,
        tierId: tierId || undefined,
        tierName: tierName || undefined,
        badgeText: badgeText || undefined,
        badgeColor: badgeColor || undefined,
        videoUrl: finalVideoUrl,
        videoTitle: finalVideoTitle,
        videoStartTime: finalVideoStartTime,
        videoEndTime: finalVideoEndTime,
        videoAlertEnabled: isVideoAlertEnabled,
        videoMinTipAmount: videoMinTipAmount,
        videoMaxDurationSeconds: videoSettings ? Number(videoSettings.maxDurationSeconds ?? videoSettings.max_duration_seconds ?? 300) : 300,
        templateStyle: (isSubscription && tierAlertSettings?.templateStyle) || matchingBox?.templateStyle || alertSettings?.template_style || 'neon-box',
        textTemplate: isSubscription
          ? (tierAlertSettings?.textTemplate || '{name} joined as a {tier} subscriber!')
          : (matchingBox?.textTemplate || alertSettings?.text_template || '{donator} donated {amount} through superchat!'),
        textColor: (isSubscription && tierAlertSettings?.textColor) || matchingBox?.textColor || alertSettings?.text_color || '#FFFFFF',
        donorColor: (isSubscription && (tierAlertSettings?.subscriberColor || tierAlertSettings?.donorColor)) || matchingBox?.donorColor || undefined,
        amountColor: (isSubscription && (tierAlertSettings?.tierColor || tierAlertSettings?.amountColor)) || matchingBox?.amountColor || undefined,
        customGifUrl: (isSubscription && tierAlertSettings?.mediaUrl) || badgeGifUrl || badgeImage || matchingBox?.mediaUrl || alertSettings?.custom_gif_url,
        mediaUrl: (isSubscription && tierAlertSettings?.mediaUrl) || badgeGifUrl || badgeImage || matchingBox?.mediaUrl || alertSettings?.custom_gif_url,
        showImage: (isSubscription && tierAlertSettings?.showImage !== undefined) ? tierAlertSettings.showImage : (matchingBox?.showImage !== undefined ? matchingBox.showImage : (alertSettings?.show_image !== 0)),
        fontFamily: (isSubscription && tierAlertSettings?.fontFamily) || matchingBox?.fontFamily || alertSettings?.font_family || 'Chakra Petch',
        fontSize: (isSubscription && tierAlertSettings?.fontSize) || matchingBox?.fontSize || alertSettings?.font_size || 28,
        layoutMode: (isSubscription && tierAlertSettings?.layoutMode) || matchingBox?.layoutMode || alertSettings?.layout_mode || 'top',
        animationStyle: (isSubscription && tierAlertSettings?.animationStyle) || matchingBox?.animationStyle || alertSettings?.animation_style || 'fade',
        glowColor: (isSubscription && (tierAlertSettings?.glowColor || badgeColor)) || (matchingBox?.glowColor || alertSettings?.glow_color || '#00F0FF'),
        soundUrl: (isSubscription && tierAlertSettings?.soundUrl)
          ? tierAlertSettings.soundUrl
          : ((matchingBox?.soundUrl && !matchingBox.soundUrl.includes('neon-chime'))
              ? matchingBox.soundUrl
              : (alertSettings?.sound_url && !alertSettings.sound_url.includes('neon-chime')
                  ? alertSettings.sound_url
                  : '/sounds/cash-register-kaching.mp3')),
        soundVolume: (isSubscription && tierAlertSettings?.soundVolume !== undefined)
          ? tierAlertSettings.soundVolume
          : (matchingBox?.soundVolume ?? alertSettings?.sound_volume ?? 0.85),
        durationSeconds: (isSubscription && tierAlertSettings?.durationSeconds)
          ? tierAlertSettings.durationSeconds
          : (finalVideoEndTime && finalVideoStartTime && (finalVideoEndTime - finalVideoStartTime > 0)
              ? Math.max(matchingBox?.durationSeconds || alertSettings?.duration_seconds || 8, finalVideoEndTime - finalVideoStartTime + 2)
              : (matchingBox?.durationSeconds || alertSettings?.duration_seconds || 8)),
        ttsEnabled: meetsTtsThreshold && Boolean((isSubscription && tierAlertSettings?.ttsEnabled !== undefined)
          ? tierAlertSettings.ttsEnabled
          : (matchingBox?.ttsEnabled !== undefined ? matchingBox.ttsEnabled : ((alertSettings?.tts_enabled ?? 1) === 1))),
        ttsType: (isSubscription && tierAlertSettings?.ttsType)
          ? tierAlertSettings.ttsType
          : (matchingBox?.ttsType || (
              (alertSettings?.tts_voice || '').toLowerCase() === 'google-male' || (alertSettings?.tts_voice || '').toLowerCase().includes('christopher') ? 'google-male'
              : (alertSettings?.tts_voice || '').toLowerCase().includes('female') || (alertSettings?.tts_voice || '').toLowerCase().includes('sreymom') ? 'kiritts-female'
              : (alertSettings?.tts_voice || '').toLowerCase().includes('male') || (alertSettings?.tts_voice || '').toLowerCase().includes('piseth') ? 'kiritts-male'
              : alertSettings?.tts_voice === 'cloned' ? 'cloned'
              : (alertSettings?.tts_type || 'google')
            )),
        clonedVoiceSampleUrl: (isSubscription && tierAlertSettings?.clonedVoiceSampleUrl)
          ? tierAlertSettings.clonedVoiceSampleUrl
          : (matchingBox?.clonedVoiceSampleUrl || alertSettings?.cloned_voice_sample_url)
      });
    }

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
      is_subscription: isSubscription,
      subscriber: subscriberRecord,
      created_at: now.toISOString(),
      paid_at: now.toISOString()
    });

    // 5b. Update Active Stream Goal in Real Time if active in MongoDB (ONLY for Pro Plan streamers)
    const isStreamerPro = streamer && (String(streamer.plan || 'free').toLowerCase() !== 'free' || Boolean((streamer as any).isAdmin));
    if (isStreamerPro) {
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
          const addedUsd = effectiveCurrency === 'KHR' ? (effectiveAmount / 4000) : effectiveAmount;
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
