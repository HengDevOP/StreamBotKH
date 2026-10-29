import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';
import { getIO } from '@/server/services/socketService';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';

    let timer = db.prepare('SELECT * FROM stream_timers WHERE streamer_token = ?').get(token) as any;

    if (!timer) {
      const newId = uuidv4();
      db.prepare(`
        INSERT INTO stream_timers (
          id, streamer_token, title, remaining_seconds, initial_seconds,
          rate_minutes_per_usd, rate_minutes_per_khr, is_running, glow_color,
          font_family, layout_mode, template_style, show_background, show_animation, sound_enabled, max_cap_seconds, last_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        newId,
        token,
        'SUBATHON COUNTDOWN 🔥',
        7200, // 2 hours
        7200,
        10.0, // 1$ = 10mins (User requirement)
        10.0,
        1,
        '#00F0FF',
        'Chakra Petch',
        'neon',
        'cyber-neon',
        1,
        1,
        1,
        86400
      );
      timer = db.prepare('SELECT * FROM stream_timers WHERE id = ?').get(newId) as any;
    } else if (timer.is_running === 1) {
      // Calculate elapsed time since last_updated_at to provide accurate real-time countdown
      const lastUpdated = new Date(timer.last_updated_at + 'Z').getTime();
      const now = Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((now - lastUpdated) / 1000));

      if (elapsedSeconds > 0) {
        const newRemaining = Math.max(0, timer.remaining_seconds - elapsedSeconds);
        db.prepare(`
          UPDATE stream_timers SET
            remaining_seconds = ?,
            last_updated_at = datetime('now')
          WHERE id = ?
        `).run(newRemaining, timer.id);
        timer.remaining_seconds = newRemaining;
      }
    }

    return NextResponse.json({
      success: true,
      timer: {
        id: timer.id,
        token: timer.streamer_token,
        title: timer.title,
        remainingSeconds: timer.remaining_seconds,
        initialSeconds: timer.initial_seconds,
        rateMinutesPerUsd: timer.rate_minutes_per_usd ?? 10.0,
        rateMinutesPerKhr: timer.rate_minutes_per_khr ?? 10.0,
        isRunning: timer.is_running === 1,
        glowColor: timer.glow_color || '#00F0FF',
        fontFamily: timer.font_family || 'Chakra Petch',
        layoutMode: timer.layout_mode || 'neon',
        templateStyle: timer.template_style || timer.layout_mode || 'cyber-neon',
        showBackground: timer.show_background !== 0,
        showAnimation: timer.show_animation !== 0,
        showTitle: timer.show_title !== 0,
        showDescription: timer.show_description !== 0,
        description: timer.description || '',
        soundEnabled: timer.sound_enabled === 1,
        maxCapSeconds: timer.max_cap_seconds || 86400
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

    let timer = db.prepare('SELECT * FROM stream_timers WHERE streamer_token = ?').get(token) as any;
    const now = new Date().toISOString();

    const title = body.title !== undefined ? body.title : (timer?.title || 'SUBATHON COUNTDOWN 🔥');
    const remainingSeconds = body.remainingSeconds !== undefined ? Number(body.remainingSeconds) : (timer?.remaining_seconds ?? 7200);
    const initialSeconds = body.initialSeconds !== undefined ? Number(body.initialSeconds) : (timer?.initial_seconds ?? 7200);
    const rateMinutesPerUsd = body.rateMinutesPerUsd !== undefined ? Number(body.rateMinutesPerUsd) : (timer?.rate_minutes_per_usd ?? 10.0);
    const rateMinutesPerKhr = body.rateMinutesPerKhr !== undefined ? Number(body.rateMinutesPerKhr) : (timer?.rate_minutes_per_khr ?? 10.0);
    const isRunning = body.isRunning !== undefined ? (body.isRunning ? 1 : 0) : (timer?.is_running ?? 1);
    const glowColor = body.glowColor || timer?.glow_color || '#00F0FF';
    const fontFamily = body.fontFamily || timer?.font_family || 'Chakra Petch';
    const layoutMode = body.layoutMode || timer?.layout_mode || 'neon';
    const templateStyle = body.templateStyle || body.layoutMode || timer?.template_style || timer?.layout_mode || 'cyber-neon';
    const showBackground = body.showBackground !== undefined ? (body.showBackground ? 1 : 0) : (timer?.show_background !== undefined ? timer.show_background : 1);
    const showAnimation = body.showAnimation !== undefined ? (body.showAnimation ? 1 : 0) : (timer?.show_animation !== undefined ? timer.show_animation : 1);
    const showTitle = body.showTitle !== undefined ? (body.showTitle ? 1 : 0) : (timer?.show_title !== undefined ? timer.show_title : 1);
    const showDescription = body.showDescription !== undefined ? (body.showDescription ? 1 : 0) : (timer?.show_description !== undefined ? timer.show_description : 1);
    const description = body.description !== undefined ? String(body.description) : (timer?.description || '');
    const soundEnabled = body.soundEnabled !== undefined ? (body.soundEnabled ? 1 : 0) : (timer?.sound_enabled ?? 1);
    const maxCapSeconds = body.maxCapSeconds !== undefined ? Number(body.maxCapSeconds) : (timer?.max_cap_seconds ?? 86400);

    if (timer) {
      db.prepare(`
        UPDATE stream_timers SET
          title = ?,
          remaining_seconds = ?,
          initial_seconds = ?,
          rate_minutes_per_usd = ?,
          rate_minutes_per_khr = ?,
          is_running = ?,
          glow_color = ?,
          font_family = ?,
          layout_mode = ?,
          template_style = ?,
          show_background = ?,
          show_animation = ?,
          show_title = ?,
          show_description = ?,
          description = ?,
          sound_enabled = ?,
          max_cap_seconds = ?,
          last_updated_at = datetime('now')
        WHERE streamer_token = ?
      `).run(
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
        token
      );
    } else {
      const newId = uuidv4();
      db.prepare(`
        INSERT INTO stream_timers (
          id, streamer_token, title, remaining_seconds, initial_seconds,
          rate_minutes_per_usd, rate_minutes_per_khr, is_running, glow_color,
          font_family, layout_mode, template_style, show_background, show_animation,
          show_title, show_description, description,
          sound_enabled, max_cap_seconds, last_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        newId,
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
        maxCapSeconds
      );
    }

    const updated = {
      token,
      title,
      remainingSeconds,
      initialSeconds,
      rateMinutesPerUsd,
      rateMinutesPerKhr,
      isRunning: isRunning === 1,
      glowColor,
      fontFamily,
      layoutMode,
      templateStyle,
      showBackground: showBackground === 1,
      showAnimation: showAnimation === 1,
      showTitle: showTitle === 1,
      showDescription: showDescription === 1,
      description,
      soundEnabled: soundEnabled === 1,
      maxCapSeconds,
      addedSeconds: body.addedSeconds || 0,
      donorName: body.donorName || null,
      tipAmount: body.tipAmount || null
    };

    // Broadcast timer update to OBS Browser Source Overlay in real time
    const io = getIO();
    if (io) {
      io.to(`overlay:${token}`).emit('timer:update', updated);
      if (token !== 'demo-token') {
        io.to('overlay:demo-token').emit('timer:update', updated);
      }
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
