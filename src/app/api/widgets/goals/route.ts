import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';
import { getIO } from '@/server/services/socketService';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';
    const goalId = searchParams.get('goalId');

    const goals = db.prepare(`
      SELECT * FROM stream_goals 
      WHERE streamer_token = ? 
      ORDER BY is_active DESC, created_at DESC
    `).all(token) as any[];

    const activeGoal = goals.find((g) => g.is_active === 1) || goals[0] || null;
    const specificGoal = goalId ? goals.find((g) => g.id === goalId) : null;

    return NextResponse.json({
      success: true,
      goals: goals.map((g) => ({
        id: g.id,
        token: g.streamer_token,
        title: g.title,
        targetAmount: Number(g.target_amount),
        currentAmount: Number(g.current_amount),
        initialAmount: Number(g.initial_amount || 0),
        accentColor: g.accent_color || '#10B981',
        templateStyle: g.template_style || 'cyber-neon',
        showBalance: g.show_balance !== 0,
        showBackground: g.show_background !== 0,
        showAnimation: g.show_animation !== 0,
        endDate: g.end_date || null,
        isActive: g.is_active === 1,
        createdAt: g.created_at,
        updatedAt: g.updated_at
      })),
      activeGoal: activeGoal ? {
        id: activeGoal.id,
        token: activeGoal.streamer_token,
        title: activeGoal.title,
        targetAmount: Number(activeGoal.target_amount),
        currentAmount: Number(activeGoal.current_amount),
        initialAmount: Number(activeGoal.initial_amount || 0),
        accentColor: activeGoal.accent_color || '#10B981',
        templateStyle: activeGoal.template_style || 'cyber-neon',
        showBalance: activeGoal.show_balance !== 0,
        showBackground: activeGoal.show_background !== 0,
        showAnimation: activeGoal.show_animation !== 0,
        endDate: activeGoal.end_date || null,
        isActive: activeGoal.is_active === 1,
        createdAt: activeGoal.created_at,
        updatedAt: activeGoal.updated_at
      } : null,
      goal: specificGoal ? {
        id: specificGoal.id,
        token: specificGoal.streamer_token,
        title: specificGoal.title,
        targetAmount: Number(specificGoal.target_amount),
        currentAmount: Number(specificGoal.current_amount),
        initialAmount: Number(specificGoal.initial_amount || 0),
        accentColor: specificGoal.accent_color || '#10B981',
        templateStyle: specificGoal.template_style || 'cyber-neon',
        showBalance: specificGoal.show_balance !== 0,
        showBackground: specificGoal.show_background !== 0,
        showAnimation: specificGoal.show_animation !== 0,
        endDate: specificGoal.end_date || null,
        isActive: specificGoal.is_active === 1
      } : null
    });
  } catch (err: any) {
    console.error('Error in GET /api/widgets/goals:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || 'demo-token';
    const title = (body.title || 'New Stream Goal').trim();
    const targetAmount = Math.max(1, parseFloat(body.targetAmount) || 100);
    const currentAmount = Math.max(0, parseFloat(body.currentAmount) || 0);
    const initialAmount = Math.max(0, parseFloat(body.initialAmount) || currentAmount);
    const accentColor = body.accentColor || '#10B981';
    const templateStyle = body.templateStyle || 'cyber-neon';
    const showBalance = body.showBalance !== undefined ? (body.showBalance ? 1 : 0) : 1;
    const showBackground = body.showBackground !== undefined ? (body.showBackground ? 1 : 0) : 1;
    const showAnimation = body.showAnimation !== undefined ? (body.showAnimation ? 1 : 0) : 1;
    const endDate = body.endDate || null;
    const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : 1;

    // If marked active, deactivate other goals for this streamer
    if (isActive === 1) {
      db.prepare('UPDATE stream_goals SET is_active = 0 WHERE streamer_token = ?').run(token);
    }

    const newId = uuidv4();
    db.prepare(`
      INSERT INTO stream_goals (
        id, streamer_token, title, target_amount, current_amount,
        initial_amount, accent_color, template_style, show_balance, show_background, show_animation, end_date, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      newId,
      token,
      title,
      targetAmount,
      currentAmount,
      initialAmount,
      accentColor,
      templateStyle,
      showBalance,
      showBackground,
      showAnimation,
      endDate,
      isActive
    );

    const created = {
      id: newId,
      token,
      title,
      targetAmount,
      currentAmount,
      initialAmount,
      accentColor,
      templateStyle,
      showBalance: showBalance === 1,
      showBackground: showBackground === 1,
      showAnimation: showAnimation === 1,
      endDate,
      isActive: isActive === 1
    };

    // Broadcast goal update to OBS overlay in real time
    const io = getIO();
    if (io) {
      io.to(`overlay:${token}`).emit('goal:update', created);
      if (token !== 'demo-token') {
        io.to('overlay:demo-token').emit('goal:update', created);
      }
    }

    return NextResponse.json({
      success: true,
      goal: created
    });
  } catch (err: any) {
    console.error('Error in POST /api/widgets/goals:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body.id;
    const token = body.token || 'demo-token';

    if (!id) {
      return NextResponse.json({ error: 'Missing goal id' }, { status: 400 });
    }

    const existing = db.prepare('SELECT * FROM stream_goals WHERE id = ? AND streamer_token = ?').get(id, token) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Check if activating this goal
    const willBeActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active;
    if (willBeActive === 1) {
      db.prepare('UPDATE stream_goals SET is_active = 0 WHERE streamer_token = ?').run(token);
    }

    const title = body.title !== undefined ? body.title.trim() : existing.title;
    const targetAmount = body.targetAmount !== undefined ? Math.max(1, parseFloat(body.targetAmount) || 1) : existing.target_amount;
    
    // Support adding amount (e.g. +$10 from donation) or setting explicitly
    let currentAmount = existing.current_amount;
    if (body.addAmount !== undefined) {
      currentAmount = Math.max(0, currentAmount + parseFloat(body.addAmount));
    } else if (body.currentAmount !== undefined) {
      currentAmount = Math.max(0, parseFloat(body.currentAmount) || 0);
    }

    const accentColor = body.accentColor || existing.accent_color || '#10B981';
    const templateStyle = body.templateStyle || existing.template_style || 'cyber-neon';
    const showBalance = body.showBalance !== undefined ? (body.showBalance ? 1 : 0) : (existing.show_balance !== undefined ? existing.show_balance : 1);
    const showBackground = body.showBackground !== undefined ? (body.showBackground ? 1 : 0) : (existing.show_background !== undefined ? existing.show_background : 1);
    const showAnimation = body.showAnimation !== undefined ? (body.showAnimation ? 1 : 0) : (existing.show_animation !== undefined ? existing.show_animation : 1);
    const endDate = body.endDate !== undefined ? body.endDate : existing.end_date;

    db.prepare(`
      UPDATE stream_goals SET
        title = ?,
        target_amount = ?,
        current_amount = ?,
        accent_color = ?,
        template_style = ?,
        show_balance = ?,
        show_background = ?,
        show_animation = ?,
        end_date = ?,
        is_active = ?,
        updated_at = datetime('now')
      WHERE id = ? AND streamer_token = ?
    `).run(
      title,
      targetAmount,
      currentAmount,
      accentColor,
      templateStyle,
      showBalance,
      showBackground,
      showAnimation,
      endDate,
      willBeActive,
      id,
      token
    );

    const updated = {
      id,
      token,
      title,
      targetAmount,
      currentAmount,
      accentColor,
      templateStyle,
      showBalance: showBalance === 1,
      showBackground: showBackground === 1,
      showAnimation: showAnimation === 1,
      endDate,
      isActive: willBeActive === 1
    };

    // Broadcast goal update to OBS overlay
    const io = getIO();
    if (io) {
      io.to(`overlay:${token}`).emit('goal:update', updated);
      if (token !== 'demo-token') {
        io.to('overlay:demo-token').emit('goal:update', updated);
      }
    }

    return NextResponse.json({
      success: true,
      goal: updated
    });
  } catch (err: any) {
    console.error('Error in PUT /api/widgets/goals:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const token = searchParams.get('token') || 'demo-token';

    if (!id) {
      return NextResponse.json({ error: 'Missing goal id' }, { status: 400 });
    }

    const goal = db.prepare('SELECT * FROM stream_goals WHERE id = ? AND streamer_token = ?').get(id, token) as any;
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM stream_goals WHERE id = ? AND streamer_token = ?').run(id, token);

    // If deleted goal was active, promote the newest remaining goal
    if (goal.is_active === 1) {
      const nextActive = db.prepare(`
        SELECT id FROM stream_goals 
        WHERE streamer_token = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(token) as any;

      if (nextActive) {
        db.prepare('UPDATE stream_goals SET is_active = 1 WHERE id = ?').run(nextActive.id);
        const promoted = db.prepare('SELECT * FROM stream_goals WHERE id = ?').get(nextActive.id) as any;
        const io = getIO();
        if (io && promoted) {
          io.to(`overlay:${token}`).emit('goal:update', {
            id: promoted.id,
            token,
            title: promoted.title,
            targetAmount: Number(promoted.target_amount),
            currentAmount: Number(promoted.current_amount),
            accentColor: promoted.accent_color,
            endDate: promoted.end_date,
            isActive: true
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/widgets/goals:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
