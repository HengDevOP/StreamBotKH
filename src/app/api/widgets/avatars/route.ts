import { NextRequest, NextResponse } from 'next/server';
import { getAvatarSettingsCollection } from '@/server/database/mongo';
import { AVATAR_ROSTER } from '@/utils/avatarData';
import { broadcastToAllStreamerRooms, getIO } from '@/server/services/socketService';

export const dynamic = 'force-dynamic';

const DEFAULT_ALLOWED = [
  'cyber-bot',
  'party-parrot',
  'chibi-layla',
  'pusheen-snack',
  'pepe-dance',
  'alien-groove',
  'electric-mouse',
  'shadow-ghost',
  'gamer-layla',
  'pet-pet',
  'cozy-snorlax',
  'mystic-mew'
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';

    const col = await getAvatarSettingsCollection();
    let settings = await col.findOne({ streamerToken: token }) as any;

    if (!settings) {
      settings = {
        streamerToken: token,
        enabled: true,
        defaultAvatarId: 'cyber-bot',
        customAvatarUrl: '',
        customAvatarName: '',
        allowedAvatars: DEFAULT_ALLOWED,
        walkSpeed: 'normal',
        scale: 'medium',
        bubbleDuration: 7,
        maxOnScreen: 10,
        showName: true,
        reactToDonations: true,
        reactToChat: true,
        soundEnabled: true,
        overlayWidth: 1920,
        overlayHeight: 360,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await col.insertOne(settings);
    }

    const allowedList = Array.isArray(settings.allowedAvatars)
      ? settings.allowedAvatars
      : DEFAULT_ALLOWED;

    return NextResponse.json({
      success: true,
      settings: {
        streamerToken: settings.streamerToken || token,
        enabled: settings.enabled !== false,
        defaultAvatarId: settings.defaultAvatarId || 'cyber-bot',
        customAvatarUrl: settings.customAvatarUrl || '',
        customAvatarName: settings.customAvatarName || '',
        allowedAvatars: allowedList,
        walkSpeed: settings.walkSpeed || 'normal',
        scale: settings.scale || 'medium',
        bubbleDuration: settings.bubbleDuration || 7,
        maxOnScreen: settings.maxOnScreen || 10,
        showName: settings.showName !== false,
        reactToDonations: settings.reactToDonations !== false,
        reactToChat: settings.reactToChat !== false,
        soundEnabled: settings.soundEnabled !== false,
        overlayWidth: settings.overlayWidth || 1920,
        overlayHeight: settings.overlayHeight || 360
      },
      roster: AVATAR_ROSTER
    });
  } catch (error: any) {
    console.error('❌ [Avatar Widget API GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.streamerToken || body.token || 'demo-token';
    const action = body.action;
    const col = await getAvatarSettingsCollection();
    const io = getIO();

    // 1. Handle Test Chat Message Action
    if (action === 'test_comment') {
      const author = body.author || 'Viewer' + Math.floor(100 + Math.random() * 900);
      const message = body.message || 'Streamer hype! Let’s go! 🔥';
      const avatarId = body.avatarId || 'cyber-bot';

      const payload = {
        id: 'avatar_test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type: 'chat',
        author,
        message,
        avatarId,
        timestamp: Date.now()
      };

      await broadcastToAllStreamerRooms(token, 'avatar:action', payload);
      await broadcastToAllStreamerRooms(token, 'chat:message', {
        id: payload.id,
        author,
        message,
        platform: 'test',
        timestamp: payload.timestamp
      });

      if (token === 'demo-token' && io) {
        io.to('overlay:demo-token').emit('avatar:action', payload);
        io.to('overlay:demo-token').emit('chat:message', {
          id: payload.id,
          author,
          message,
          platform: 'test',
          timestamp: payload.timestamp
        });
      }

      return NextResponse.json({
        success: true,
        message: `Dispatched test avatar chat from ${author}!`,
        payload
      });
    }

    // 2. Handle Test Donation Action
    if (action === 'test_donation') {
      const donor = body.donor || 'GenerousViewer';
      const amount = Number(body.amount) || 5;
      const currency = body.currency || 'USD';
      const message = body.message || 'Super awesome stream! Keep it up! ❤️';
      const avatarId = body.avatarId || 'cyber-bot';

      const payload = {
        id: 'avatar_don_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type: 'donation',
        donor,
        amount,
        currency,
        message,
        avatarId,
        timestamp: Date.now()
      };

      await broadcastToAllStreamerRooms(token, 'avatar:action', payload);
      await broadcastToAllStreamerRooms(token, 'donation:alert', {
        id: payload.id,
        donorName: donor,
        donor,
        amount,
        currency,
        message,
        isTest: true
      });

      if (token === 'demo-token' && io) {
        io.to('overlay:demo-token').emit('avatar:action', payload);
        io.to('overlay:demo-token').emit('donation:alert', {
          id: payload.id,
          donorName: donor,
          donor,
          amount,
          currency,
          message,
          isTest: true
        });
      }

      return NextResponse.json({
        success: true,
        message: `Dispatched test donation celebration from ${donor}!`,
        payload
      });
    }

    // 3. Save / Update Settings
    const updateData: any = {
      streamerToken: token,
      enabled: body.enabled !== false,
      defaultAvatarId: body.defaultAvatarId || 'cyber-bot',
      customAvatarUrl: body.customAvatarUrl || '',
      customAvatarName: body.customAvatarName || '',
      allowedAvatars: Array.isArray(body.allowedAvatars) ? body.allowedAvatars : DEFAULT_ALLOWED,
      walkSpeed: body.walkSpeed || 'normal',
      scale: body.scale || 'medium',
      bubbleDuration: Number(body.bubbleDuration) || 7,
      maxOnScreen: Number(body.maxOnScreen) || 10,
      showName: body.showName !== false,
      reactToDonations: body.reactToDonations !== false,
      reactToChat: body.reactToChat !== false,
      soundEnabled: body.soundEnabled !== false,
      overlayWidth: Number(body.overlayWidth) || 1920,
      overlayHeight: Number(body.overlayHeight) || 360,
      updatedAt: new Date()
    };

    await col.updateOne(
      { streamerToken: token },
      { $set: updateData },
      { upsert: true }
    );

    // Notify active overlays to refresh settings immediately
    await broadcastToAllStreamerRooms(token, 'avatar:settings_updated', updateData);
    if (token === 'demo-token' && io) {
      io.to('overlay:demo-token').emit('avatar:settings_updated', updateData);
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar widget settings saved successfully',
      settings: updateData
    });
  } catch (error: any) {
    console.error('❌ [Avatar Widget API POST Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
