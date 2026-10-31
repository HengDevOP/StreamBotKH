import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, generateToken } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';

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

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required to impersonate users' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = (body.targetUserId || body.userId || body.id || '').trim();

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    const usersCol = await getUsersCollection();
    const escaped = targetUserId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const mongoUser = await usersCol.findOne({
      $or: [
        { userId: targetUserId },
        { id: targetUserId },
        { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { email: { $regex: new RegExp(`^${escaped}$`, 'i') } }
      ]
    }) as any;

    if (!mongoUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const resolvedId = mongoUser.userId || mongoUser.id;

    // Issue JWT token for target user
    const token = generateToken({
      id: resolvedId,
      username: mongoUser.username,
      email: mongoUser.email
    });

    const userPayload = {
      id: resolvedId,
      email: mongoUser.email,
      username: mongoUser.username,
      displayName: mongoUser.displayName || mongoUser.username,
      avatarUrl: mongoUser.avatarUrl,
      plan: mongoUser.plan || 'free',
      isVerified: Boolean(mongoUser.isVerified),
      overlayToken: mongoUser.overlayToken,
      isAdmin: isAdminEmail(mongoUser.email)
    };

    return NextResponse.json({
      success: true,
      token,
      user: userPayload,
      impersonatorAdmin: {
        id: admin.id,
        email: admin.email
      }
    });
  } catch (err: any) {
    console.error('[Admin Impersonate POST] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to impersonate user' },
      { status: 500 }
    );
  }
}
