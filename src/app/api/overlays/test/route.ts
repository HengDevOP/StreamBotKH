import { NextRequest, NextResponse } from 'next/server';
import { broadcastAlertToOverlay, getIO } from '@/server/services/socketService';
import { getAuthenticatedUser } from '@/server/auth';
import { checkRateLimit, getClientIp, isRequestAuthenticated } from '@/server/utils/rateLimiter';
import { getUsersCollection } from '@/server/database/mongo';

export async function POST(req: NextRequest) {
  try {
    if (!isRequestAuthenticated(req)) {
      const clientIp = getClientIp(req);
      const rl = checkRateLimit(`overlay_test:${clientIp}`, 20, 60000);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded: Please wait a moment before sending another test alert.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const overlayToken = body.overlayToken || 'demo-token';

    // Protect against cross-streamer overlay spoofing
    if (overlayToken !== 'demo-token' && overlayToken !== 'ovl_token_neon_demo_9921') {
      let authUser = getAuthenticatedUser(req);

      // Fallback: Verify if overlayToken belongs to a registered streamer in MongoDB
      if (!authUser || !authUser.id) {
        try {
          const usersCol = await getUsersCollection();
          const streamer = await usersCol.findOne({
            $or: [
              { overlayToken },
              { overlay_token: overlayToken }
            ]
          });
          if (streamer) {
            authUser = {
              id: String(streamer._id),
              userId: String(streamer._id),
              username: streamer.username,
              email: streamer.email || '',
              display_name: streamer.displayName || streamer.username,
              displayName: streamer.displayName || streamer.username,
              overlayToken: streamer.overlayToken || streamer.overlay_token
            } as any;
          }
        } catch (dbErr) {
          console.warn('Failed to verify streamer by overlayToken in overlay/test:', dbErr);
        }
      }

      if (!authUser || !authUser.id) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required to test live streamer overlays.' },
          { status: 401 }
        );
      }

      const ownToken = (authUser as any).overlayToken || (authUser as any).overlay_token;
      if (ownToken && ownToken !== overlayToken && authUser.email !== 'hchenheng@gmail.com') {
        return NextResponse.json(
          { error: 'Forbidden: You cannot trigger test alerts on another streamer\'s overlay.' },
          { status: 403 }
        );
      }
    }

    const testPayload = {
      donationId: body.donationId || ('test-' + Date.now()),
      boxId: body.boxId,
      donorName: body.donorName || 'Supporter',
      donorMessage: body.donorMessage || '',
      amount: Number(body.amount) || 1.0,
      currency: 'USD',
      bankingName: body.bankingName || 'ABA Bank',
      templateStyle: body.templateStyle || 'neon-box',
      textTemplate: body.textTemplate,
      textColor: body.textColor,
      donorColor: body.donorColor,
      amountColor: body.amountColor,
      customGifUrl: body.customGifUrl || body.mediaUrl,
      mediaUrl: body.mediaUrl,
      showImage: body.showImage !== false,
      fontFamily: body.fontFamily || 'Chakra Petch',
      fontSize: Number(body.fontSize) || 28,
      layoutMode: body.layoutMode || 'top',
      animationStyle: body.animationStyle || 'fade',
      glowColor: body.glowColor || '#00F0FF',
      soundUrl: body.soundUrl || '/sounds/neon-chime.mp3',
      soundVolume: body.soundVolume ?? 0.85,
      durationSeconds: Number(body.durationSeconds) || 8,
      ttsEnabled: body.ttsEnabled !== false,
      ttsType: body.ttsType || 'google',
      clonedVoiceSampleUrl: body.clonedVoiceSampleUrl,
      videoUrl: body.videoUrl,
      videoTitle: body.videoTitle,
      videoStartTime: body.videoStartTime,
      videoEndTime: body.videoEndTime,
      videoAlertEnabled: body.videoAlertEnabled,
      videoMinTipAmount: body.videoMinTipAmount,
      videoMaxDurationSeconds: body.videoMaxDurationSeconds,
      isVideoTest: Boolean(body.isVideoTest && (body.videoUrl || body.isVideoTest === true)),
      directVideo: Boolean(body.directVideo && body.videoUrl),
      overlayToken,
      isTest: true,
      isSubscription: body.isSubscription,
      tierId: body.tierId,
      tierName: body.tierName,
      badgeText: body.badgeText,
      badgeColor: body.badgeColor,
      badgeBg: body.badgeBg,
      badgeBorder: body.badgeBorder,
      badgeIcon: body.badgeIcon,
      badgeGifUrl: body.badgeGifUrl,
      subscriberColor: body.subscriberColor,
      tierColor: body.tierColor
    };

    // Broadcast once through socketService to the target overlay room
    broadcastAlertToOverlay(overlayToken, testPayload as any);

    return NextResponse.json({
      success: true,
      message: 'Test alert broadcasted to OBS overlay',
      payload: testPayload
    });
  } catch (err: any) {
    console.error('API /api/overlays/test error:', err);
    return NextResponse.json({ error: err.message || 'Failed to trigger test alert' }, { status: 500 });
  }
}
