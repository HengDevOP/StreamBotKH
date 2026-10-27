import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { getOverlaysCollection, OverlayDoc } from '@/server/database/mongo';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';

    const overlaysCol = await getOverlaysCollection();
    const overlays = await overlaysCol.find({ userId }).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({
      success: true,
      overlays
    });
  } catch (err: any) {
    console.error('API /api/overlays GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch overlays' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const userId = authUser?.id || 'demo-streamer-id-1001';

    const body = await req.json();
    const {
      name,
      width = 1080,
      height = 720,
      mediaId,
      mediaUrl,
      soundUrl = '/sounds/neon-chime.mp3',
      soundVolume = 0.85,
      glowColor = '#00F0FF',
      templateStyle = 'neon-box',
      durationSeconds = 8,
      minAmountAlert = 1.0,
      ttsEnabled = true,
      isDefault = false
    } = body;

    const overlayName = (name && typeof name === 'string' && name.trim())
      ? name.trim()
      : `Overlay (${width}x${height})`;

    const overlayToken = `ovl_${uuidv4().replace(/-/g, '')}`;

    const newOverlay: OverlayDoc = {
      userId,
      name: overlayName,
      overlayToken,
      width: Math.max(100, Number(width) || 1080),
      height: Math.max(100, Number(height) || 720),
      mediaId: mediaId || undefined,
      mediaUrl: mediaUrl || 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
      soundUrl,
      soundVolume: Number(soundVolume) || 0.85,
      glowColor: glowColor || '#00F0FF',
      templateStyle: templateStyle || 'neon-box',
      durationSeconds: Number(durationSeconds) || 8,
      minAmountAlert: Number(minAmountAlert) || 1.0,
      ttsEnabled: Boolean(ttsEnabled),
      isDefault: Boolean(isDefault),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const overlaysCol = await getOverlaysCollection();
    const result = await overlaysCol.insertOne(newOverlay);

    return NextResponse.json({
      success: true,
      message: 'Overlay created successfully!',
      overlay: {
        ...newOverlay,
        _id: result.insertedId
      }
    });
  } catch (err: any) {
    console.error('API /api/overlays POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create overlay' },
      { status: 500 }
    );
  }
}
