import { NextRequest, NextResponse } from 'next/server';
import {
  getWheelSettingsCollection,
  getUsersCollection
} from '@/server/database/mongo';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    if (!username) {
      return NextResponse.json({ success: false, error: 'Username required' }, { status: 400 });
    }

    const cleanUsername = username.replace(/^@/, '').trim();
    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({
      username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Streamer not found' }, { status: 404 });
    }

    const wheelCol = await getWheelSettingsCollection();
    const settings = await wheelCol.findOne({
      $or: [
        { streamerUsername: user.username },
        ...(user.overlayToken ? [{ streamerToken: user.overlayToken }] : [])
      ]
    });

    return NextResponse.json({
      success: true,
      isEnabled: Boolean(settings?.isEnabled),
      minTipAmount: Number(settings?.minTipAmount) || 2.0,
      spinSoundUrl: settings?.spinSoundUrl || '/sounds/neon-chime.mp3',
      slices: Array.isArray(settings?.slices) ? settings.slices : []
    });
  } catch (error: any) {
    console.error('Failed to fetch public wheel settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
