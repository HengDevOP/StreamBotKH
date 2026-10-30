import { NextRequest, NextResponse } from 'next/server';
import {
  getOverlaysCollection,
  getUsersCollection,
  getOverlayTokenHistoryCollection,
  getVideoAlertSettingsCollection,
  getAlertSettingsCollection
} from '@/server/database/mongo';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const overlaysCol = await getOverlaysCollection();
    const overlay = await overlaysCol.findOne({
      $or: [{ overlayToken: token }, { token: token as any }]
    });

    // Locate streamer by token or historical token from MongoDB
    const usersCol = await getUsersCollection();
    let streamer = await usersCol.findOne({
      $or: [{ overlayToken: token }, { overlay_token: token }]
    });

    if (!streamer) {
      // Check historical token collection
      const histCol = await getOverlayTokenHistoryCollection();
      const histDoc = await histCol.findOne({ token });
      if (histDoc) {
        streamer = await usersCol.findOne({
          $or: [
            { userId: histDoc.streamerId },
            { id: histDoc.streamerId as any }
          ]
        });
      }
    }

    const streamerId = streamer?.userId || (streamer as any)?.id || (streamer ? String(streamer._id) : null);

    let videoSettings: any = null;
    let alertSettings: any = null;
    if (streamerId && streamer) {
      try {
        const videoCol = await getVideoAlertSettingsCollection();
        videoSettings = await videoCol.findOne({
          $or: [
            { streamerId },
            ...(streamer.username ? [{ streamerId: streamer.username }] : [])
          ]
        });
      } catch (e) {}

      try {
        const alertCol = await getAlertSettingsCollection();
        alertSettings = await alertCol.findOne({
          $or: [
            { streamerId },
            ...(streamer.username ? [{ streamerId: streamer.username }] : [])
          ]
        });
      } catch (e) {}
    }

    const isVideoAlertEnabled = videoSettings
      ? (videoSettings.isEnabled === true || videoSettings.is_enabled === 1 || videoSettings.is_enabled === true)
      : true;
    const videoMinTipAmount = videoSettings ? Number(videoSettings.minTipAmount ?? videoSettings.min_tip_amount ?? 0.25) : 0.25;
    const videoMaxDurationSeconds = videoSettings ? Number(videoSettings.maxDurationSeconds ?? videoSettings.max_duration_seconds ?? 300) : 300;
    const videoVolume = videoSettings ? Number(videoSettings.videoVolume ?? videoSettings.video_volume ?? 85) : 85;

    if (!overlay) {
      if (streamer || token.startsWith('ovl_') || token === 'demo-token' || token === 'ovl_token_neon_demo_9921') {
        return NextResponse.json({
          success: true,
          overlay: {
            name: `${streamer?.displayName || (streamer as any)?.display_name || streamer?.username || 'Streamer'}'s Overlay`,
            overlayToken: token,
            mediaUrl: alertSettings?.customGifUrl || alertSettings?.custom_gif_url || 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
            soundUrl: alertSettings?.soundUrl || alertSettings?.sound_url || '/sounds/neon-chime.mp3',
            soundVolume: alertSettings?.soundVolume ?? alertSettings?.sound_volume ?? 0.85,
            glowColor: alertSettings?.glowColor || alertSettings?.glow_color || '#00F0FF',
            templateStyle: alertSettings?.templateStyle || alertSettings?.template_style || 'neon-box',
            durationSeconds: alertSettings?.durationSeconds || alertSettings?.duration_seconds || 8,
            minAmountAlert: alertSettings?.minAmountAlert || alertSettings?.min_amount_alert || 1.0,
            ttsEnabled: alertSettings?.ttsEnabled !== undefined ? alertSettings.ttsEnabled : ((alertSettings?.tts_enabled ?? 1) === 1),
            videoAlertEnabled: isVideoAlertEnabled,
            videoMinTipAmount,
            videoMaxDurationSeconds,
            videoVolume,
            width: 1080,
            height: 720
          }
        });
      }

      return NextResponse.json({ error: 'Overlay not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      overlay: {
        ...overlay,
        videoAlertEnabled: (overlay as any).videoAlertEnabled !== undefined ? (overlay as any).videoAlertEnabled : isVideoAlertEnabled,
        videoMinTipAmount: (overlay as any).videoMinTipAmount !== undefined ? (overlay as any).videoMinTipAmount : videoMinTipAmount,
        videoMaxDurationSeconds: (overlay as any).videoMaxDurationSeconds !== undefined ? (overlay as any).videoMaxDurationSeconds : videoMaxDurationSeconds,
        videoVolume: (overlay as any).videoVolume !== undefined ? (overlay as any).videoVolume : videoVolume
      }
    });
  } catch (err: any) {
    console.error('API /api/overlays/token/[token] error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch overlay' },
      { status: 500 }
    );
  }
}
