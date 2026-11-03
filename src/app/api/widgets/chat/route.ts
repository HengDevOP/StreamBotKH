import { NextRequest, NextResponse } from 'next/server';
import { getStreamChatSettingsCollection, getSubscribersCollection, buildSubscriberUsernameQuery } from '@/server/database/mongo';
import { getIO, broadcastToAllStreamerRooms } from '@/server/services/socketService';
import { verifyProStreamerByToken } from '@/server/services/planService';
import { youtubeChatService } from '@/server/services/youtubeChatService';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const DEFAULT_CHAT_SETTINGS = {
  fontFamily: 'Chakra Petch',
  authorFontFamily: 'Chakra Petch',
  messageFontFamily: 'Inter',
  fontSize: 'base',
  lineStyle: 'indented', // 'indented' | 'inline' | 'stacked'
  authorColor: '#00F0FF',
  messageColor: '#FFFFFF',
  animationStyle: 'slide-left',
  overlayWidth: 420,
  overlayHeight: 600,
  showBadges: true,
  showTimestamp: false,
  fadeDuration: 15,
  messageDelay: 0,
  maxMessages: 10,
  textBorderWidth: 0,
  textBorderColor: '#000000',
  textShadowStyle: 'none',
  textShadowColor: 'rgba(0, 0, 0, 0.95)',
  textShadowBlur: 0,
  youtubeUrl: ''
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';

    // Verify streamer has Pro plan active
    const { isPro } = await verifyProStreamerByToken(token);
    if (!isPro) {
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

    const col = await getStreamChatSettingsCollection();
    let settings = await col.findOne({ streamerToken: token }) as any;

    if (!settings) {
      settings = {
        id: uuidv4(),
        streamerToken: token,
        ...DEFAULT_CHAT_SETTINGS,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await col.insertOne(settings);
    }

    return NextResponse.json({
      success: true,
      isListening: youtubeChatService.isListening(token),
      settings: {
        id: settings.id || String(settings._id),
        streamerToken: settings.streamerToken || token,
        fontFamily: settings.fontFamily || DEFAULT_CHAT_SETTINGS.fontFamily,
        authorFontFamily: settings.authorFontFamily || settings.fontFamily || DEFAULT_CHAT_SETTINGS.authorFontFamily,
        messageFontFamily: settings.messageFontFamily || settings.fontFamily || DEFAULT_CHAT_SETTINGS.messageFontFamily,
        fontSize: settings.fontSize || DEFAULT_CHAT_SETTINGS.fontSize,
        lineStyle: settings.lineStyle || DEFAULT_CHAT_SETTINGS.lineStyle,
        authorColor: settings.authorColor || DEFAULT_CHAT_SETTINGS.authorColor,
        messageColor: settings.messageColor || DEFAULT_CHAT_SETTINGS.messageColor,
        animationStyle: settings.animationStyle || DEFAULT_CHAT_SETTINGS.animationStyle,
        overlayWidth: settings.overlayWidth !== undefined && !isNaN(Number(settings.overlayWidth))
          ? Math.max(0, Number(settings.overlayWidth))
          : DEFAULT_CHAT_SETTINGS.overlayWidth,
        overlayHeight: settings.overlayHeight !== undefined && !isNaN(Number(settings.overlayHeight))
          ? Math.max(0, Number(settings.overlayHeight))
          : DEFAULT_CHAT_SETTINGS.overlayHeight,
        showBadges: settings.showBadges !== false,
        showTimestamp: Boolean(settings.showTimestamp),
        fadeDuration: settings.fadeDuration ?? DEFAULT_CHAT_SETTINGS.fadeDuration,
        messageDelay: Number(settings.messageDelay) || 0,
        maxMessages: settings.maxMessages || DEFAULT_CHAT_SETTINGS.maxMessages,
        youtubeUrl: settings.youtubeUrl || '',
        textBorderWidth: settings.textBorderWidth !== undefined ? Number(settings.textBorderWidth) : DEFAULT_CHAT_SETTINGS.textBorderWidth,
        textBorderColor: settings.textBorderColor || DEFAULT_CHAT_SETTINGS.textBorderColor,
        textShadowStyle: settings.textShadowStyle || DEFAULT_CHAT_SETTINGS.textShadowStyle,
        textShadowColor: settings.textShadowColor || DEFAULT_CHAT_SETTINGS.textShadowColor,
        textShadowBlur: settings.textShadowBlur !== undefined ? Number(settings.textShadowBlur) : DEFAULT_CHAT_SETTINGS.textShadowBlur
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
    const token = body.token || body.streamerToken || 'demo-token';
    const action = body.action || 'save_settings';

    // Verify streamer has Pro plan active before configuring or broadcasting
    const { isPro } = await verifyProStreamerByToken(token);
    if (!isPro) {
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          error: 'Pro plan required to configure or broadcast to Live Chat overlay.'
        },
        { status: 403 }
      );
    }

    const io = getIO();

    // 0. Toggle YouTube Live Chat listener
    if (action === 'start_listener') {
      const youtubeUrl = body.youtubeUrl;
      if (!youtubeUrl) {
        return NextResponse.json({ success: false, error: 'YouTube Live Stream URL is required' }, { status: 400 });
      }
      try {
        youtubeChatService.startListener(token, youtubeUrl);
        const col = await getStreamChatSettingsCollection();
        await col.updateOne({ streamerToken: token }, { $set: { youtubeUrl, updatedAt: new Date() } }, { upsert: true });
        return NextResponse.json({
          success: true,
          message: 'YouTube Live Chat listener started',
          isListening: true,
          activeVideoId: youtubeChatService.getActiveVideoId(token)
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
    }

    if (action === 'stop_listener') {
      youtubeChatService.stopListener(token);
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
          streamerToken: token,
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
        broadcastToAllStreamerRooms(token, 'chat:message', testMsg);
        if (token === 'demo-token') {
          io.to('overlay:demo-token').emit('chat:message', testMsg);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Test message broadcasted to Live Chat overlay',
        chatMessage: testMsg
      });
    }

    // 2. Save Settings
    const col = await getStreamChatSettingsCollection();
    const updatedSettings = {
      streamerToken: token,
      fontFamily: body.fontFamily || DEFAULT_CHAT_SETTINGS.fontFamily,
      authorFontFamily: body.authorFontFamily || DEFAULT_CHAT_SETTINGS.authorFontFamily,
      messageFontFamily: body.messageFontFamily || DEFAULT_CHAT_SETTINGS.messageFontFamily,
      fontSize: body.fontSize || DEFAULT_CHAT_SETTINGS.fontSize,
      lineStyle: ['inline', 'indented', 'stacked'].includes(body.lineStyle) ? body.lineStyle : DEFAULT_CHAT_SETTINGS.lineStyle,
      authorColor: body.authorColor || DEFAULT_CHAT_SETTINGS.authorColor,
      messageColor: body.messageColor || DEFAULT_CHAT_SETTINGS.messageColor,
      animationStyle: body.animationStyle || DEFAULT_CHAT_SETTINGS.animationStyle,
      overlayWidth: Math.min(1920, Math.max(0, Number(body.overlayWidth ?? DEFAULT_CHAT_SETTINGS.overlayWidth))),
      overlayHeight: Math.min(1440, Math.max(0, Number(body.overlayHeight ?? DEFAULT_CHAT_SETTINGS.overlayHeight))),
      showBadges: body.showBadges !== false,
      showTimestamp: Boolean(body.showTimestamp),
      fadeDuration: Number(body.fadeDuration ?? DEFAULT_CHAT_SETTINGS.fadeDuration),
      messageDelay: Math.min(60, Math.max(0, Number(body.messageDelay) || 0)),
      maxMessages: Math.min(30, Math.max(3, Number(body.maxMessages) || 10)),
      textBorderWidth: Math.min(4, Math.max(0, Number(body.textBorderWidth ?? DEFAULT_CHAT_SETTINGS.textBorderWidth))),
      textBorderColor: body.textBorderColor ? String(body.textBorderColor).trim() : DEFAULT_CHAT_SETTINGS.textBorderColor,
      textShadowStyle: ['none', 'soft', 'strong', 'glow', 'custom'].includes(body.textShadowStyle) ? body.textShadowStyle : DEFAULT_CHAT_SETTINGS.textShadowStyle,
      textShadowColor: body.textShadowColor ? String(body.textShadowColor).trim() : DEFAULT_CHAT_SETTINGS.textShadowColor,
      textShadowBlur: Math.min(20, Math.max(0, Number(body.textShadowBlur ?? DEFAULT_CHAT_SETTINGS.textShadowBlur))),
      youtubeUrl: body.youtubeUrl ? String(body.youtubeUrl).trim() : '',
      updatedAt: new Date()
    };

    await col.updateOne(
      { streamerToken: token },
      { $set: updatedSettings },
      { upsert: true }
    );

    if (io) {
      io.to(`overlay:${token}`).emit('chat:settings_updated', updatedSettings);
      if (token !== 'demo-token') {
        io.to('overlay:demo-token').emit('chat:settings_updated', updatedSettings);
      }
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
