import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';
import { getIO } from '@/server/services/socketService';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';

    let row = db.prepare('SELECT * FROM stream_leaderboards WHERE streamer_token = ?').get(token) as any;

    if (!row) {
      const newId = uuidv4();
      db.prepare(`
        INSERT INTO stream_leaderboards (
          id, streamer_token, title, period, max_rows, accent_color, template_style,
          show_background, show_animation, show_rank_badges, font_family, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        newId,
        token,
        'TOP SUPPORTERS',
        'all',
        3, // Default 3 per user requirement!
        '#F59E0B',
        'cyber-neon',
        1,
        1,
        1,
        'Chakra Petch'
      );
      row = db.prepare('SELECT * FROM stream_leaderboards WHERE id = ?').get(newId) as any;
    }

    const effectivePeriod = searchParams.get('period') || row.period || 'all';
    const effectiveLimit = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') || String(row.max_rows || 3), 10)));

    // Find streamer by token
    let streamer = db.prepare('SELECT id FROM streamers WHERE overlay_token = ?').get(token) as any;
    const streamerId = streamer?.id || (token === 'demo-token' ? 'demo-streamer-id-1001' : null);

    // Date filtering clause
    let dateClause = '';
    if (effectivePeriod === 'today') {
      dateClause = "AND date(created_at) = date('now')";
    } else if (effectivePeriod === 'week') {
      dateClause = "AND created_at >= datetime('now', '-7 days')";
    } else if (effectivePeriod === 'month') {
      dateClause = "AND created_at >= datetime('now', '-30 days')";
    }

    let topDonors: any[] = [];

    if (streamerId) {
      // Aggregate real donations from database
      const rawRows = db.prepare(`
        SELECT 
          donor_name as name,
          SUM(CASE WHEN currency = 'KHR' THEN amount / 4000.0 ELSE amount END) as total_usd,
          COUNT(id) as tip_count,
          banking_name as bank
        FROM donations
        WHERE streamer_id = ?
          AND status = 'PAID'
          ${dateClause}
        GROUP BY donor_name
        ORDER BY total_usd DESC
        LIMIT ?
      `).all(streamerId, effectiveLimit) as any[];

      if (rawRows && rawRows.length > 0) {
        topDonors = rawRows.map((r, idx) => ({
          rank: idx + 1,
          name: r.name || 'Anonymous Supporter',
          amount: Math.round(Number(r.total_usd) * 100) / 100,
          count: Number(r.tip_count) || 1,
          bank: r.bank || 'Bakong KHQR'
        }));
      }
    }

    // Realistic demo fallback if streamer has no donations yet
    if (topDonors.length === 0) {
      const demoList = [
        { name: 'Sokha Gaming Pro', amount: 85.0, count: 4, bank: 'ABA Bank' },
        { name: 'Vannak KH', amount: 50.0, count: 2, bank: 'Bakong App' },
        { name: 'Dara Cyber', amount: 32.5, count: 3, bank: 'Acleda' },
        { name: 'PhnomPenh_Ace', amount: 20.0, count: 1, bank: 'ABA Bank' },
        { name: 'NeonSamurai', amount: 15.0, count: 1, bank: 'Bakong App' },
        { name: 'KompongGamer', amount: 12.0, count: 2, bank: 'Wing Bank' },
        { name: 'PixelQueen', amount: 10.0, count: 1, bank: 'ABA Bank' },
        { name: 'KhmerWarrior', amount: 8.5, count: 1, bank: 'Bakong App' },
        { name: 'CyberSamurai', amount: 5.0, count: 1, bank: 'ABA Bank' },
        { name: 'SiemReapFan', amount: 3.0, count: 1, bank: 'Acleda' }
      ];

      topDonors = demoList.slice(0, effectiveLimit).map((d, i) => ({
        rank: i + 1,
        ...d
      }));
    }

    return NextResponse.json({
      success: true,
      leaderboard: {
        id: row.id,
        token: row.streamer_token,
        title: row.title || 'TOP SUPPORTERS',
        period: row.period || 'all',
        maxRows: row.max_rows || 3, // 1 to 10 (default 3)
        accentColor: row.accent_color || '#F59E0B',
        templateStyle: row.template_style || 'cyber-neon',
        showBackground: row.show_background !== 0,
        showAnimation: row.show_animation !== 0,
        showRankBadges: row.show_rank_badges !== 0,
        fontFamily: row.font_family || 'Chakra Petch'
      },
      topDonors
    });
  } catch (err: any) {
    console.error('API /widgets/leaderboard GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      token = 'demo-token',
      title = 'TOP SUPPORTERS',
      period = 'all',
      maxRows = 3,
      accentColor = '#F59E0B',
      templateStyle = 'cyber-neon',
      showBackground = true,
      showAnimation = true,
      showRankBadges = true,
      fontFamily = 'Chakra Petch'
    } = body;

    // Validate maxRows strictly between 1 to 10 (default 3)
    const cleanMaxRows = Math.min(10, Math.max(1, parseInt(String(maxRows), 10) || 3));

    const existing = db.prepare('SELECT id FROM stream_leaderboards WHERE streamer_token = ?').get(token) as any;

    if (existing) {
      db.prepare(`
        UPDATE stream_leaderboards SET
          title = ?,
          period = ?,
          max_rows = ?,
          accent_color = ?,
          template_style = ?,
          show_background = ?,
          show_animation = ?,
          show_rank_badges = ?,
          font_family = ?,
          updated_at = datetime('now')
        WHERE streamer_token = ?
      `).run(
        title,
        period,
        cleanMaxRows,
        accentColor,
        templateStyle,
        showBackground ? 1 : 0,
        showAnimation ? 1 : 0,
        showRankBadges ? 1 : 0,
        fontFamily,
        token
      );
    } else {
      const newId = uuidv4();
      db.prepare(`
        INSERT INTO stream_leaderboards (
          id, streamer_token, title, period, max_rows, accent_color, template_style,
          show_background, show_animation, show_rank_badges, font_family, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        newId,
        token,
        title,
        period,
        cleanMaxRows,
        accentColor,
        templateStyle,
        showBackground ? 1 : 0,
        showAnimation ? 1 : 0,
        showRankBadges ? 1 : 0,
        fontFamily
      );
    }

    const updated = db.prepare('SELECT * FROM stream_leaderboards WHERE streamer_token = ?').get(token) as any;

    // Broadcast live to OBS overlays
    const io = getIO();
    if (io) {
      const broadcastPayload = {
        title: updated.title,
        period: updated.period,
        maxRows: updated.max_rows,
        accentColor: updated.accent_color,
        templateStyle: updated.template_style,
        showBackground: updated.show_background !== 0,
        showAnimation: updated.show_animation !== 0,
        showRankBadges: updated.show_rank_badges !== 0,
        fontFamily: updated.font_family
      };

      io.to(`overlay:${token}`).emit('leaderboard:update', broadcastPayload);
      if (token !== 'demo-token') {
        io.to('overlay:demo-token').emit('leaderboard:update', broadcastPayload);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Leaderboard settings saved successfully',
      leaderboard: {
        id: updated.id,
        token: updated.streamer_token,
        title: updated.title,
        period: updated.period,
        maxRows: updated.max_rows,
        accentColor: updated.accent_color,
        templateStyle: updated.template_style,
        showBackground: updated.show_background !== 0,
        showAnimation: updated.show_animation !== 0,
        showRankBadges: updated.show_rank_badges !== 0,
        fontFamily: updated.font_family
      }
    });
  } catch (err: any) {
    console.error('API /widgets/leaderboard POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save leaderboard settings' },
      { status: 500 }
    );
  }
}
