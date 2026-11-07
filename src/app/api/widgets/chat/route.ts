import { NextRequest, NextResponse } from 'next/server';
import {
  getStreamChatSettingsCollection,
  getSubscribersCollection,
  buildSubscriberUsernameQuery,
  getUsersCollection,
  getOverlayTokenHistoryCollection
} from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getIO, broadcastToAllStreamerRooms } from '@/server/services/socketService';
import { verifyProStreamerByToken } from '@/server/services/planService';
import { youtubeChatService } from '@/server/services/youtubeChatService';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const DEFAULT_CHAT_SETTINGS = {
  theme: 'cyber-neon',
  fontFamily: 'Chakra Petch',
  authorFontFamily: 'Chakra Petch',
  messageFontFamily: 'Inter',
  fontSize: 'base',
  lineStyle: 'inline' as const, // 'inline' | 'indented' | 'stacked'
  authorColor: '#00F0FF',
  messageColor: '#FFFFFF',
  backgroundColor: '#090D18',
  backgroundOpacity: 85,
  animationStyle: 'slide-left',
  overlayWidth: 420,
  overlayHeight: 600,
  showBadges: true,
  showAvatars: true,
  showTimestamp: false,
  fadeDuration: 15,
  messageDelay: 0,
  maxMessages: 10,
  textBorderWidth: 0,
  textBorderColor: '#000000',
  textShadowStyle: 'none' as const,
  textShadowColor: 'rgba(0, 0, 0, 0.95)',
  textShadowBlur: 0,
  soundEnabled: true,
  soundUrl: '/sounds/cash-register-kaching.mp3',
  soundVolume: 0.85,
  youtubeUrl: ''
};

/**
 * Resolves streamer user document and canonical active overlay token from either
 * query/body token or session cookie.
 */
async function resolveStreamerContext(req: NextRequest, providedToken?: string | null) {
  const usersCol = await getUsersCollection();
  const histCol = await getOverlayTokenHistoryCollection();
  const authUser = getAuthenticatedUser(req);

  let streamer: any = null;
  const cleanToken = (providedToken || '').trim();

  // 1. Try finding streamer by provided token if not demo-token
  if (cleanToken && cleanToken !== 'demo-token' && cleanToken !== 'demo_token') {
    streamer = await usersCol.findOne({
      $or: [
        { overlayToken: cleanToken },
        { overlay_token: cleanToken } as any,
        { userId: cleanToken },
        { id: cleanToken as any },
        { username: cleanToken }
      ]
    });

    if (!streamer) {
      const hist = await histCol.findOne({ token: cleanToken });
      if (hist?.streamerId) {
        streamer = await usersCol.findOne({
          $or: [
            { userId: hist.streamerId },
            { id: hist.streamerId } as any
          ]
        });
      }
    }
  }

  // 2. If streamer not resolved by token, check logged-in session
  if (!streamer && authUser) {
    streamer = await usersCol.findOne({
      $or: [
        { userId: authUser.id },
        { id: authUser.id as any },
        { _id: authUser.id as any },
        ...(authUser.email ? [{ email: authUser.email }] : []),
        ...(authUser.username ? [{ username: authUser.username }] : [])
      ]
    });
  }

  // Canonical token determination
  const activeToken = streamer?.overlayToken || streamer?.overlay_token || (cleanToken && cleanToken !== 'demo-token' ? cleanToken : 'demo-token');
  const streamerId = streamer?.userId || streamer?.id || (streamer?._id ? String(streamer._id) : null);
  const streamerUsername = streamer?.username || null;

  // Pro access determination
  const isAdm = Boolean(streamer?.isAdmin) || isAdminEmail(streamer?.email) || isAdminEmail(authUser?.email);
  const isPlanPro = (streamer?.plan && streamer.plan.toLowerCase() !== 'free') || Boolean(streamer?.trialActive);
  const isPro = isAdm || isPlanPro || activeToken === 'demo-token';

  return {
    streamer,
    activeToken,
    streamerId,
    streamerUsername,
    isPro,
    authUser
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenParam = searchParams.get('token');

    const {
      streamer,
      activeToken,
      streamerId,
      streamerUsername,
      isPro
    } = await resolveStreamerContext(req, tokenParam);

    // Verify streamer has Pro plan active (or Admin / Demo)
    if (!isPro) {
      const verification = await verifyProStreamerByToken(activeToken);
      if (!verification.isPro) {
        return NextResponse.json(
          {
            success: false,
            isLocked: true,
            error: 'Pro plan required for Live Chat stream widget.',
            settings: null
          },
          { status: 403 }
        );
      }
    }

    const col = await getStreamChatSettingsCollection();

    // Query by token, activeToken, streamerId, or username to ensure 100% reliable retrieval
    const queryConditions: any[] = [
      { streamerToken: activeToken }
    ];
    if (tokenParam && tokenParam !== activeToken) {
      queryConditions.push({ streamerToken: tokenParam });
    }
    if (streamerId) {
      queryConditions.push({ streamerId }, { userId: streamerId });
    }
    if (streamerUsername) {
      queryConditions.push({ username: streamerUsername });
    }

    let settings = await col.findOne({ $or: queryConditions }) as any;

    const fallbackYoutubeUrl = streamer?.liveStreamUrl || streamer?.youtubeLiveUrl || '';

    if (!settings) {
      settings = {
        id: uuidv4(),
        streamerToken: activeToken,
        streamerId: streamerId || undefined,
        username: streamerUsername || undefined,
        ...DEFAULT_CHAT_SETTINGS,
        youtubeUrl: fallbackYoutubeUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await col.insertOne(settings);
    } else {
      // Keep streamerToken, streamerId, username updated on the record
      const updatesToSync: any = {};
      if (settings.streamerToken !== activeToken) updatesToSync.streamerToken = activeToken;
      if (streamerId && settings.streamerId !== streamerId) updatesToSync.streamerId = streamerId;
      if (streamerUsername && settings.username !== streamerUsername) updatesToSync.username = streamerUsername;
      if ((!settings.youtubeUrl || settings.youtubeUrl.trim() === '') && fallbackYoutubeUrl) {
        updatesToSync.youtubeUrl = fallbackYoutubeUrl;
        settings.youtubeUrl = fallbackYoutubeUrl;
      }
      if (Object.keys(updatesToSync).length > 0) {
        await col.updateOne({ _id: settings._id }, { $set: updatesToSync });
      }
    }

    return NextResponse.json({
      success: true,
      isListening: youtubeChatService.isListening(activeToken) || (tokenParam ? youtubeChatService.isListening(tokenParam) : false),
      settings: {
        id: settings.id || String(settings._id),
        streamerToken: activeToken,
        theme: settings.theme || DEFAULT_CHAT_SETTINGS.theme,
        fontFamily: settings.fontFamily || DEFAULT_CHAT_SETTINGS.fontFamily,
        authorFontFamily: settings.authorFontFamily || settings.fontFamily || DEFAULT_CHAT_SETTINGS.authorFontFamily,
        messageFontFamily: settings.messageFontFamily || settings.fontFamily || DEFAULT_CHAT_SETTINGS.messageFontFamily,
        fontSize: settings.fontSize || DEFAULT_CHAT_SETTINGS.fontSize,
        lineStyle: settings.lineStyle || DEFAULT_CHAT_SETTINGS.lineStyle,
        authorColor: settings.authorColor || DEFAULT_CHAT_SETTINGS.authorColor,
        messageColor: settings.messageColor || DEFAULT_CHAT_SETTINGS.messageColor,
        backgroundColor: settings.backgroundColor || DEFAULT_CHAT_SETTINGS.backgroundColor,
        backgroundOpacity: settings.backgroundOpacity ?? DEFAULT_CHAT_SETTINGS.backgroundOpacity,
        animationStyle: settings.animationStyle || DEFAULT_CHAT_SETTINGS.animationStyle,
        overlayWidth: settings.overlayWidth !== undefined && !isNaN(Number(settings.overlayWidth))
          ? Math.max(0, Number(settings.overlayWidth))
          : DEFAULT_CHAT_SETTINGS.overlayWidth,
        overlayHeight: settings.overlayHeight !== undefined && !isNaN(Number(settings.overlayHeight))
          ? Math.max(0, Number(settings.overlayHeight))
          : DEFAULT_CHAT_SETTINGS.overlayHeight,
        showBadges: settings.showBadges !== false,
        showAvatars: settings.showAvatars !== false,
        showTimestamp: Boolean(settings.showTimestamp),
        fadeDuration: settings.fadeDuration ?? DEFAULT_CHAT_SETTINGS.fadeDuration,
        messageDelay: Number(settings.messageDelay) || 0,
        maxMessages: settings.maxMessages || DEFAULT_CHAT_SETTINGS.maxMessages,
        youtubeUrl: settings.youtubeUrl || fallbackYoutubeUrl,
        textBorderWidth: settings.textBorderWidth !== undefined ? Number(settings.textBorderWidth) : DEFAULT_CHAT_SETTINGS.textBorderWidth,
        textBorderColor: settings.textBorderColor || DEFAULT_CHAT_SETTINGS.textBorderColor,
        textShadowStyle: settings.textShadowStyle || DEFAULT_CHAT_SETTINGS.textShadowStyle,
        textShadowColor: settings.textShadowColor || DEFAULT_CHAT_SETTINGS.textShadowColor,
        textShadowBlur: settings.textShadowBlur !== undefined ? Number(settings.textShadowBlur) : DEFAULT_CHAT_SETTINGS.textShadowBlur,
        soundEnabled: settings.soundEnabled !== false,
        soundUrl: settings.soundUrl || DEFAULT_CHAT_SETTINGS.soundUrl,
        soundVolume: settings.soundVolume !== undefined && !isNaN(Number(settings.soundVolume))
          ? Math.min(1, Math.max(0, Number(settings.soundVolume)))
          : DEFAULT_CHAT_SETTINGS.soundVolume
      }
    });
  } catch (err: any) {
    console.error('Error in GET /api/widgets/chat:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawToken = body.token || body.streamerToken || null;
    const action = body.action || 'save_settings';

    const {
      streamer,
      activeToken,
      streamerId,
      streamerUsername,
      isPro
    } = await resolveStreamerContext(req, rawToken);

    // Verify streamer has Pro plan active before configuring or broadcasting
    if (!isPro) {
      const verification = await verifyProStreamerByToken(activeToken);
      if (!verification.isPro) {
        return NextResponse.json(
          {
            success: false,
            isLocked: true,
            error: 'Pro plan required to configure or broadcast to Live Chat overlay.'
          },
          { status: 403 }
        );
      }
    }

    const io = getIO();
    const col = await getStreamChatSettingsCollection();
    const usersCol = await getUsersCollection();

    // 0. Toggle YouTube Live Chat listener
    if (action === 'start_listener') {
      const youtubeUrl = body.youtubeUrl || streamer?.liveStreamUrl;
      if (!youtubeUrl) {
        return NextResponse.json({ success: false, error: 'YouTube Live Stream URL is required' }, { status: 400 });
      }
      try {
        youtubeChatService.startListener(activeToken, youtubeUrl);
        if (rawToken && rawToken !== activeToken) {
          youtubeChatService.startListener(rawToken, youtubeUrl);
        }

        // Persist youtubeUrl to both chat settings and user's profile
        await col.updateOne(
          { $or: [{ streamerToken: activeToken }, ...(streamerId ? [{ streamerId }] : [])] },
          {
            $set: {
              streamerToken: activeToken,
              streamerId: streamerId || undefined,
              username: streamerUsername || undefined,
              youtubeUrl,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );

        if (streamer?._id) {
          await usersCol.updateOne(
            { _id: streamer._id },
            { $set: { liveStreamUrl: youtubeUrl, updatedAt: new Date() } }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'YouTube Live Chat listener started',
          isListening: true,
          activeVideoId: youtubeChatService.getActiveVideoId(activeToken)
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
    }

    if (action === 'stop_listener') {
      youtubeChatService.stopListener(activeToken);
      if (rawToken && rawToken !== activeToken) {
        youtubeChatService.stopListener(rawToken);
      }
      return NextResponse.json({ success: true, message: 'YouTube Live Chat listener stopped', isListening: false });
    }

    // 1. Simulation / Test Message broadcast to OBS overlay
    if (action === 'test_message') {
      const sampleNames = ['NeonSamurai', 'DaraGamer', 'SokhaAce', 'PixelQueen', 'KompongChamp', 'CyberFan99'];
      const sampleMessages = [
        'Hype stream! Let’s go! 🔥🚀',
        'Loving this clean live chat overlay! GG!',
        'Top tier stream quality today! 💯',
        'Just shared the stream with the squad! ✨',
        'Insane gameplay! Keep rocking!',
        'StreamBotKH is smooth as butter ⚡'
      ];
      const randIdx = Math.floor(Math.random() * sampleNames.length);
      const authorName = body.author || sampleNames[randIdx];
      let assignedBadge = body.badge !== undefined ? body.badge : (randIdx % 2 === 0 ? 'VIP' : 'MOD');
      let badgeColor = body.badgeColor;
      let badgeBg = body.badgeBg;
      let badgeBorder = body.badgeBorder;
      let badgeIcon = body.badgeIcon;
      let badgeGifUrl = body.badgeGifUrl || body.badgeImage;
      let badgeImage = body.badgeImage || body.badgeGifUrl;

      try {
        const subCol = await getSubscribersCollection();
        const activeSub = await subCol.findOne({
          streamerToken: (rawToken && rawToken !== activeToken) ? ({ $in: [activeToken, rawToken] } as any) : activeToken,
          status: 'active',
          expiresAt: { $gt: new Date() },
          ...buildSubscriberUsernameQuery(authorName)
        });

        if (activeSub) {
          assignedBadge = activeSub.badgeText;
          badgeColor = activeSub.badgeColor;
          badgeBg = activeSub.badgeBg;
          badgeBorder = activeSub.badgeBorder;
          badgeIcon = activeSub.badgeIcon;
          badgeGifUrl = activeSub.badgeGifUrl || activeSub.badgeImage;
          badgeImage = activeSub.badgeImage || activeSub.badgeGifUrl;
        }
      } catch (e) {
        // Fallback gracefully
      }

      const testMsg = {
        id: 'test_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        author: authorName,
        message: body.message || sampleMessages[randIdx],
        avatar: body.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorName)}`,
        badge: assignedBadge,
        badgeColor,
        badgeBg,
        badgeBorder,
        badgeIcon,
        badgeGifUrl,
        badgeImage,
        platform: body.platform || 'youtube',
        isTest: true,
        timestamp: Date.now()
      };

      if (io) {
        broadcastToAllStreamerRooms(activeToken, 'chat:message', testMsg);
        if (rawToken && rawToken !== activeToken) {
          broadcastToAllStreamerRooms(rawToken, 'chat:message', testMsg);
        }
        io.to('overlay:demo-token').emit('chat:message', testMsg);
      }

      return NextResponse.json({
        success: true,
        message: 'Test message broadcasted to Live Chat overlay',
        chatMessage: testMsg
      });
    }

    // 2. Save Settings: Find existing settings document to preserve identity & avoid overwriting empty fields
    const queryConditions: any[] = [
      { streamerToken: activeToken }
    ];
    if (rawToken && rawToken !== activeToken) {
      queryConditions.push({ streamerToken: rawToken });
    }
    if (streamerId) {
      queryConditions.push({ streamerId }, { userId: streamerId });
    }
    if (streamerUsername) {
      queryConditions.push({ username: streamerUsername });
    }

    const existingSettings = await col.findOne({ $or: queryConditions }) as any;

    // Preserve existing youtubeUrl if body does not supply a new valid one
    const preservedYoutubeUrl = (body.youtubeUrl !== undefined && String(body.youtubeUrl).trim() !== '')
      ? String(body.youtubeUrl).trim()
      : (existingSettings?.youtubeUrl || streamer?.liveStreamUrl || '');

    const updatedSettings = {
      streamerToken: activeToken,
      streamerId: streamerId || existingSettings?.streamerId || undefined,
      username: streamerUsername || existingSettings?.username || undefined,
      theme: body.theme || existingSettings?.theme || DEFAULT_CHAT_SETTINGS.theme,
      fontFamily: body.fontFamily || existingSettings?.fontFamily || DEFAULT_CHAT_SETTINGS.fontFamily,
      authorFontFamily: body.authorFontFamily || existingSettings?.authorFontFamily || body.fontFamily || DEFAULT_CHAT_SETTINGS.authorFontFamily,
      messageFontFamily: body.messageFontFamily || existingSettings?.messageFontFamily || body.fontFamily || DEFAULT_CHAT_SETTINGS.messageFontFamily,
      fontSize: body.fontSize || existingSettings?.fontSize || DEFAULT_CHAT_SETTINGS.fontSize,
      lineStyle: ['inline', 'indented', 'stacked'].includes(body.lineStyle)
        ? body.lineStyle
        : (existingSettings?.lineStyle || DEFAULT_CHAT_SETTINGS.lineStyle),
      authorColor: body.authorColor || existingSettings?.authorColor || DEFAULT_CHAT_SETTINGS.authorColor,
      messageColor: body.messageColor || existingSettings?.messageColor || DEFAULT_CHAT_SETTINGS.messageColor,
      backgroundColor: body.backgroundColor || existingSettings?.backgroundColor || DEFAULT_CHAT_SETTINGS.backgroundColor,
      backgroundOpacity: body.backgroundOpacity !== undefined
        ? Number(body.backgroundOpacity)
        : (existingSettings?.backgroundOpacity ?? DEFAULT_CHAT_SETTINGS.backgroundOpacity),
      animationStyle: body.animationStyle || existingSettings?.animationStyle || DEFAULT_CHAT_SETTINGS.animationStyle,
      overlayWidth: Math.min(1920, Math.max(0, Number(body.overlayWidth ?? existingSettings?.overlayWidth ?? DEFAULT_CHAT_SETTINGS.overlayWidth))),
      overlayHeight: Math.min(1440, Math.max(0, Number(body.overlayHeight ?? existingSettings?.overlayHeight ?? DEFAULT_CHAT_SETTINGS.overlayHeight))),
      showBadges: body.showBadges !== undefined ? Boolean(body.showBadges) : (existingSettings?.showBadges !== false),
      showAvatars: body.showAvatars !== undefined ? Boolean(body.showAvatars) : (existingSettings?.showAvatars !== false),
      showTimestamp: body.showTimestamp !== undefined ? Boolean(body.showTimestamp) : Boolean(existingSettings?.showTimestamp),
      fadeDuration: Number(body.fadeDuration ?? existingSettings?.fadeDuration ?? DEFAULT_CHAT_SETTINGS.fadeDuration),
      messageDelay: Math.min(60, Math.max(0, Number(body.messageDelay ?? existingSettings?.messageDelay ?? 0))),
      maxMessages: Math.min(30, Math.max(3, Number(body.maxMessages ?? existingSettings?.maxMessages ?? 10))),
      textBorderWidth: Math.min(4, Math.max(0, Number(body.textBorderWidth ?? existingSettings?.textBorderWidth ?? DEFAULT_CHAT_SETTINGS.textBorderWidth))),
      textBorderColor: body.textBorderColor ? String(body.textBorderColor).trim() : (existingSettings?.textBorderColor || DEFAULT_CHAT_SETTINGS.textBorderColor),
      textShadowStyle: ['none', 'soft', 'strong', 'glow', 'custom'].includes(body.textShadowStyle)
        ? body.textShadowStyle
        : (existingSettings?.textShadowStyle || DEFAULT_CHAT_SETTINGS.textShadowStyle),
      textShadowColor: body.textShadowColor ? String(body.textShadowColor).trim() : (existingSettings?.textShadowColor || DEFAULT_CHAT_SETTINGS.textShadowColor),
      textShadowBlur: Math.min(20, Math.max(0, Number(body.textShadowBlur ?? existingSettings?.textShadowBlur ?? DEFAULT_CHAT_SETTINGS.textShadowBlur))),
      soundEnabled: body.soundEnabled !== undefined ? Boolean(body.soundEnabled) : (existingSettings?.soundEnabled !== false),
      soundUrl: body.soundUrl ? String(body.soundUrl).trim() : (existingSettings?.soundUrl || DEFAULT_CHAT_SETTINGS.soundUrl),
      soundVolume: body.soundVolume !== undefined && !isNaN(Number(body.soundVolume))
        ? Math.min(1, Math.max(0, Number(body.soundVolume)))
        : (existingSettings?.soundVolume ?? DEFAULT_CHAT_SETTINGS.soundVolume),
      youtubeUrl: preservedYoutubeUrl,
      updatedAt: new Date()
    };

    // Upsert into stream_chat_settings
    const filter = existingSettings?._id
      ? { _id: existingSettings._id }
      : { streamerToken: activeToken };

    await col.updateOne(
      filter,
      { $set: updatedSettings },
      { upsert: true }
    );

    // If a new youtubeUrl was provided, also synchronize user's liveStreamUrl
    if (body.youtubeUrl && String(body.youtubeUrl).trim() !== '' && streamer?._id) {
      await usersCol.updateOne(
        { _id: streamer._id },
        { $set: { liveStreamUrl: String(body.youtubeUrl).trim(), updatedAt: new Date() } }
      ).catch(() => {});
    }

    // Synchronize to all overlay and dashboard preview rooms in real time
    if (io) {
      broadcastToAllStreamerRooms(activeToken, 'chat:settings_updated', updatedSettings);
      io.to(`overlay:${activeToken}`).emit('chat:settings_updated', updatedSettings);
      if (rawToken && rawToken !== activeToken) {
        broadcastToAllStreamerRooms(rawToken, 'chat:settings_updated', updatedSettings);
        io.to(`overlay:${rawToken}`).emit('chat:settings_updated', updatedSettings);
      }
      io.to('overlay:demo-token').emit('chat:settings_updated', updatedSettings);
    }

    return NextResponse.json({
      success: true,
      message: 'Live Chat settings saved and synchronized to overlay',
      settings: updatedSettings
    });
  } catch (err: any) {
    console.error('Error in POST /api/widgets/chat:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
