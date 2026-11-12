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

    const defaultPlatforms: ('youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick' | 'instagram')[] = ['youtube', 'facebook'];

    if (!streamer) {
      // Demo fallback when no account exists
      return NextResponse.json({
        success: true,
        streamer: {
          username: 'demo_streamer',
          displayName: 'Demo Creator'
        },
        settings: {
          enabledPlatforms: defaultPlatforms
        },
        totalViewers: 0,
        isLive: false,
        hasChannels: false,
        platforms: defaultPlatforms,
        platformViewers: {}
      });
    }

    const broadcastUrls = {
      youtube: (streamer.broadcastUrls?.youtube || streamer.liveStreamUrl || streamer.youtubeLiveUrl || '').trim(),
      twitch: (streamer.broadcastUrls?.twitch || streamer.twitchLiveUrl || '').trim(),
      tiktok: (streamer.broadcastUrls?.tiktok || streamer.tiktokLiveUrl || '').trim(),
      facebook: (streamer.broadcastUrls?.facebook || streamer.facebookLiveUrl || '').trim(),
      kick: (streamer.broadcastUrls?.kick || '').trim(),
      instagram: (streamer.broadcastUrls?.instagram || '').trim()
    };

    const userSettings = streamer.broadcastViewCount || {};
    const enabledPlatforms: ('youtube' | 'twitch' | 'tiktok' | 'facebook' | 'kick' | 'instagram')[] =
      Array.isArray(userSettings.enabledPlatforms) && userSettings.enabledPlatforms.length > 0
        ? userSettings.enabledPlatforms
        : defaultPlatforms;

    // Fetch real live concurrent viewers strictly from configured broadcast channel URLs
    const liveStats = await aggregateBroadcastChannelViewers(
      broadcastUrls,
      enabledPlatforms
    );

    return NextResponse.json({
      success: true,
      streamer: {
        username: streamer.username,
        displayName: streamer.displayName || streamer.username
      },
      settings: {
        enabledPlatforms
      },
      totalViewers: liveStats.totalViewers,
      isLive: liveStats.isLive,
      hasChannels: liveStats.hasChannels,
      platforms: enabledPlatforms,
      platformViewers: liveStats.platformViewers
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
      enabledPlatforms: ['youtube', 'facebook']
    };

    const nextPlatforms = Array.isArray(body.enabledPlatforms)
      ? body.enabledPlatforms
      : currentSettings.enabledPlatforms || ['youtube', 'facebook'];

    const nextSettings = {
      enabledPlatforms: nextPlatforms
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

    const broadcastUrls = {
      youtube: (streamer?.broadcastUrls?.youtube || streamer?.liveStreamUrl || streamer?.youtubeLiveUrl || '').trim(),
      twitch: (streamer?.broadcastUrls?.twitch || streamer?.twitchLiveUrl || '').trim(),
      tiktok: (streamer?.broadcastUrls?.tiktok || streamer?.tiktokLiveUrl || '').trim(),
      facebook: (streamer?.broadcastUrls?.facebook || streamer?.facebookLiveUrl || '').trim(),
      kick: (streamer?.broadcastUrls?.kick || '').trim(),
      instagram: (streamer?.broadcastUrls?.instagram || '').trim()
    };

    // Calculate real live concurrent viewers across configured broadcast channels
    const liveStats = await aggregateBroadcastChannelViewers(
      broadcastUrls,
      nextPlatforms
    );

    const payload = {
      settings: nextSettings,
      platforms: nextPlatforms,
      totalViewers: liveStats.totalViewers,
      isLive: liveStats.isLive,
      hasChannels: liveStats.hasChannels,
      platformViewers: liveStats.platformViewers,
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
      isLive: liveStats.isLive,
      hasChannels: liveStats.hasChannels
    });
  } catch (err: any) {
    console.error('API /api/widgets/view-count POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
