import { NextRequest, NextResponse } from 'next/server';
import { broadcastAlertToOverlay, getIO } from '@/server/services/socketService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const overlayToken = body.overlayToken || 'demo-token';

    const testPayload = {
      donationId: 'test-' + Date.now(),
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
      isTest: true
    };

    // Broadcast once through socketService to the target overlay room
    broadcastAlertToOverlay(overlayToken, testPayload as any);

    // If custom token, also broadcast to demo-token room in case preview overlay uses demo-token
    if (overlayToken !== 'demo-token') {
      const io = getIO();
      if (io) {
        io.to('overlay:demo-token').emit('donation:alert', testPayload);
      }
    }

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
