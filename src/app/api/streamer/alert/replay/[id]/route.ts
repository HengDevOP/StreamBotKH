import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';
import { getAlertBoxesCollection } from '@/server/database/mongo';
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
    const donation = db.prepare('SELECT * FROM donations WHERE id = ? AND streamer_id = ?').get(id, user.id) as any;
    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    const streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(user.id) as any;
    const alertSettings = db.prepare('SELECT * FROM alert_settings WHERE streamer_id = ?').get(user.id) as any;

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
            ...(streamer?.overlay_token ? [{ overlayToken: streamer.overlay_token }, { token: streamer.overlay_token }] : [])
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

    const payload = {
      boxId: matchingBox?._id ? String(matchingBox._id) : undefined,
      donationId: donation.id,
      donorName: donation.donor_name,
      donorMessage: donation.donor_message,
      donor_message: donation.donor_message,
      message: donation.donor_message,
      amount: donation.amount,
      currency: donation.currency,
      bankingName: donation.banking_name || 'Bakong KHQR',
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
      durationSeconds: matchingBox?.durationSeconds || alertSettings?.duration_seconds || 8,
      ttsEnabled: matchingBox?.ttsEnabled !== undefined ? matchingBox.ttsEnabled : (alertSettings?.tts_enabled === 1),
      ttsType: matchingBox?.ttsType || alertSettings?.tts_voice || 'google',
      clonedVoiceSampleUrl: matchingBox?.clonedVoiceSampleUrl || alertSettings?.cloned_voice_sample_url,
      isTest: false
    };

    broadcastAlertToOverlay(streamer.overlay_token, payload);

    return NextResponse.json({ success: true, message: 'Alert replayed to OBS overlay' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
