import { NextRequest, NextResponse } from 'next/server';
import { getIO, broadcastToAllStreamerRooms } from '@/server/services/socketService';
import { getUsersCollection, getOverlayTokenHistoryCollection } from '@/server/database/mongo';
import { aggregateBroadcastChannelViewers } from '@/utils/streamStats';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';

    const usersCol = await getUsersCollection();
    const histCol = await getOverlayTokenHistoryCollection();

    let streamer: any = await usersCol.findOne({
      $or: [{ overlayToken: token }, { overlay_token: token } as any]
    });

    if (!streamer && token !== 'demo-token') {
      const hist = await histCol.findOne({ token });
      if (hist?.streamerId) {
        streamer = await usersCol.findOne({
          $or: [{ userId: hist.streamerId }, { id: hist.streamerId } as any]
        });
      }
    }

    const defaultPlatforms: ('youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick')[] = ['youtube', 'facebook'];
    const defaultSettings = {
      enabledPlatforms: defaultPlatforms,
      manualViewers: 1420
    };

    if (!streamer) {
      // Demo fallback
      return NextResponse.json({
        success: true,
        streamer: {
          username: 'demo_streamer',
          displayName: 'Demo Creator'
        },
        settings: defaultSettings,
        totalViewers: 1420,
        platforms: defaultPlatforms,
        platformViewers: {
          youtube: 820,
          facebook: 600
        }
      });
    }

    const broadcastUrls = streamer.broadcastUrls || {
      youtube: streamer.liveStreamUrl || '',
      twitch: streamer.twitchLiveUrl || '',
      tiktok: streamer.tiktokLiveUrl || '',
      facebook: streamer.facebookLiveUrl || '',
      kick: ''
    };

    const userSettings = streamer.broadcastViewCount || {};
    const enabledPlatforms: ('youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick')[] =
      Array.isArray(userSettings.enabledPlatforms) && userSettings.enabledPlatforms.length > 0
        ? userSettings.enabledPlatforms
        : defaultPlatforms;

    const manualViewers = typeof userSettings.manualViewers === 'number'
      ? Math.max(0, userSettings.manualViewers)
      : 1420;

    // Fetch real live concurrent viewers from all set broadcast channel URLs
    const liveStats = await aggregateBroadcastChannelViewers(
      broadcastUrls,
      enabledPlatforms,
      manualViewers
    );

    const settings = {
      enabledPlatforms,
      manualViewers,
      isLive: liveStats.isLive
    };

    return NextResponse.json({
      success: true,
      streamer: {
        username: streamer.username,
        displayName: streamer.displayName || streamer.username
      },
      settings,
      totalViewers: liveStats.totalViewers,
      platforms: enabledPlatforms,
      platformViewers: liveStats.platformViewers,
      isLive: liveStats.isLive
    });
  } catch (err: any) {
    console.error('API /api/widgets/view-count GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || 'demo-token';

    const usersCol = await getUsersCollection();
    const histCol = await getOverlayTokenHistoryCollection();

    let streamer: any = await usersCol.findOne({
      $or: [{ overlayToken: token }, { overlay_token: token } as any]
    });

    if (!streamer && token !== 'demo-token') {
      const hist = await histCol.findOne({ token });
      if (hist?.streamerId) {
        streamer = await usersCol.findOne({
          $or: [{ userId: hist.streamerId }, { id: hist.streamerId } as any]
        });
      }
    }

    const currentSettings = streamer?.broadcastViewCount || {
      enabledPlatforms: ['youtube', 'facebook'],
      manualViewers: 1420
    };

    const nextPlatforms = Array.isArray(body.enabledPlatforms)
      ? body.enabledPlatforms
      : currentSettings.enabledPlatforms || ['youtube', 'facebook'];

    const nextManual = typeof body.manualViewers === 'number'
      ? Math.max(0, body.manualViewers)
      : (body.manualViewers !== undefined ? Math.max(0, Number(body.manualViewers) || 0) : currentSettings.manualViewers);

    const nextSettings = {
      enabledPlatforms: nextPlatforms,
      manualViewers: nextManual
    };

    if (streamer) {
      await usersCol.updateOne(
        { _id: streamer._id },
        {
          $set: {
            broadcastViewCount: nextSettings,
            updatedAt: new Date()
          }
        }
      );
    }

    const broadcastUrls = streamer?.broadcastUrls || {
      youtube: streamer?.liveStreamUrl || '',
      twitch: streamer?.twitchLiveUrl || '',
      tiktok: streamer?.tiktokLiveUrl || '',
      facebook: streamer?.facebookLiveUrl || '',
      kick: ''
    };

    // Calculate real live concurrent viewers across configured broadcast channels
    const liveStats = await aggregateBroadcastChannelViewers(
      broadcastUrls,
      nextPlatforms,
      nextSettings.manualViewers
    );

    const payload = {
      settings: nextSettings,
      platforms: nextPlatforms,
      totalViewers: liveStats.totalViewers,
      isLive: liveStats.isLive,
      platformViewers: liveStats.platformViewers,
      isTest: Boolean(body.isTest),
      updatedAt: Date.now()
    };

    // Broadcast in real-time to OBS overlays
    const io = getIO();
    if (io) {
      io.to(`overlay:${token}`).emit('view_count:update', payload);
      if (token !== 'demo-token') {
        io.to('overlay:demo-token').emit('view_count:update', payload);
      }
    }
    await broadcastToAllStreamerRooms(token, 'view_count:update', payload);

    return NextResponse.json({
      success: true,
      message: 'View count settings saved successfully',
      settings: nextSettings,
      totalViewers: liveStats.totalViewers,
      isLive: liveStats.isLive
    });
  } catch (err: any) {
    console.error('API /api/widgets/view-count POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
