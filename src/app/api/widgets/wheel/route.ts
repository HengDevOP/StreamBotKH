import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/server/services/socketService';
import { verifyProStreamerByToken } from '@/server/services/planService';

export const dynamic = 'force-dynamic';

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
          error: 'Pro plan required for Spinning Wheels widget.',
          wheel: null
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      isLocked: false,
      token
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

    // Verify streamer has Pro plan active before broadcasting to overlay
    const { isPro } = await verifyProStreamerByToken(token);
    if (!isPro) {
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          error: 'Pro plan required to configure or broadcast to Spinning Wheels overlay.'
        },
        { status: 403 }
      );
    }

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
