import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getUsersCollection, getTrialConfigCollection } from '@/server/database/mongo';
import { isAdminEmail } from '@/server/database/db';

export async function GET(req: NextRequest) {
  try {
    const trialCol = await getTrialConfigCollection();
    const trialConfig = await trialCol.findOne({ id: 'pro_plan_trial' });
    const isEnabled = Boolean(trialConfig?.isEnabled);
    const durationDays = Number(trialConfig?.durationDays || 7);

    const authUser = getAuthenticatedUser(req);
    let userEligible = false;
    let hasUsedTrial = false;
    let trialActive = false;
    let trialEndDate: string | null = null;
    let remainingDays = 0;

    if (authUser) {
      const usersCol = await getUsersCollection();
      const escapedEmail = authUser.email ? authUser.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
      const streamer = await usersCol.findOne({
        $or: [
          { userId: authUser.id },
          { id: authUser.id as any },
          ...(escapedEmail ? [{ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] : [])
        ]
      });

      if (streamer) {
        hasUsedTrial = Boolean(streamer.hasUsedTrial);
        trialActive = Boolean(
          streamer.trialActive &&
          streamer.trialEndDate &&
          new Date(streamer.trialEndDate).getTime() > Date.now()
        );
        trialEndDate = streamer.trialEndDate || null;

        if (trialActive && trialEndDate) {
          remainingDays = Math.max(1, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        }

        const plan = String(streamer.plan || 'free').toLowerCase();
        const isAdminUser = Boolean(
          (streamer as any).isAdmin ||
          isAdminEmail(streamer.email) ||
          (streamer.email && streamer.email.toLowerCase().trim() === 'hchenheng@gmail.com') ||
          (authUser.email && authUser.email.toLowerCase().trim() === 'hchenheng@gmail.com')
        );

        // Eligible if trial is globally enabled, user has not used trial yet (or is admin testing)
        userEligible = isEnabled && (!hasUsedTrial || isAdminUser) && (!trialActive || isAdminUser);
      }
    }

    return NextResponse.json({
      success: true,
      isEnabled,
      durationDays,
      userEligible,
      hasUsedTrial,
      trialActive,
      trialEndDate,
      remainingDays
    });
  } catch (err: any) {
    console.error('Error in /api/trial/settings:', err);
    return NextResponse.json({ error: 'Failed to fetch trial settings' }, { status: 500 });
  }
}
