import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getUsersCollection } from '@/server/database/mongo';
import { isAdminEmail } from '@/server/database/db';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const usersCol = await getUsersCollection();
  const escapedEmail = (user.email || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let streamer = await usersCol.findOne({
    $or: [
      { userId: user.id },
      { id: user.id as any },
      ...(escapedEmail ? [{ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] : [])
    ]
  });

  if (!streamer) {
    return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
  }

  let currentPlan = (streamer.plan || 'free').toLowerCase();
  let planStartedAt = streamer.planStartedAt || null;
  let planExpiresAt = streamer.planExpiresAt || null;
  let planDurationDays = Number(streamer.planDurationDays || 0);

  if (currentPlan === 'pro' && planExpiresAt) {
    const expiresTime = new Date(planExpiresAt).getTime();
    if (!isNaN(expiresTime) && expiresTime < Date.now()) {
      await usersCol.updateOne(
        { _id: streamer._id },
        {
          $set: {
            plan: 'free',
            planStartedAt: null,
            planExpiresAt: null,
            planDurationDays: 0,
            updatedAt: new Date()
          }
        }
      );
      currentPlan = 'free';
      planStartedAt = null;
      planExpiresAt = null;
      planDurationDays = 0;
    }
  }

  const userSocialLinks = Array.isArray(streamer.socialLinks) ? streamer.socialLinks : [];

  return NextResponse.json({
    id: streamer.userId || (streamer as any).id || String(streamer._id),
    email: streamer.email,
    username: streamer.username,
    displayName: streamer.displayName || streamer.username,
    avatarUrl: streamer.avatarUrl,
    bio: streamer.bio,
    customThanksMessage: streamer.customThanksMessage || '',
    socialLinks: userSocialLinks,
    links: userSocialLinks,
    isVerified: Boolean(streamer.isVerified),
    plan: currentPlan,
    planStartedAt,
    planExpiresAt,
    planDurationDays,
    overlayToken: streamer.overlayToken || streamer.overlay_token,
    telegramChatId: (streamer as any).telegramChatId || (streamer as any).telegram_chat_id,
    telegramPairingCode: streamer.telegramPairingCode || (streamer as any).telegram_pairing_code,
    isAdmin: isAdminEmail(streamer.email),
    createdAt: streamer.createdAt
  });
}
