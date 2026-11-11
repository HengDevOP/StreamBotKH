import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getUsersCollection, getTrialConfigCollection, calculateMidnightPlanExpiration } from '@/server/database/mongo';
import { isAdminEmail } from '@/server/database/db';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to claim trial.' }, { status: 401 });
    }

    // 1. Verify global trial feature is enabled by admin
    const trialCol = await getTrialConfigCollection();
    const trialConfig = await trialCol.findOne({ id: 'pro_plan_trial' });
    const isEnabled = Boolean(trialConfig?.isEnabled);
    const durationDays = Number(trialConfig?.durationDays || 7);

    const usersCol = await getUsersCollection();
    const escapedEmail = authUser.email ? authUser.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
    const streamer = await usersCol.findOne({
      $or: [
        { userId: authUser.id },
        { id: authUser.id as any },
        ...(escapedEmail ? [{ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] : [])
      ]
    });

    if (!streamer) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    const isAdminUser = Boolean(
      (streamer as any).isAdmin ||
      isAdminEmail(streamer.email) ||
      (streamer.email && streamer.email.toLowerCase().trim() === 'hchenheng@gmail.com') ||
      (authUser.email && authUser.email.toLowerCase().trim() === 'hchenheng@gmail.com')
    );

    if (!isEnabled && !isAdminUser) {
      return NextResponse.json(
        { error: 'The 7-Day Free Trial is currently not active. Please check back later.' },
        { status: 400 }
      );
    }

    // 2. Verify user has not used the trial yet (Admin bypasses for testing)
    if (streamer.hasUsedTrial && !isAdminUser) {
      return NextResponse.json(
        { error: 'You have already used your 7-day free trial. Please upgrade to Pro to continue enjoying all features.' },
        { status: 400 }
      );
    }

    // 3. If currently has an active paid Pro subscription, prevent redundant trial claim (Admin bypasses)
    const currentPlan = String(streamer.plan || 'free').toLowerCase();
    if (currentPlan === 'pro' && streamer.planExpiresAt && new Date(streamer.planExpiresAt).getTime() > Date.now() && !isAdminUser && !streamer.trialActive) {
      return NextResponse.json(
        { error: 'You already have an active Pro plan.' },
        { status: 400 }
      );
    }

    // 4. Activate 7-day trial
    const startDate = new Date().toISOString();
    const endDate = calculateMidnightPlanExpiration(durationDays).toISOString();

    await usersCol.updateOne(
      { _id: streamer._id },
      {
        $set: {
          trialActive: true,
          trialStartDate: startDate,
          trialEndDate: endDate,
          hasUsedTrial: true, // Mark user as having used the trial
          plan: 'pro',
          dailyTokensLimit: 20000,
          planStartedAt: startDate,
          planExpiresAt: endDate,
          planDurationDays: durationDays,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: `🎉 Success! Your ${durationDays}-Day Free Pro Trial is now active. All Pro overlays and features are unlocked!`,
      trialActive: true,
      trialStartDate: startDate,
      trialEndDate: endDate,
      trialRemainingDays: durationDays,
      plan: 'pro'
    });
  } catch (err: any) {
    console.error('Error in /api/trial/claim:', err);
    return NextResponse.json({ error: err.message || 'Failed to claim trial' }, { status: 500 });
  }
}
