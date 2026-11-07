import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import {
  getUsersCollection,
  getVideoAlertSettingsCollection,
  getOverlaysCollection
} from '@/server/database/mongo';

export const dynamic = 'force-dynamic';

async function resolveStreamerMongo(req: NextRequest, bodyToken?: string) {
  const usersCol = await getUsersCollection();
  const { searchParams } = new URL(req.url);
  const explicitUsername = searchParams.get('username') || '';

  if (explicitUsername) {
    try {
      const escaped = String(explicitUsername).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const streamer = await usersCol.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
          { userId: explicitUsername },
          { id: explicitUsername as any }
        ]
      });
      if (streamer) {
        const sId = streamer.userId || (streamer as any).id || String(streamer._id);
        return {
          streamerId: sId,
          username: streamer.username,
          overlayToken: streamer.overlayToken || streamer.overlay_token,
          mongoUser: streamer
        };
      }
    } catch (e) {}
  }

  const authUser = getAuthenticatedUser(req);

  if (authUser) {
    const mongoUser = await usersCol.findOne({
      $or: [
        { userId: authUser.id },
        { id: authUser.id as any },
        { _id: authUser.id as any },
        ...(authUser.email ? [{ email: authUser.email }] : []),
        ...(authUser.username ? [{ username: authUser.username }] : [])
      ]
    });

    if (mongoUser) {
      const sId = mongoUser.userId || (mongoUser as any).id || String(mongoUser._id);
      return {
        streamerId: sId,
        username: mongoUser.username,
        overlayToken: mongoUser.overlayToken || mongoUser.overlay_token,
        mongoUser
      };
    }

    return {
      streamerId: authUser.id,
      username: authUser.username,
      overlayToken: undefined,
      mongoUser: null
    };
  }

  const token = searchParams.get('token') || bodyToken || '';

  if (token) {
    try {
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
        const sId = streamer.userId || (streamer as any).id || String(streamer._id);
        return {
          streamerId: sId,
          username: streamer.username,
          overlayToken: streamer.overlayToken || streamer.overlay_token,
          mongoUser: streamer
        };
      }
    } catch (e) {}
  }

  return {
    streamerId: 'demo-streamer-id-1001',
    username: 'streamer',
    overlayToken: 'ovl_3223c099b5884ff788670103',
    mongoUser: null
  };
}

export async function GET(req: NextRequest) {
  try {
    const { streamerId, username, mongoUser } = await resolveStreamerMongo(req);

    const videoCol = await getVideoAlertSettingsCollection();
    const docs = await videoCol
      .find({
        $or: [
          { streamerId },
          { streamer_id: streamerId as any },
          ...(mongoUser?._id ? [{ streamerId: String(mongoUser._id) }] : []),
          ...(username
            ? [
                { streamerId: username },
                { streamer_id: username as any }
              ]
            : [])
        ]
      })
      .sort({ updatedAt: -1 })
      .limit(1)
      .toArray();
    let doc = docs[0] || null;

    if (!doc) {
      const defaultDoc = {
        streamerId,
        isEnabled: false,
        minTipAmount: 2.0,
        maxDurationSeconds: 30,
        videoVolume: 85,
        autoDucking: true,
        headerColor: '#00F0FF',
        headerBgColor: 'rgba(2, 6, 23, 0.95)',
        footerColor: '#FFFFFF',
        footerBgColor: 'rgba(0, 0, 0, 0.90)',
        headerTextAlign: 'left',
        footerTextAlign: 'left',
        autoPlay: true,
        showProgressBar: true,
        allowViewerControl: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await videoCol.insertOne(defaultDoc);
      doc = defaultDoc as any;
    }

    return NextResponse.json({
      success: true,
      settings: {
        streamerId,
        isEnabled: Boolean(doc?.isEnabled ?? (doc as any)?.is_enabled ?? false),
        minTipAmount: Number(doc?.minTipAmount ?? (doc as any)?.min_tip_amount ?? 2.0),
        maxDurationSeconds: Number(doc?.maxDurationSeconds ?? (doc as any)?.max_duration_seconds ?? 30),
        videoVolume: Number((doc as any)?.videoVolume ?? (doc as any)?.video_volume ?? 85),
        autoDucking: Boolean((doc as any)?.autoDucking ?? (doc as any)?.auto_ducking ?? true),
        headerColor: String((doc as any)?.headerColor ?? '#00F0FF'),
        headerBgColor: String((doc as any)?.headerBgColor ?? 'rgba(2, 6, 23, 0.95)'),
        footerColor: String((doc as any)?.footerColor ?? '#FFFFFF'),
        footerBgColor: String((doc as any)?.footerBgColor ?? 'rgba(0, 0, 0, 0.90)'),
        headerTextAlign: (['left', 'center', 'justify', 'right'].includes((doc as any)?.headerTextAlign) ? (doc as any).headerTextAlign : 'left') as 'left' | 'center' | 'justify' | 'right',
        footerTextAlign: (['left', 'center', 'justify', 'right'].includes((doc as any)?.footerTextAlign) ? (doc as any).footerTextAlign : 'left') as 'left' | 'center' | 'justify' | 'right'
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
    const { streamerId, username, overlayToken } = await resolveStreamerMongo(req, body.token);

    const isEnabled = body.isEnabled !== undefined ? Boolean(body.isEnabled) : false;
    const rawMinTip = body.minTipAmount !== undefined ? Number(body.minTipAmount) : 2.0;
    const minTipAmount = Math.max(0.25, Math.min(50.0, isNaN(rawMinTip) ? 2.0 : rawMinTip));

    const rawMaxDuration = body.maxDurationSeconds !== undefined ? Number(body.maxDurationSeconds) : 30;
    const maxDurationSeconds = Math.max(10, Math.min(300, isNaN(rawMaxDuration) ? 30 : rawMaxDuration));

    const rawVolume = body.videoVolume !== undefined ? Number(body.videoVolume) : 85;
    const videoVolume = Math.max(0, Math.min(100, isNaN(rawVolume) ? 85 : rawVolume));

    const autoDucking = body.autoDucking !== undefined ? Boolean(body.autoDucking) : true;

    const validAligns = ['left', 'center', 'justify', 'right'] as const;
    const headerColor = typeof body.headerColor === 'string' && body.headerColor.trim() ? body.headerColor.trim() : '#00F0FF';
    const headerBgColor = typeof body.headerBgColor === 'string' && body.headerBgColor.trim() ? body.headerBgColor.trim() : 'rgba(2, 6, 23, 0.95)';
    const footerColor = typeof body.footerColor === 'string' && body.footerColor.trim() ? body.footerColor.trim() : '#FFFFFF';
    const footerBgColor = typeof body.footerBgColor === 'string' && body.footerBgColor.trim() ? body.footerBgColor.trim() : 'rgba(0, 0, 0, 0.90)';
    const headerTextAlign = validAligns.includes(body.headerTextAlign) ? body.headerTextAlign : 'left';
    const footerTextAlign = validAligns.includes(body.footerTextAlign) ? body.footerTextAlign : 'left';

    const now = new Date();
    const videoCol = await getVideoAlertSettingsCollection();

    // 1. Upsert into video_alert_settings collection (update all matching docs to avoid stale duplicates)
    const filter = {
      $or: [
        { streamerId },
        { streamer_id: streamerId as any },
        ...(username ? [{ streamerId: username }, { streamer_id: username as any }] : [])
      ]
    };
    const updatePayload = {
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
      headerColor,
      headerBgColor,
      footerColor,
      footerBgColor,
      headerTextAlign,
      footerTextAlign,
      updatedAt: now
    };
    const updateRes = await videoCol.updateMany(filter, { $set: updatePayload });
    if (updateRes.matchedCount === 0) {
      await videoCol.insertOne({
        ...updatePayload,
        createdAt: now
      } as any);
    }

    // 2. Update users collection so the public donation page instantly gets updated constraints
    try {
      const usersCol = await getUsersCollection();
      await usersCol.updateOne(
        {
          $or: [
            { userId: streamerId },
            { _id: streamerId as any },
            ...(username ? [{ username }] : [])
          ]
        },
        {
          $set: {
            videoAlertEnabled: isEnabled,
            videoMinTipAmount: minTipAmount,
            videoMaxDurationSeconds: maxDurationSeconds,
            updatedAt: now
          }
        }
      );
    } catch (e) {}

    // 3. Update overlays collection so OBS browser sources instantly receive latest configs
    try {
      const overlaysCol = await getOverlaysCollection();
      await overlaysCol.updateMany(
        {
          $or: [
            { streamerId },
            ...(username ? [{ streamerId: username }] : []),
            ...(overlayToken ? [{ overlayToken }] : [])
          ]
        },
        {
          $set: {
            videoAlertEnabled: isEnabled,
            videoMinTipAmount: minTipAmount,
            videoMaxDurationSeconds: maxDurationSeconds,
            videoVolume: videoVolume,
            videoHeaderColor: headerColor,
            videoHeaderBgColor: headerBgColor,
            videoFooterColor: footerColor,
            videoFooterBgColor: footerBgColor,
            videoHeaderTextAlign: headerTextAlign,
            videoFooterTextAlign: footerTextAlign,
            updatedAt: now
          }
        }
      );
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Video alert settings saved successfully',
      settings: {
        streamerId,
        isEnabled,
        minTipAmount,
        maxDurationSeconds,
        videoVolume,
        autoDucking,
        headerColor,
        headerBgColor,
        footerColor,
        footerBgColor,
        headerTextAlign,
        footerTextAlign
      }
    });
  } catch (err: any) {
    console.error('Error in POST /api/streamer/settings/video:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
