import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/server/services/socketService';
import { v4 as uuidv4 } from 'uuid';
import { getUsersCollection, getOverlayTokenHistoryCollection, getStreamGoalsCollection } from '@/server/database/mongo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';
    const goalId = searchParams.get('goalId');

    const goalsCol = await getStreamGoalsCollection();
    let goals = await goalsCol.find({ streamerToken: token }).sort({ isActive: -1, createdAt: -1 }).toArray();

    // If no goals found directly under this token, resolve the streamer and check historical tokens
    if (goals.length === 0 && token !== 'demo-token') {
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
          goals = await goalsCol.find({
            $or: [
              { streamerId: sId },
              { streamerToken: { $in: tokenList } }
            ]
          }).sort({ isActive: -1, createdAt: -1 }).toArray();

          if (goals.length > 0) {
            await goalsCol.updateMany(
              { _id: { $in: goals.map((g: any) => g._id) } },
              { $set: { streamerToken: token, streamerId: sId, updatedAt: new Date() } }
            );
          }
        }
      } catch (err) {
        console.warn('[Goals API] Token recovery warning:', err);
      }
    }

    const activeGoal = goals.find((g: any) => g.isActive || g.is_active === 1) || goals[0] || null;
    const specificGoal = goalId ? goals.find((g: any) => g.id === goalId || String(g._id) === goalId) : null;

    const mapGoal = (g: any) => ({
      id: g.id || String(g._id),
      token: g.streamerToken || g.streamer_token,
      title: g.title,
      targetAmount: Number(g.targetAmount ?? g.target_amount ?? 100),
      currentAmount: Number(g.currentAmount ?? g.current_amount ?? 0),
      initialAmount: Number(g.initialAmount ?? g.initial_amount ?? 0),
      accentColor: g.accentColor || g.accent_color || '#10B981',
      templateStyle: g.templateStyle || g.template_style || 'cyber-neon',
      showBalance: g.showBalance !== false && g.show_balance !== 0,
      showBackground: g.showBackground !== false && g.show_background !== 0,
      showAnimation: g.showAnimation !== false && g.show_animation !== 0,
      endDate: g.endDate || g.end_date || null,
      isActive: Boolean(g.isActive || g.is_active === 1),
      createdAt: g.createdAt || g.created_at,
      updatedAt: g.updatedAt || g.updated_at
    });

    return NextResponse.json({
      success: true,
      goals: goals.map(mapGoal),
      activeGoal: activeGoal ? mapGoal(activeGoal) : null,
      goal: specificGoal ? mapGoal(specificGoal) : null
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
    const showBalance = body.showBalance !== undefined ? Boolean(body.showBalance) : true;
    const showBackground = body.showBackground !== undefined ? Boolean(body.showBackground) : true;
    const showAnimation = body.showAnimation !== undefined ? Boolean(body.showAnimation) : true;
    const endDate = body.endDate || null;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    const goalsCol = await getStreamGoalsCollection();

    // If marked active, deactivate other goals for this streamer
    if (isActive) {
      await goalsCol.updateMany({ streamerToken: token }, { $set: { isActive: false } });
    }

    const newId = uuidv4();
    const now = new Date();

    const newDoc = {
      id: newId,
      streamerToken: token,
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
      isActive,
      createdAt: now,
      updatedAt: now
    };

    await goalsCol.insertOne(newDoc);

    const created = {
      id: newId,
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
    };

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

    const goalsCol = await getStreamGoalsCollection();
    const existing = await goalsCol.findOne({
      $and: [
        { $or: [{ id }, { _id: id as any }] },
        { streamerToken: token }
      ]
    }) as any;

    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const willBeActive = body.isActive !== undefined ? Boolean(body.isActive) : Boolean(existing.isActive);
    if (willBeActive) {
      await goalsCol.updateMany({ streamerToken: token }, { $set: { isActive: false } });
    }

    const title = body.title !== undefined ? body.title.trim() : existing.title;
    const targetAmount = body.targetAmount !== undefined ? Math.max(1, parseFloat(body.targetAmount) || 1) : existing.targetAmount;

    let currentAmount = existing.currentAmount ?? existing.current_amount ?? 0;
    if (body.addAmount !== undefined) {
      currentAmount = Math.max(0, currentAmount + parseFloat(body.addAmount));
    } else if (body.currentAmount !== undefined) {
      currentAmount = Math.max(0, parseFloat(body.currentAmount) || 0);
    }

    const accentColor = body.accentColor || existing.accentColor || '#10B981';
    const templateStyle = body.templateStyle || existing.templateStyle || 'cyber-neon';
    const showBalance = body.showBalance !== undefined ? Boolean(body.showBalance) : (existing.showBalance !== undefined ? Boolean(existing.showBalance) : true);
    const showBackground = body.showBackground !== undefined ? Boolean(body.showBackground) : (existing.showBackground !== undefined ? Boolean(existing.showBackground) : true);
    const showAnimation = body.showAnimation !== undefined ? Boolean(body.showAnimation) : (existing.showAnimation !== undefined ? Boolean(existing.showAnimation) : true);
    const endDate = body.endDate !== undefined ? body.endDate : existing.endDate;

    await goalsCol.updateOne(
      { _id: existing._id },
      {
        $set: {
          title,
          targetAmount,
          currentAmount,
          accentColor,
          templateStyle,
          showBalance,
          showBackground,
          showAnimation,
          endDate,
          isActive: willBeActive,
          updatedAt: new Date()
        }
      }
    );

    const updated = {
      id: existing.id || String(existing._id),
      token,
      title,
      targetAmount,
      currentAmount,
      accentColor,
      templateStyle,
      showBalance,
      showBackground,
      showAnimation,
      endDate,
      isActive: willBeActive
    };

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

    const goalsCol = await getStreamGoalsCollection();
    const goal = await goalsCol.findOne({
      $and: [
        { $or: [{ id }, { _id: id as any }] },
        { streamerToken: token }
      ]
    }) as any;

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await goalsCol.deleteOne({ _id: goal._id });

    // If deleted goal was active, promote the newest remaining goal
    if (goal.isActive) {
      const nextActive = await goalsCol.find({ streamerToken: token }).sort({ createdAt: -1 }).limit(1).toArray();
      if (nextActive.length > 0) {
        await goalsCol.updateOne({ _id: nextActive[0]._id }, { $set: { isActive: true } });
        const io = getIO();
        if (io) {
          io.to(`overlay:${token}`).emit('goal:update', {
            id: nextActive[0].id || String(nextActive[0]._id),
            token,
            title: nextActive[0].title,
            targetAmount: Number(nextActive[0].targetAmount),
            currentAmount: Number(nextActive[0].currentAmount),
            accentColor: nextActive[0].accentColor,
            endDate: nextActive[0].endDate,
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
