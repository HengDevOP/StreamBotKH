import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';

const DEFAULT_PAGE_LIMIT = 20;
const CACHE_TTL_MS = 30 * 1000;

interface CachedResponse {
  timestamp: number;
  payload: any;
}

const adminUsersCache = new Map<string, CachedResponse>();

export function clearAdminUsersCache() {
  adminUsersCache.clear();
}

async function checkAdmin(req: NextRequest) {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) return null;

  let row: any = null;
  try {
    const usersCol = await getUsersCollection();
    row = await usersCol.findOne({ userId: authUser.id });
  } catch (e) {}

  const email = row?.email || authUser.email;
  if (!isAdminEmail(email)) return null;
  return { ...authUser, email };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
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

    const usersCol = await getUsersCollection();
    const rows = await usersCol.find({}).sort({ createdAt: -1 }).toArray();

    const now = Date.now();
    const allUsers = rows.map((r: any) => {
      let currentPlan = (r.plan || 'free').toLowerCase();
      let planStartedAt = r.planStartedAt || r.plan_started_at || null;
      let planExpiresAt = r.planExpiresAt || r.plan_expires_at || null;
      let planDurationDays = r.planDurationDays || r.plan_duration_days || 0;
      let remainingDays = 0;

      if (currentPlan === 'pro' && planExpiresAt) {
        const expMs = new Date(planExpiresAt).getTime();
        if (!isNaN(expMs)) {
          if (expMs < now) {
            // Expired -> revert to free
            usersCol.updateOne(
              { userId: r.userId || r.id },
              { $set: { plan: 'free', planStartedAt: null, planExpiresAt: null, planDurationDays: 0, updatedAt: new Date() } }
            ).catch(() => {});
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
        id: r.userId || r.id,
        email: r.email,
        username: r.username,
        displayName: r.displayName || r.display_name || r.username,
        avatarUrl: r.avatarUrl || r.avatar_url,
        bio: r.bio,
        plan: currentPlan,
        planStartedAt,
        planExpiresAt,
        planDurationDays,
        remainingDays,
        isVerified: Boolean(r.isVerified || r.is_verified),
        isAdmin: isAdminEmail(r.email),
        createdAt: r.createdAt || r.created_at
      };
    });

    const proUsers = allUsers.filter((u) => u.plan === 'pro').length;
    const freeUsers = allUsers.length - proUsers;

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
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required (hchenheng@gmail.com)' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId, id, username, email, plan, durationDays = 31, action, isVerified } = body;

    const lookupKey = userId || id || username || email;
    if (!lookupKey) {
      return NextResponse.json(
        { error: 'User identifier is required (userId, id, username, or email)' },
        { status: 400 }
      );
    }

    const usersCol = await getUsersCollection();
    const escaped = String(lookupKey).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let target = await usersCol.findOne({
      $or: [
        { userId: lookupKey },
        { id: lookupKey },
        { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { email: { $regex: new RegExp(`^${escaped}$`, 'i') } }
      ]
    }) as any;

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const resolvedUserId = target.userId || target.id;
    let successMessage = '';
    const updateFields: any = { updatedAt: new Date() };

    // 1. Handle verified badge toggle if provided
    if (isVerified !== undefined) {
      updateFields.isVerified = Boolean(isVerified);
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

        if (action === 'extend' && target.plan === 'pro' && (target.planExpiresAt || target.plan_expires_at)) {
          const existingExp = new Date(target.planExpiresAt || target.plan_expires_at).getTime();
          if (!isNaN(existingExp) && existingExp > baseTime) {
            baseTime = existingExp;
          }
        }

        planStartedAt = target.planStartedAt && action === 'extend' ? target.planStartedAt : now.toISOString();
        planExpiresAt = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
        planDurationDays = days;
      }

      updateFields.plan = normalizedPlan;
      updateFields.planStartedAt = planStartedAt;
      updateFields.planExpiresAt = planExpiresAt;
      updateFields.planDurationDays = planDurationDays;

      successMessage =
        normalizedPlan === 'pro'
          ? `Updated @${target.username} to Pro Plan for ${days} days`
          : `Updated @${target.username} to Free Plan`;
    }

    await usersCol.updateOne(
      { $or: [{ userId: resolvedUserId }, { id: resolvedUserId }] },
      { $set: updateFields }
    );

    clearAdminUsersCache();

    const updated = await usersCol.findOne({ $or: [{ userId: resolvedUserId }, { id: resolvedUserId }] }) as any;
    const remainingDays =
      updated.plan === 'pro' && updated.planExpiresAt
        ? Math.max(1, Math.ceil((new Date(updated.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    return NextResponse.json({
      success: true,
      message: successMessage || 'User updated successfully',
      user: {
        id: updated.userId || updated.id,
        email: updated.email,
        username: updated.username,
        displayName: updated.displayName || updated.username,
        avatarUrl: updated.avatarUrl,
        plan: updated.plan || 'free',
        planStartedAt: updated.planStartedAt,
        planExpiresAt: updated.planExpiresAt,
        planDurationDays: updated.planDurationDays || 0,
        remainingDays,
        isVerified: Boolean(updated.isVerified),
        isAdmin: isAdminEmail(updated.email),
        createdAt: updated.createdAt
      }
    });
  } catch (err: any) {
    console.error('[Admin Users PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user plan' }, { status: 500 });
  }
}
