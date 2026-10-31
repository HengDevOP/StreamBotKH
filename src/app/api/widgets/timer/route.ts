import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/server/services/socketService';
import { v4 as uuidv4 } from 'uuid';
import { getUsersCollection, getOverlayTokenHistoryCollection, getStreamTimersCollection } from '@/server/database/mongo';

export const dynamic = 'force-dynamic';

const isBool = (val: any, defaultVal = true): boolean => {
  if (val === undefined || val === null) return defaultVal;
  if (val === false || val === 0 || val === '0' || val === 'false') return false;
  return true;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';

    const timersCol = await getStreamTimersCollection();
    let timer = await timersCol.findOne({ streamerToken: token }) as any;

    if (!timer && token !== 'demo-token') {
      try {
        const usersCol = await getUsersCollection();
        const histCol = await getOverlayTokenHistoryCollection();
        let streamer: any = await usersCol.findOne({
          $or: [{ overlayToken: token }, { overlay_token: token } as any]
        });
        if (!streamer) {
          const hist = await histCol.findOne({ token });
          if (hist?.streamerId) {
            streamer = await usersCol.findOne({
              $or: [{ userId: hist.streamerId }, { id: hist.streamerId } as any]
            });
          }
        }
        const sId = streamer?.userId || (streamer as any)?.id;
        if (sId) {
          const histories = await histCol.find({ streamerId: sId }).toArray();
          const candidateTokens = new Set<string>();
          if (streamer.overlayToken) candidateTokens.add(streamer.overlayToken);
          if (streamer.overlay_token) candidateTokens.add(streamer.overlay_token);
          candidateTokens.add(sId);
          for (const h of histories) {
            if (h.token) candidateTokens.add(h.token);
          }
          const tokenList = Array.from(candidateTokens);
          const existingTimer = await timersCol.findOne({
            $or: [
              { streamerId: sId },
              { streamerToken: { $in: tokenList } }
            ]
          }) as any;

          if (existingTimer) {
            await timersCol.updateOne(
              { _id: existingTimer._id },
              { $set: { streamerToken: token, streamerId: sId, lastUpdatedAt: new Date() } }
            );
            timer = await timersCol.findOne({ streamerToken: token }) as any;
          }
        }
      } catch (e) {}
    }

    if (!timer) {
      const newId = uuidv4();
      const defaultDoc = {
        id: newId,
        streamerToken: token,
        title: 'SUBATHON COUNTDOWN 🔥',
        remainingSeconds: 7200,
        initialSeconds: 7200,
        rateMinutesPerUsd: 10.0,
        rateMinutesPerKhr: 10.0,
        isRunning: true,
        glowColor: '#00F0FF',
        fontFamily: 'Chakra Petch',
        layoutMode: 'neon',
        templateStyle: 'cyber-neon',
        showBackground: true,
        showAnimation: true,
        showTitle: true,
        showDescription: true,
        description: '',
        soundEnabled: true,
        maxCapSeconds: 86400,
        lastUpdatedAt: new Date()
      };
      await timersCol.insertOne(defaultDoc);
      timer = defaultDoc;
    } else if (timer.isRunning || timer.is_running === 1) {
      const lastUpdated = new Date(timer.lastUpdatedAt || timer.last_updated_at || Date.now()).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((now - lastUpdated) / 1000));

      if (elapsedSeconds > 0) {
        const curRemaining = timer.remainingSeconds ?? timer.remaining_seconds ?? 7200;
        const newRemaining = Math.max(0, curRemaining - elapsedSeconds);
        await timersCol.updateOne(
          { _id: timer._id },
          { $set: { remainingSeconds: newRemaining, lastUpdatedAt: new Date() } }
        );
        timer.remainingSeconds = newRemaining;
      }
    }

    return NextResponse.json({
      success: true,
      timer: {
        id: timer.id || String(timer._id),
        token: timer.streamerToken || timer.streamer_token,
        title: timer.title,
        remainingSeconds: timer.remainingSeconds ?? timer.remaining_seconds ?? 7200,
        initialSeconds: timer.initialSeconds ?? timer.initial_seconds ?? 7200,
        rateMinutesPerUsd: timer.rateMinutesPerUsd ?? timer.rate_minutes_per_usd ?? 10.0,
        rateMinutesPerKhr: timer.rateMinutesPerKhr ?? timer.rate_minutes_per_khr ?? 10.0,
        isRunning: Boolean(timer.isRunning ?? (timer.is_running === 1)),
        glowColor: timer.glowColor || timer.glow_color || '#00F0FF',
        fontFamily: timer.fontFamily || timer.font_family || 'Chakra Petch',
        layoutMode: timer.layoutMode || timer.layout_mode || 'neon',
        templateStyle: timer.templateStyle || timer.template_style || timer.layoutMode || 'cyber-neon',
        showBackground: isBool(timer.showBackground ?? timer.show_background, true),
        showAnimation: isBool(timer.showAnimation ?? timer.show_animation, true),
        showTitle: isBool(timer.showTitle ?? timer.show_title, true),
        showDescription: isBool(timer.showDescription ?? timer.show_description, true),
        description: timer.description || '',
        soundEnabled: Boolean(timer.soundEnabled ?? (timer.sound_enabled === 1)),
        maxCapSeconds: timer.maxCapSeconds || timer.max_cap_seconds || 86400
      }
    });
  } catch (err: any) {
    console.error('Error in GET /api/widgets/timer:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || 'demo-token';

    const timersCol = await getStreamTimersCollection();
    let timer = await timersCol.findOne({ streamerToken: token }) as any;

    const title = body.title !== undefined ? body.title : (timer?.title || 'SUBATHON COUNTDOWN 🔥');
    const remainingSeconds = body.remainingSeconds !== undefined ? Number(body.remainingSeconds) : (timer?.remainingSeconds ?? timer?.remaining_seconds ?? 7200);
    const initialSeconds = body.initialSeconds !== undefined ? Number(body.initialSeconds) : (timer?.initialSeconds ?? timer?.initial_seconds ?? 7200);
    const rateMinutesPerUsd = body.rateMinutesPerUsd !== undefined ? Number(body.rateMinutesPerUsd) : (timer?.rateMinutesPerUsd ?? timer?.rate_minutes_per_usd ?? 10.0);
    const rateMinutesPerKhr = body.rateMinutesPerKhr !== undefined ? Number(body.rateMinutesPerKhr) : (timer?.rateMinutesPerKhr ?? timer?.rate_minutes_per_khr ?? 10.0);
    const isRunning = body.isRunning !== undefined ? Boolean(body.isRunning) : Boolean(timer?.isRunning ?? (timer?.is_running === 1));
    const glowColor = body.glowColor || timer?.glowColor || timer?.glow_color || '#00F0FF';
    const fontFamily = body.fontFamily || timer?.fontFamily || timer?.font_family || 'Chakra Petch';
    const layoutMode = body.layoutMode || timer?.layoutMode || timer?.layout_mode || 'neon';
    const templateStyle = body.templateStyle || body.layoutMode || timer?.templateStyle || timer?.template_style || 'cyber-neon';
    const showBackground = isBool(body.showBackground, isBool(timer?.showBackground ?? timer?.show_background, true));
    const showAnimation = isBool(body.showAnimation, isBool(timer?.showAnimation ?? timer?.show_animation, true));
    const showTitle = isBool(body.showTitle, isBool(timer?.showTitle ?? timer?.show_title, true));
    const showDescription = isBool(body.showDescription, isBool(timer?.showDescription ?? timer?.show_description, true));
    const description = body.description !== undefined ? String(body.description) : (timer?.description || '');
    const soundEnabled = body.soundEnabled !== undefined ? Boolean(body.soundEnabled) : Boolean(timer?.soundEnabled ?? (timer?.sound_enabled === 1));
    const maxCapSeconds = body.maxCapSeconds !== undefined ? Number(body.maxCapSeconds) : (timer?.maxCapSeconds ?? timer?.max_cap_seconds ?? 86400);

    const docUpdate = {
      streamerToken: token,
      title,
      remainingSeconds,
      initialSeconds,
      rateMinutesPerUsd,
      rateMinutesPerKhr,
      isRunning,
      glowColor,
      fontFamily,
      layoutMode,
      templateStyle,
      showBackground,
      showAnimation,
      showTitle,
      showDescription,
      description,
      soundEnabled,
      maxCapSeconds,
      lastUpdatedAt: new Date()
    };

    await timersCol.updateOne(
      { streamerToken: token },
      { $set: docUpdate },
      { upsert: true }
    );

    const updated = {
      token,
      title,
      remainingSeconds,
      initialSeconds,
      rateMinutesPerUsd,
      rateMinutesPerKhr,
      isRunning,
      glowColor,
      fontFamily,
      layoutMode,
      templateStyle,
      showBackground,
      showAnimation,
      showTitle,
      showDescription,
      description,
      soundEnabled,
      maxCapSeconds,
      addedSeconds: body.addedSeconds || 0,
      donorName: body.donorName || null,
      tipAmount: body.tipAmount || null
    };

    const io = getIO();
    if (io) {
      io.to(`overlay:${token}`).emit('timer:update', updated);
      if (token !== 'demo-token') {
        io.to('overlay:demo-token').emit('timer:update', updated);
      }
      io.emit('timer:update', updated);
    }

    return NextResponse.json({
      success: true,
      timer: updated
    });
  } catch (err: any) {
    console.error('Error in POST /api/widgets/timer:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
