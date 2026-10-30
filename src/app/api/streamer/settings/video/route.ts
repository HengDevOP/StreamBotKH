import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getUsersCollection, getVideoAlertSettingsCollection } from '@/server/database/mongo';

export const dynamic = 'force-dynamic';

async function resolveStreamerMongo(req: NextRequest, bodyToken?: string) {
  const user = getAuthenticatedUser(req);
  if (user) {
    return { streamerId: user.id, overlayToken: (user as any).overlay_token || (user as any).overlayToken };
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || bodyToken || searchParams.get('username') || '';

  if (token) {
    try {
      const usersCol = await getUsersCollection();
      const escaped = String(token).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const streamer = await usersCol.findOne({
        $or: [
          { overlayToken: token },
          { overlay_token: token },
          { userId: token },
          { id: token as any },
          { username: { $regex: new RegExp(`^${escaped}$`, 'i') } }
        ]
      });

      if (streamer) {
        return {
          streamerId: streamer.userId || (streamer as any).id || String(streamer._id),
          overlayToken: streamer.overlayToken || streamer.overlay_token
        };
      }
    } catch (e) {}
  }

  return { streamerId: 'demo-streamer-id-1001', overlayToken: 'ovl_3223c099b5884ff788670103' };
}

export async function GET(req: NextRequest) {
  try {
    const { streamerId } = await resolveStreamerMongo(req);

    const videoCol = await getVideoAlertSettingsCollection();
    let doc = await videoCol.findOne({
      $or: [{ streamerId }, { streamer_id: streamerId as any }]
    });

    if (!doc) {
      await videoCol.insertOne({
        streamerId,
        isEnabled: false,
        minTipAmount: 2.0,
        maxDurationSeconds: 30,
        autoPlay: true,
        showProgressBar: true,
        allowViewerControl: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      doc = await videoCol.findOne({ streamerId });
    }

    return NextResponse.json({
      success: true,
      settings: {
        streamerId,
        isEnabled: Boolean(doc?.isEnabled ?? (doc as any)?.is_enabled ?? false),
        minTipAmount: Number(doc?.minTipAmount ?? (doc as any)?.min_tip_amount ?? 2.0),
        maxDurationSeconds: Number(doc?.maxDurationSeconds ?? (doc as any)?.max_duration_seconds ?? 30),
        videoVolume: Number((doc as any)?.videoVolume ?? (doc as any)?.video_volume ?? 85),
        autoDucking: Boolean((doc as any)?.autoDucking ?? (doc as any)?.auto_ducking ?? true)
      }
    });
  } catch (err: any) {
    console.error('Error in GET /api/streamer/settings/video:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { streamerId } = await resolveStreamerMongo(req, body.token);

    const isEnabled = body.isEnabled !== undefined ? Boolean(body.isEnabled) : false;
    const rawMinTip = body.minTipAmount !== undefined ? Number(body.minTipAmount) : 2.0;
    const minTipAmount = Math.max(0.25, Math.min(50.0, isNaN(rawMinTip) ? 2.0 : rawMinTip));

    const rawMaxDuration = body.maxDurationSeconds !== undefined ? Number(body.maxDurationSeconds) : 30;
    const maxDurationSeconds = Math.max(10, Math.min(300, isNaN(rawMaxDuration) ? 30 : rawMaxDuration));

    const rawVolume = body.videoVolume !== undefined ? Number(body.videoVolume) : 85;
    const videoVolume = Math.max(0, Math.min(100, isNaN(rawVolume) ? 85 : rawVolume));

    const autoDucking = body.autoDucking !== undefined ? Boolean(body.autoDucking) : true;

    const now = new Date();
    const videoCol = await getVideoAlertSettingsCollection();
    await videoCol.updateOne(
      { streamerId },
      {
        $set: {
          streamerId,
          isEnabled,
          is_enabled: isEnabled ? 1 : 0,
          minTipAmount,
          min_tip_amount: minTipAmount,
          maxDurationSeconds,
          max_duration_seconds: maxDurationSeconds,
          videoVolume,
          video_volume: videoVolume,
          autoDucking,
          auto_ducking: autoDucking ? 1 : 0,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Video alert settings saved successfully',
      settings: {
        streamerId,
        isEnabled,
        minTipAmount,
        maxDurationSeconds,
        videoVolume,
        autoDucking
      }
    });
  } catch (err: any) {
    console.error('Error in POST /api/streamer/settings/video:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
