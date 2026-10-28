import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db, isAdminEmail } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';

function checkAdmin(req: NextRequest) {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) return null;

  const row = db.prepare('SELECT id, email, username FROM streamers WHERE id = ?').get(authUser.id) as any;
  const email = row?.email || authUser.email;
  if (!isAdminEmail(email)) return null;
  return { ...authUser, email };
}

export async function GET(req: NextRequest) {
  try {
    const admin = checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required (hchenheng@gmail.com)' }, { status: 403 });
    }

    const rows = db.prepare(`
      SELECT id, email, username, display_name, avatar_url, bio, plan,
             plan_started_at, plan_expires_at, plan_duration_days,
             overlay_token, telegram_chat_id, created_at
      FROM streamers
      ORDER BY datetime(created_at) DESC
    `).all() as any[];

    const now = Date.now();
    const users = rows.map((r) => {
      let currentPlan = (r.plan || 'free').toLowerCase();
      let planStartedAt = r.plan_started_at || null;
      let planExpiresAt = r.plan_expires_at || null;
      let planDurationDays = r.plan_duration_days || 0;
      let remainingDays = 0;

      if (currentPlan === 'pro' && planExpiresAt) {
        const expMs = new Date(planExpiresAt).getTime();
        if (!isNaN(expMs)) {
          if (expMs < now) {
            // Expired -> revert to free
            db.prepare(`
              UPDATE streamers
              SET plan = 'free', plan_started_at = NULL, plan_expires_at = NULL, plan_duration_days = 0
              WHERE id = ?
            `).run(r.id);
            currentPlan = 'free';
            planStartedAt = null;
            planExpiresAt = null;
            planDurationDays = 0;
          } else {
            remainingDays = Math.max(1, Math.ceil((expMs - now) / (1000 * 60 * 60 * 24)));
          }
        }
      } else if (currentPlan === 'pro' && !planExpiresAt) {
        remainingDays = 31;
      }

      return {
        id: r.id,
        email: r.email,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        bio: r.bio,
        plan: currentPlan,
        planStartedAt,
        planExpiresAt,
        planDurationDays,
        remainingDays,
        isAdmin: isAdminEmail(r.email),
        createdAt: r.created_at
      };
    });

    const proUsers = users.filter((u) => u.plan === 'pro').length;
    const freeUsers = users.length - proUsers;

    return NextResponse.json({
      users,
      summary: {
        totalUsers: users.length,
        proUsers,
        freeUsers
      }
    });
  } catch (err: any) {
    console.error('[Admin Users GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load users' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required (hchenheng@gmail.com)' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId, plan, durationDays = 31, action } = body;

    if (!userId || !plan) {
      return NextResponse.json({ error: 'userId and plan are required' }, { status: 400 });
    }

    const target = db.prepare('SELECT * FROM streamers WHERE id = ?').get(userId) as any;
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const normalizedPlan = String(plan).toLowerCase() === 'pro' ? 'pro' : 'free';
    const days = Math.max(1, Number(durationDays) || 31);

    let planStartedAt: string | null = null;
    let planExpiresAt: string | null = null;
    let planDurationDays = 0;

    if (normalizedPlan === 'pro') {
      const now = new Date();
      let baseTime = now.getTime();

      if (action === 'extend' && target.plan === 'pro' && target.plan_expires_at) {
        const existingExp = new Date(target.plan_expires_at).getTime();
        if (!isNaN(existingExp) && existingExp > baseTime) {
          baseTime = existingExp;
        }
      }

      planStartedAt = target.plan_started_at && action === 'extend' ? target.plan_started_at : now.toISOString();
      planExpiresAt = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
      planDurationDays = days;
    }

    db.prepare(`
      UPDATE streamers
      SET plan = ?, plan_started_at = ?, plan_expires_at = ?, plan_duration_days = ?
      WHERE id = ?
    `).run(normalizedPlan, planStartedAt, planExpiresAt, planDurationDays, userId);

    // Sync to MongoDB Atlas
    try {
      const usersCol = await getUsersCollection();
      await usersCol.updateOne(
        { userId },
        {
          $set: {
            plan: normalizedPlan,
            planStartedAt,
            planExpiresAt,
            planDurationDays,
            updatedAt: new Date()
          }
        }
      );
    } catch (mongoErr) {
      console.warn('[Admin Users PUT] Non-fatal MongoDB sync warning:', mongoErr);
    }

    const updated = db.prepare('SELECT * FROM streamers WHERE id = ?').get(userId) as any;
    const remainingDays =
      normalizedPlan === 'pro' && planExpiresAt
        ? Math.max(1, Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    return NextResponse.json({
      success: true,
      message:
        normalizedPlan === 'pro'
          ? `Updated @${updated.username} to Pro Plan for ${days} days`
          : `Updated @${updated.username} to Free Plan`,
      user: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        displayName: updated.display_name,
        avatarUrl: updated.avatar_url,
        plan: updated.plan || 'free',
        planStartedAt: updated.plan_started_at,
        planExpiresAt: updated.plan_expires_at,
        planDurationDays: updated.plan_duration_days || 0,
        remainingDays,
        isAdmin: isAdminEmail(updated.email),
        createdAt: updated.created_at
      }
    });
  } catch (err: any) {
    console.error('[Admin Users PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user plan' }, { status: 500 });
  }
}
