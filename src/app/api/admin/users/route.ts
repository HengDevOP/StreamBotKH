import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db, isAdminEmail } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';

const DEFAULT_PAGE_LIMIT = 20;
const CACHE_TTL_MS = 30 * 1000; // 30s server-side cache to prevent DB overload

interface CachedResponse {
  timestamp: number;
  payload: any;
}

const adminUsersCache = new Map<string, CachedResponse>();

export function clearAdminUsersCache() {
  adminUsersCache.clear();
}

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

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_LIMIT), 10) || DEFAULT_PAGE_LIMIT));
    const q = (searchParams.get('q') || searchParams.get('search') || '').trim().toLowerCase();
    const planFilter = (searchParams.get('plan') || 'ALL').trim();
    const forceRefresh = searchParams.get('refresh') === '1';

    const cacheKey = `${page}:${limit}:${q}:${planFilter}`;
    if (!forceRefresh) {
      const cached = adminUsersCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached.payload, fromCache: true });
      }
    }

    const rows = db.prepare(`
      SELECT id, email, username, display_name, avatar_url, bio, plan,
             plan_started_at, plan_expires_at, plan_duration_days,
             overlay_token, telegram_chat_id, is_verified, created_at
      FROM streamers
      ORDER BY datetime(created_at) DESC
    `).all() as any[];

    const now = Date.now();
    const allUsers = rows.map((r) => {
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
        isVerified: r.is_verified === 1,
        isAdmin: isAdminEmail(r.email),
        createdAt: r.created_at
      };
    });

    const proUsers = allUsers.filter((u) => u.plan === 'pro').length;
    const freeUsers = allUsers.length - proUsers;

    // Filter by search query & plan filter
    const filteredUsers = allUsers.filter((u) => {
      const matchesSearch =
        !q ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));
      const matchesPlan = planFilter === 'ALL' || u.plan === planFilter.toLowerCase();
      return matchesSearch && matchesPlan;
    });

    const totalMatched = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalMatched / limit));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

    const payload = {
      users: paginatedUsers,
      pagination: {
        page: safePage,
        limit,
        totalMatched,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1
      },
      summary: {
        totalUsers: allUsers.length,
        proUsers,
        freeUsers
      }
    };

    adminUsersCache.set(cacheKey, {
      timestamp: Date.now(),
      payload
    });

    return NextResponse.json(payload);
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
    const { userId, plan, durationDays = 31, action, isVerified } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const target = db.prepare('SELECT * FROM streamers WHERE id = ?').get(userId) as any;
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let successMessage = '';

    // 1. Handle verified badge toggle if provided
    if (isVerified !== undefined) {
      const verifiedVal = isVerified ? 1 : 0;
      db.prepare('UPDATE streamers SET is_verified = ? WHERE id = ?').run(verifiedVal, userId);
      try {
        const usersCol = await getUsersCollection();
        await usersCol.updateOne(
          { userId },
          { $set: { isVerified: Boolean(isVerified), updatedAt: new Date() } }
        );
      } catch (mongoErr) {
        console.warn('[Admin Users PUT] Mongo verified sync warning:', mongoErr);
      }
      successMessage = isVerified
        ? `Creator @${target.username} has been granted the Verified Creator badge!`
        : `Verified Creator badge removed from @${target.username}`;
    }

    // 2. Handle plan change if plan is provided
    if (plan !== undefined) {
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

      successMessage =
        normalizedPlan === 'pro'
          ? `Updated @${target.username} to Pro Plan for ${days} days`
          : `Updated @${target.username} to Free Plan`;
    }

    // Clear server cache when user is updated
    clearAdminUsersCache();

    const updated = db.prepare('SELECT * FROM streamers WHERE id = ?').get(userId) as any;
    const remainingDays =
      updated.plan === 'pro' && updated.plan_expires_at
        ? Math.max(1, Math.ceil((new Date(updated.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    return NextResponse.json({
      success: true,
      message: successMessage || 'User updated successfully',
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
        isVerified: updated.is_verified === 1,
        isAdmin: isAdminEmail(updated.email),
        createdAt: updated.created_at
      }
    });
  } catch (err: any) {
    console.error('[Admin Users PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user plan' }, { status: 500 });
  }
}
