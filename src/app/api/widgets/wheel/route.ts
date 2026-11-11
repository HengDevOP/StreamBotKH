import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/server/services/socketService';
import { verifyProStreamerByToken } from '@/server/services/planService';
import { getWheelSettingsCollection, getUsersCollection } from '@/server/database/mongo';

export const dynamic = 'force-dynamic';

const DEFAULT_SLICES = [
  { id: '1', label: '1v1 Match', color: '#00F0FF', percentage: 20 },
  { id: '2', label: 'Custom Song', color: '#A855F7', percentage: 20 },
  { id: '3', label: 'Shoutout', color: '#10B981', percentage: 20 },
  { id: '4', label: 'Discord VIP', color: '#F59E0B', percentage: 15 },
  { id: '5', label: 'Wheel Reroll', color: '#EC4899', percentage: 15 },
  { id: '6', label: 'GG Jackpot 👑', color: '#EF4444', percentage: 10 }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';
    const username = searchParams.get('username');

    const usersCol = await getUsersCollection();
    let streamer: any = null;
    if (username) {
      const cleanUsername = username.replace(/^@/, '').trim();
      streamer = await usersCol.findOne({
        username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    } else if (token && token !== 'demo-token') {
      streamer = await usersCol.findOne({
        $or: [{ overlayToken: token }, { overlay_token: token } as any]
      });
    }

    const effectiveToken = streamer?.overlayToken || token;

    const wheelCol = await getWheelSettingsCollection();
    const doc = await wheelCol.findOne({
      $or: [
        { streamerToken: effectiveToken },
        ...(streamer?.username ? [{ streamerUsername: streamer.username }] : [])
      ]
    });

    const settings = {
      isEnabled: doc?.isEnabled ?? false,
      minTipAmount: Number(doc?.minTipAmount) || 2.0,
      spinSoundUrl: doc?.spinSoundUrl || '/sounds/neon-chime.mp3',
      slices: Array.isArray(doc?.slices) && doc.slices.length > 0 ? doc.slices : DEFAULT_SLICES
    };

    return NextResponse.json({
      success: true,
      isLocked: false,
      token: effectiveToken,
      settings
    });
  } catch (err: any) {
    console.error('Error in GET /api/widgets/wheel:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || 'demo-token';

    // Check if this request is saving settings to MongoDB
    if (body.action === 'save_settings' || body.settings || (body.slices && body.totalRotation === undefined)) {
      const wheelCol = await getWheelSettingsCollection();
      const usersCol = await getUsersCollection();
      const user = await usersCol.findOne({
        $or: [{ overlayToken: token }, { overlay_token: token } as any]
      });

      const payload = body.settings || body;
      const isEnabled = Boolean(payload.isEnabled);
      const minTipAmount = Math.max(0.25, Number(payload.minTipAmount) || 2.0);
      const spinSoundUrl = payload.spinSoundUrl || '/sounds/neon-chime.mp3';
      const slices = Array.isArray(payload.slices) && payload.slices.length > 0 ? payload.slices : DEFAULT_SLICES;

      await wheelCol.updateOne(
        { streamerToken: token },
        {
          $set: {
            streamerToken: token,
            streamerUsername: user?.username || payload.streamerUsername,
            isEnabled,
            minTipAmount,
            spinSoundUrl,
            slices,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      const io = getIO();
      if (io) {
        io.to(`overlay:${token}`).emit('wheel:settings_updated', {
          isEnabled,
          minTipAmount,
          spinSoundUrl,
          slices
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Wheel settings saved successfully',
        settings: { isEnabled, minTipAmount, spinSoundUrl, slices }
      });
    }

    // Otherwise, this is a live spin broadcast event
    const io = getIO();
    if (io) {
      io.to(`overlay:${token}`).emit('wheel:spin', body);
      if (token !== 'demo-token') {
        io.to('overlay:demo-token').emit('wheel:spin', body);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Wheel spin broadcasted to OBS overlay'
    });
  } catch (err: any) {
    console.error('Error in POST /api/widgets/wheel:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
