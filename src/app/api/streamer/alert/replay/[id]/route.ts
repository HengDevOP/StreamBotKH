import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import {
  getUsersCollection,
  getDonationsCollection,
  getAlertSettingsCollection,
  getVideoAlertSettingsCollection,
  getAlertBoxesCollection
} from '@/server/database/mongo';
import { broadcastAlertToOverlay } from '@/server/services/socketService';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const donationsCol = await getDonationsCollection();
    const donation = await donationsCol.findOne({
      $or: [{ id }, { donationId: id }],
      $and: [
        {
          $or: [
            { streamerId: user.id },
            { streamer_id: user.id as any },
            ...(user.username ? [{ streamerId: user.username }] : [])
          ]
        }
      ]
    }) as any;

    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    const usersCol = await getUsersCollection();
    const streamer = await usersCol.findOne({
      $or: [{ userId: user.id }, { id: user.id as any }]
    });

    const alertCol = await getAlertSettingsCollection();
    const alertSettings = await alertCol.findOne({
      $or: [
        { streamerId: user.id },
        ...(user.username ? [{ streamerId: user.username }] : [])
      ]
    }) as any;

    const videoCol = await getVideoAlertSettingsCollection();
    const videoSettings = await videoCol.findOne({
      $or: [
        { streamerId: user.id },
        ...(user.username ? [{ streamerId: user.username }] : [])
      ]
    }) as any;

    const overlayToken = streamer?.overlayToken || streamer?.overlay_token;

    let matchingBox: any = null;
    try {
      const alertBoxesCol = await getAlertBoxesCollection();
      const activeBoxes = await alertBoxesCol
        .find({
          $or: [
            { userId: user.id },
            { streamerId: user.id },
            ...(streamer?.username ? [{ userId: streamer.username }, { streamerId: streamer.username }] : []),
            ...(streamer?.email ? [{ userId: streamer.email }, { userEmail: streamer.email }] : []),
            ...(overlayToken ? [{ overlayToken }, { token: overlayToken }] : [])
          ],
          isEnabled: true
        })
        .sort({ minAmountCondition: -1 })
        .toArray();

      const effectiveAmountUsd = donation.currency === 'KHR' ? donation.amount / 4000 : donation.amount;
      const matchingBoxes = activeBoxes.filter(
        (b) => effectiveAmountUsd >= ((Number(b.minAmountCondition) || 0) - 0.0001)
      );
      matchingBox = matchingBoxes.length > 0
        ? matchingBoxes[0]
        : (activeBoxes.length > 0 ? activeBoxes[activeBoxes.length - 1] : null);
    } catch (e) {
      console.warn('[Replay] Could not fetch mongo alert boxes:', e);
    }

    const donorName = donation.donorName || donation.donor_name || 'Generous Supporter';
    const donorMessage = donation.donorMessage || donation.donor_message || '';
    const videoUrl = donation.videoUrl || donation.video_url || undefined;
    const videoTitle = donation.videoTitle || donation.video_title || undefined;
    const videoStartTime = Number(donation.videoStartTime ?? donation.video_start_time ?? 0);
    const videoEndTime = Number(donation.videoEndTime ?? donation.video_end_time ?? 0);

    const payload = {
      boxId: matchingBox?._id ? String(matchingBox._id) : undefined,
      donationId: donation.id,
      donorName,
      donorMessage,
      donor_message: donorMessage,
      message: donorMessage,
      amount: donation.amount,
      currency: donation.currency,
      bankingName: donation.bankingName || donation.banking_name || 'ABA Bank',
      videoUrl,
      videoTitle,
      videoStartTime,
      videoEndTime,
      videoAlertEnabled: videoSettings ? (videoSettings.isEnabled === true || videoSettings.is_enabled === 1 || videoSettings.is_enabled === true) : true,
      videoMinTipAmount: videoSettings ? Number(videoSettings.minTipAmount ?? videoSettings.min_tip_amount ?? 0.25) : 0.25,
      videoMaxDurationSeconds: videoSettings ? Number(videoSettings.maxDurationSeconds ?? videoSettings.max_duration_seconds ?? 300) : 300,
      templateStyle: matchingBox?.templateStyle || alertSettings?.templateStyle || alertSettings?.template_style || 'neon-box',
      textTemplate: matchingBox?.textTemplate || alertSettings?.textTemplate || alertSettings?.text_template || '{donator} donated {amount} through superchat!',
      textColor: matchingBox?.textColor || alertSettings?.textColor || alertSettings?.text_color || '#FFFFFF',
      donorColor: matchingBox?.donorColor || undefined,
      amountColor: matchingBox?.amountColor || undefined,
      customGifUrl: matchingBox?.mediaUrl || alertSettings?.customGifUrl || alertSettings?.custom_gif_url,
      mediaUrl: matchingBox?.mediaUrl || alertSettings?.customGifUrl || alertSettings?.custom_gif_url,
      showImage: matchingBox?.showImage !== undefined ? matchingBox.showImage : (alertSettings?.show_image !== 0),
      fontFamily: matchingBox?.fontFamily || alertSettings?.fontFamily || alertSettings?.font_family || 'Chakra Petch',
      fontSize: matchingBox?.fontSize || alertSettings?.fontSize || alertSettings?.font_size || 28,
      layoutMode: matchingBox?.layoutMode || alertSettings?.layoutMode || alertSettings?.layout_mode || 'top',
      animationStyle: matchingBox?.animationStyle || alertSettings?.animationStyle || alertSettings?.animation_style || 'fade',
      glowColor: matchingBox?.glowColor || alertSettings?.glowColor || alertSettings?.glow_color || '#00F0FF',
      soundUrl: (matchingBox?.soundUrl && !matchingBox.soundUrl.includes('neon-chime'))
        ? matchingBox.soundUrl
        : (alertSettings?.soundUrl && !alertSettings.soundUrl.includes('neon-chime')
            ? alertSettings.soundUrl
            : (alertSettings?.sound_url || '/sounds/cash-register-kaching.mp3')),
      soundVolume: matchingBox?.soundVolume ?? alertSettings?.soundVolume ?? alertSettings?.sound_volume ?? 0.85,
      durationSeconds: videoEndTime && videoStartTime && (videoEndTime - videoStartTime > 0)
        ? Math.max(matchingBox?.durationSeconds || alertSettings?.durationSeconds || alertSettings?.duration_seconds || 8, videoEndTime - videoStartTime + 2)
        : (matchingBox?.durationSeconds || alertSettings?.durationSeconds || alertSettings?.duration_seconds || 8),
      ttsEnabled: matchingBox?.ttsEnabled !== undefined ? matchingBox.ttsEnabled : (alertSettings?.tts_enabled !== 0),
      ttsType: matchingBox?.ttsType || alertSettings?.ttsType || alertSettings?.tts_type || 'google',
      clonedVoiceSampleUrl: matchingBox?.clonedVoiceSampleUrl || alertSettings?.clonedVoiceSampleUrl || alertSettings?.cloned_voice_sample_url
    };

    if (overlayToken) {
      broadcastAlertToOverlay(overlayToken, payload);
    }

    return NextResponse.json({ success: true, message: 'Alert replayed to OBS overlay' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
