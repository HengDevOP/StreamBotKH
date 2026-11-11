import { NextRequest, NextResponse } from 'next/server';
import { getIO, broadcastToAllStreamerRooms } from '@/server/services/socketService';
import { getUsersCollection, getOverlayTokenHistoryCollection } from '@/server/database/mongo';
import { extractYoutubeId, getYoutubeLiveStats } from '@/utils/youtube';

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
      manualViewers: 1420,
      theme: 'glass-dark',
      showLiveDot: true,
      showLabel: true
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
      twitch: '',
      tiktok: '',
      facebook: '',
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

    let youtubeViewers = 0;
    let isYoutubeLive = false;

    // Check YouTube live viewer count if YouTube is ticked
    if (enabledPlatforms.includes('youtube') && broadcastUrls.youtube) {
      const ytId = extractYoutubeId(broadcastUrls.youtube);
      if (ytId) {
        try {
          const ytStats = await getYoutubeLiveStats(ytId);
          if (ytStats?.isLive) {
            isYoutubeLive = true;
            youtubeViewers = Math.max(0, ytStats.viewers || 0);
          }
        } catch (e) {
          // Graceful fallback
        }
      }
    }

    // Calculate total concurrent viewers across ticked platforms
    // If live YouTube viewers are found, combine with manual/other platform viewers
    let totalViewers = youtubeViewers;
    if (manualViewers > 0) {
      totalViewers += manualViewers;
    } else if (totalViewers === 0) {
      totalViewers = 1420; // Default active demo number if no live stream detected yet
    }

    const platformViewers: Record<string, number> = {};
    if (enabledPlatforms.includes('youtube')) {
      platformViewers.youtube = youtubeViewers > 0 ? youtubeViewers : Math.round(totalViewers * 0.6);
    }
    if (enabledPlatforms.includes('facebook')) {
      platformViewers.facebook = Math.round(totalViewers * 0.4);
    }
    if (enabledPlatforms.includes('twitch')) {
      platformViewers.twitch = Math.round(totalViewers * 0.3);
    }
    if (enabledPlatforms.includes('tiktok')) {
      platformViewers.tiktok = Math.round(totalViewers * 0.35);
    }
    if (enabledPlatforms.includes('kick')) {
      platformViewers.kick = Math.round(totalViewers * 0.2);
    }

    const settings = {
      enabledPlatforms,
      manualViewers,
      theme: userSettings.theme || 'glass-dark',
      showLiveDot: userSettings.showLiveDot !== undefined ? Boolean(userSettings.showLiveDot) : true,
      showLabel: userSettings.showLabel !== undefined ? Boolean(userSettings.showLabel) : true,
      isLive: isYoutubeLive || manualViewers > 0
    };

    return NextResponse.json({
      success: true,
      streamer: {
        username: streamer.username,
        displayName: streamer.displayName || streamer.username
      },
      settings,
      totalViewers,
      platforms: enabledPlatforms,
      platformViewers
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
      manualViewers: 1420,
      theme: 'glass-dark',
      showLiveDot: true,
      showLabel: true
    };

    const nextPlatforms = Array.isArray(body.enabledPlatforms)
      ? body.enabledPlatforms
      : currentSettings.enabledPlatforms || ['youtube', 'facebook'];

    const nextManual = typeof body.manualViewers === 'number'
      ? Math.max(0, body.manualViewers)
      : (body.manualViewers !== undefined ? Math.max(0, Number(body.manualViewers) || 0) : currentSettings.manualViewers);

    const nextSettings = {
      enabledPlatforms: nextPlatforms,
      manualViewers: nextManual,
      theme: body.theme || currentSettings.theme || 'glass-dark',
      showLiveDot: body.showLiveDot !== undefined ? Boolean(body.showLiveDot) : (currentSettings.showLiveDot ?? true),
      showLabel: body.showLabel !== undefined ? Boolean(body.showLabel) : (currentSettings.showLabel ?? true)
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

    const totalViewers = nextSettings.manualViewers > 0 ? nextSettings.manualViewers : 1420;

    const payload = {
      settings: nextSettings,
      platforms: nextPlatforms,
      totalViewers,
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
      message: body.isTest ? 'Test view count sent to OBS overlay' : 'View count settings saved successfully',
      settings: nextSettings,
      totalViewers
    });
  } catch (err: any) {
    console.error('API /api/widgets/view-count POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
