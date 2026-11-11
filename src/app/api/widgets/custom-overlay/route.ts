import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/server/services/socketService';
import { v4 as uuidv4 } from 'uuid';
import {
  getUsersCollection,
  getOverlayTokenHistoryCollection,
  getCustomOverlaysCollection,
  getStreamGoalsCollection,
  CustomOverlayDoc
} from '@/server/database/mongo';
import { verifyProStreamerByToken } from '@/server/services/planService';

export const dynamic = 'force-dynamic';

function getDefaultOverlay(token: string, streamerId?: string): CustomOverlayDoc {
  return {
    id: uuidv4(),
    streamerId: streamerId || 'streamer',
    streamerToken: token,
    badgeText: '🔴 LIVE STREAM',
    badgeIcon: 'radio',
    headline: 'Welcome to the Stream! Don’t forget to follow & share!',
    subtext: '💬 Type !socials in chat • 🎁 Support via KHQR / ABA live • ⚡ Daily Gaming & Chill',
    tickerMessages: [
      'Welcome to the Stream! Don’t forget to follow & share!',
      '💬 Type !socials in chat for Discord & Telegram links',
      '🎁 Support via KHQR / ABA live on screen with instant alert',
      '⚡ Daily Gaming, chill vibes & community giveaways'
    ],
    animationFlow: 'marquee',
    animationSpeed: 'normal',
    showGoal: true,
    goalLayout: 'compact-pill',
    customWidth: 1920,
    customHeight: 1080,
    layoutPosition: 'top-ticker',
    fontFamily: 'Inter',
    fontSize: 18,
    textColor: '#FFFFFF',
    accentColor: '#10B981',
    glowColor: '#10B981',
    backgroundColor: 'rgba(11, 15, 25, 0.88)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundStyle: 'glass',
    showBackground: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';

    const { streamerId } = await verifyProStreamerByToken(token);
    const overlayCol = await getCustomOverlaysCollection();
    let overlay = await overlayCol.findOne({ streamerToken: token });

    // Fallback: check historical tokens or streamerId
    if (!overlay && token !== 'demo-token') {
      try {
        const usersCol = await getUsersCollection();
        const histCol = await getOverlayTokenHistoryCollection();

        let userDoc: any = await usersCol.findOne({
          $or: [{ overlayToken: token }, { overlay_token: token } as any]
        });

        if (!userDoc) {
          const hist = await histCol.findOne({ token });
          if (hist?.streamerId) {
            userDoc = await usersCol.findOne({
              $or: [{ userId: hist.streamerId }, { id: hist.streamerId } as any]
            });
          }
        }

        const sId = userDoc?.userId || (userDoc as any)?.id || streamerId;
        if (sId) {
          const histories = await histCol.find({ streamerId: sId }).toArray();
          const candidateTokens = new Set<string>();
          if (userDoc?.overlayToken) candidateTokens.add(userDoc.overlayToken);
          if (userDoc?.overlay_token) candidateTokens.add(userDoc.overlay_token);
          candidateTokens.add(sId);
          for (const h of histories) {
            if (h.token) candidateTokens.add(h.token);
          }

          const tokenList = Array.from(candidateTokens);
          overlay = await overlayCol.findOne({
            $or: [{ streamerId: sId }, { streamerToken: { $in: tokenList } }]
          });

          if (overlay) {
            // Update token to current token
            await overlayCol.updateOne(
              { _id: overlay._id },
              { $set: { streamerToken: token, streamerId: sId, updatedAt: new Date() } }
            );
            overlay.streamerToken = token;
          }
        }
      } catch (err) {
        console.warn('[Custom Overlay] Token recovery lookup warning:', err);
      }
    }

    // If still no overlay, create default
    if (!overlay) {
      const defaultDoc = getDefaultOverlay(token, streamerId || undefined);
      await overlayCol.insertOne(defaultDoc);
      overlay = defaultDoc;
    }

    // Also fetch streamer's active goal if available for one-stop delivery
    let activeGoal: any = null;
    try {
      const goalsCol = await getStreamGoalsCollection();
      const goalDoc = await goalsCol.findOne({
        $or: [{ streamerToken: token }, ...(streamerId ? [{ streamerId }] : [])],
        isActive: true
      });
      if (goalDoc) {
        activeGoal = {
          id: goalDoc.id || String(goalDoc._id),
          title: goalDoc.title || 'Livestream Goal',
          targetAmount: Number(goalDoc.targetAmount ?? (goalDoc as any).target_amount ?? 100),
          currentAmount: Number(goalDoc.currentAmount ?? (goalDoc as any).current_amount ?? 0),
          accentColor: goalDoc.accentColor || (goalDoc as any).accent_color || '#10B981',
          templateStyle: goalDoc.templateStyle || (goalDoc as any).template_style || 'cyber-neon'
        };
      }
    } catch (gErr) {
      console.warn('[Custom Overlay] Goal lookup warning:', gErr);
    }

    return NextResponse.json({
      success: true,
      overlay: {
        id: overlay.id || String(overlay._id),
        streamerToken: overlay.streamerToken,
        badgeText: overlay.badgeText ?? '🔴 LIVE STREAM',
        badgeIcon: overlay.badgeIcon ?? 'radio',
        headline: overlay.headline ?? 'Welcome to the Stream!',
        subtext: overlay.subtext ?? '',
        tickerMessages: overlay.tickerMessages && overlay.tickerMessages.length > 0
          ? overlay.tickerMessages
          : [overlay.headline, overlay.subtext].filter(Boolean),
        animationFlow: overlay.animationFlow || 'marquee',
        animationSpeed: overlay.animationSpeed || 'normal',
        showGoal: overlay.showGoal !== false,
        goalLayout: overlay.goalLayout || 'compact-pill',
        customWidth: Number(overlay.customWidth) || 1920,
        customHeight: Number(overlay.customHeight) || 1080,
        layoutPosition: overlay.layoutPosition || 'top-ticker',
        fontFamily: overlay.fontFamily || 'Inter',
        fontSize: Number(overlay.fontSize) || 18,
        textColor: overlay.textColor || '#FFFFFF',
        accentColor: overlay.accentColor || '#10B981',
        glowColor: overlay.glowColor || '#10B981',
        backgroundColor: overlay.backgroundColor || 'rgba(11, 15, 25, 0.88)',
        borderColor: overlay.borderColor || 'rgba(16, 185, 129, 0.35)',
        backgroundStyle: overlay.backgroundStyle || 'glass',
        showBackground: overlay.showBackground !== false,
        isActive: overlay.isActive !== false
      },
      goal: activeGoal
    });
  } catch (error: any) {
    console.error('Error fetching custom overlay:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch custom overlay' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token || body.streamerToken || 'demo-token';

    const { streamerId } = await verifyProStreamerByToken(token);
    const overlayCol = await getCustomOverlaysCollection();

    const updateDoc: Partial<CustomOverlayDoc> = {
      streamerToken: token,
      badgeText: body.badgeText !== undefined ? String(body.badgeText).trim() : '🔴 LIVE STREAM',
      badgeIcon: body.badgeIcon || 'radio',
      headline: body.headline ? String(body.headline).trim() : 'Welcome to the Stream!',
      subtext: body.subtext !== undefined ? String(body.subtext).trim() : '',
      tickerMessages: Array.isArray(body.tickerMessages) && body.tickerMessages.length > 0
        ? body.tickerMessages.map((m: any) => String(m).trim()).filter(Boolean)
        : [body.headline, body.subtext].filter(Boolean),
      animationFlow: body.animationFlow || 'marquee',
      animationSpeed: body.animationSpeed || 'normal',
      showGoal: body.showGoal !== undefined ? Boolean(body.showGoal) : true,
      goalLayout: body.goalLayout || 'compact-pill',
      customWidth: body.customWidth !== undefined ? Math.max(100, Math.min(3840, Number(body.customWidth))) : 1920,
      customHeight: body.customHeight !== undefined ? Math.max(30, Math.min(2160, Number(body.customHeight))) : 1080,
      layoutPosition: body.layoutPosition || 'top-ticker',
      fontFamily: body.fontFamily || 'Inter',
      fontSize: Number(body.fontSize) || 18,
      textColor: body.textColor || '#FFFFFF',
      accentColor: body.accentColor || '#10B981',
      glowColor: body.glowColor || '#10B981',
      backgroundColor: body.backgroundColor || 'rgba(11, 15, 25, 0.88)',
      borderColor: body.borderColor || 'rgba(16, 185, 129, 0.35)',
      backgroundStyle: body.backgroundStyle || 'glass',
      showBackground: body.showBackground !== false,
      isActive: body.isActive !== false,
      updatedAt: new Date()
    };

    if (streamerId) {
      updateDoc.streamerId = streamerId;
    }

    const existing = await overlayCol.findOne({
      $or: [{ streamerToken: token }, ...(streamerId ? [{ streamerId }] : [])]
    });

    let savedId = existing?.id;
    if (existing) {
      await overlayCol.updateOne(
        { _id: existing._id },
        { $set: updateDoc }
      );
    } else {
      savedId = uuidv4();
      await overlayCol.insertOne({
        ...updateDoc,
        id: savedId,
        createdAt: new Date()
      } as CustomOverlayDoc);
    }

    const fullSaved = {
      ...updateDoc,
      id: savedId,
      streamerToken: token
    };

    // Broadcast update via Socket.IO so OBS updates immediately in real-time
    const io = getIO();
    if (io) {
      io.to(`overlay:${token}`).emit('custom-overlay:update', fullSaved);
      if (token !== 'demo-token') {
        io.to('overlay:demo-token').emit('custom-overlay:update', fullSaved);
      }
    }

    return NextResponse.json({
      success: true,
      overlay: fullSaved
    });
  } catch (error: any) {
    console.error('Error saving custom overlay:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save custom overlay' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
