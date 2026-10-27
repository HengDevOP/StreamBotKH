import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/server/services/socketService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token || 'demo-token';
    const action = body.action || 'play'; // 'play' | 'stop'

    const io = getIO();
    if (!io) {
      return NextResponse.json({ success: false, error: 'Socket server not ready' }, { status: 503 });
    }

    if (action === 'stop') {
      io.to(`overlay:${token}`).emit('soundboard:stop', { token });
      if (token !== 'demo-token') {
        io.to('overlay:demo-token').emit('soundboard:stop', { token });
      }
      return NextResponse.json({ success: true, action: 'stop' });
    }

    const payload = {
      token,
      soundId: body.soundId || 'sound-default',
      title: body.title || 'Sound Effect',
      category: body.category || 'Memes',
      soundUrl: body.soundUrl || 'synth:airhorn',
      volume: body.volume ?? 0.8,
      masterVolume: body.masterVolume ?? 0.8,
      color: body.color || '#00F0FF',
      iconName: body.iconName || 'Volume2',
      durationSeconds: body.durationSeconds ?? 2.0,
      showVisualAlert: body.showVisualAlert !== undefined ? body.showVisualAlert : true,
      timestamp: Date.now()
    };

    io.to(`overlay:${token}`).emit('soundboard:play', payload);
    if (token !== 'demo-token') {
      io.to('overlay:demo-token').emit('soundboard:play', payload);
    }

    return NextResponse.json({ success: true, payload });
  } catch (error: any) {
    console.error('[API /api/soundboard/play] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to trigger sound' },
      { status: 500 }
    );
  }
}
