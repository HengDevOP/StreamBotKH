import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, generateToken } from '@/server/auth';
import { getUsersCollection, processExpiredAccountDeletions, computeUserTokenStats, getTodayDateString } from '@/server/database/mongo';
import { isAdminEmail } from '@/server/database/db';

export async function GET(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await processExpiredAccountDeletions();

  const usersCol = await getUsersCollection();
  const escapedEmail = (user.email || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const streamer = await usersCol.findOne({
    $or: [
      { userId: user.id },
      { id: user.id as any },
      ...(escapedEmail ? [{ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] : [])
    ]
  });

  if (!streamer || (!streamer.userId && !streamer.username)) {
    return NextResponse.json({ error: 'Unauthorized: Account not found or permanently deleted' }, { status: 401 });
  }

  let currentPlan = (streamer.plan || 'free').toLowerCase();
  let planStartedAt = streamer.planStartedAt || null;
  let planExpiresAt = streamer.planExpiresAt || null;
  let planDurationDays = Number(streamer.planDurationDays || 0);

  // Check 7-Day Free Trial status
  let trialActive = Boolean(streamer.trialActive);
  let trialStartDate = streamer.trialStartDate || null;
  let trialEndDate = streamer.trialEndDate || null;
  let hasUsedTrial = Boolean(streamer.hasUsedTrial);

  const nowMs = Date.now();
  if (trialActive && trialEndDate) {
    const trialEndMs = new Date(trialEndDate).getTime();
    if (!isNaN(trialEndMs) && trialEndMs <= nowMs) {
      // Trial expired: mark user hasUsedTrial = true and revert plan to free
      await usersCol.updateOne(
        { _id: streamer._id },
        {
          $set: {
            trialActive: false,
            hasUsedTrial: true,
            trialEnded: true,
            plan: (streamer.plan === 'trial' || streamer.plan === 'pro') ? 'free' : (streamer.plan || 'free'),
            updatedAt: new Date()
          }
        }
      );
      trialActive = false;
      hasUsedTrial = true;
      if (currentPlan === 'trial' || currentPlan === 'pro') {
        currentPlan = 'free';
        planStartedAt = null;
        planExpiresAt = null;
        planDurationDays = 0;
      }
    }
  }

  let trialRemainingDays = 0;
  if (trialActive && trialEndDate) {
    const diff = new Date(trialEndDate).getTime() - nowMs;
    trialRemainingDays = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  if (currentPlan === 'pro' && planExpiresAt && !trialActive) {
    const expiresTime = new Date(planExpiresAt).getTime();
    if (!isNaN(expiresTime) && expiresTime < nowMs) {
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

  const resolvedUserId = streamer.userId || (streamer as any).id || String(streamer._id);
  const tokenStats = computeUserTokenStats({ ...streamer, plan: currentPlan, trialActive });
  const today = getTodayDateString();

  if (streamer.lastTokenResetDate !== today || streamer.dailyTokensLimit !== tokenStats.limit) {
    usersCol.updateOne(
      { _id: streamer._id },
      {
        $set: {
          dailyTokensLimit: tokenStats.limit,
          dailyTokensUsed: streamer.lastTokenResetDate !== today ? 0 : Math.min(Number(streamer?.dailyTokensUsed || 0), tokenStats.limit),
          lastTokenResetDate: today,
          updatedAt: new Date()
        }
      }
    ).catch(() => {});
  }

  const refreshedToken =
    user.id !== resolvedUserId || user.username !== streamer.username
      ? generateToken({
          id: resolvedUserId,
          username: streamer.username || 'streamer',
          email: streamer.email || ''
        })
      : undefined;

  return NextResponse.json({
    id: resolvedUserId,
    userId: resolvedUserId,
    ...(refreshedToken ? { token: refreshedToken } : {}),
    email: streamer.email,
    username: streamer.username,
    displayName: streamer.displayName,
    avatarUrl: streamer.avatarUrl,
    bannerUrl: (streamer as any).bannerUrl || (streamer as any).banner_url || '',
    bio: streamer.bio,
    customThanksMessage: streamer.customThanksMessage,
    isVerified: Boolean(streamer.isVerified),
    plan: currentPlan,
    planStartedAt,
    planExpiresAt,
    planDurationDays,
    trialActive,
    trialStartDate,
    trialEndDate,
    hasUsedTrial,
    trialRemainingDays,
    overlayToken: streamer.overlayToken || (streamer as any).overlay_token,
    telegramChatId: (streamer as any).telegramChatId || (streamer as any).telegram_chat_id,
    telegramPairingCode: (streamer as any).telegramPairingCode || (streamer as any).telegram_pairing_code,
    liveStreamUrl: streamer.liveStreamUrl || streamer.youtubeLiveUrl || '',
    broadcastUrls: (streamer as any).broadcastUrls || {
      youtube: streamer.liveStreamUrl || streamer.youtubeLiveUrl || '',
      twitch: '',
      tiktok: '',
      facebook: '',
      kick: ''
    },
    tokenUsage: tokenStats,
    socialLinks: Array.isArray(streamer.socialLinks) ? streamer.socialLinks : [],
    deletionStatus: streamer.deletionStatus || null,
    deletionRequestedAt: streamer.deletionRequestedAt
      ? new Date(streamer.deletionRequestedAt).toISOString()
      : null,
    deletionScheduledAt: streamer.deletionScheduledAt
      ? new Date(streamer.deletionScheduledAt).toISOString()
      : null,
    createdAt: streamer.createdAt,
    isAdmin: isAdminEmail(streamer.email)
  });
}
