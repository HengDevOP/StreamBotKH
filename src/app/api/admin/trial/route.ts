import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getUsersCollection, getTrialConfigCollection } from '@/server/database/mongo';

async function checkAdmin(req: NextRequest) {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) return null;

  let row: any = null;
  try {
    const usersCol = await getUsersCollection();
    const escapedEmail = authUser.email ? authUser.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
    row = await usersCol.findOne({
      $or: [
        { userId: authUser.id },
        { id: authUser.id as any },
        ...(escapedEmail ? [{ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] : [])
      ]
    });
  } catch (e) {}

  const email = row?.email || authUser.email;
  const isAdm = Boolean(row?.isAdmin) || isAdminEmail(email) || (email && email.toLowerCase().trim() === 'hchenheng@gmail.com');
  if (!isAdm) return null;
  return { ...authUser, email };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const trialCol = await getTrialConfigCollection();
    const trialConfig = await trialCol.findOne({ id: 'pro_plan_trial' });

    const isEnabled = Boolean(trialConfig?.isEnabled);
    const durationDays = Number(trialConfig?.durationDays || 7);
    const trialName = String(trialConfig?.trialName || '7-Day Free Pro Trial');

    const usersCol = await getUsersCollection();
    const totalUsers = await usersCol.countDocuments();
    const activeTrials = await usersCol.countDocuments({
      trialActive: true,
      trialEndDate: { $gt: new Date().toISOString() }
    });
    const usedTrials = await usersCol.countDocuments({ hasUsedTrial: true });
    const eligibleUsers = await usersCol.countDocuments({
      hasUsedTrial: { $ne: true },
      plan: { $in: ['free', null, ''] }
    });

    return NextResponse.json({
      success: true,
      isEnabled,
      durationDays,
      trialName,
      updatedAt: trialConfig?.updatedAt,
      updatedBy: trialConfig?.updatedBy,
      summary: {
        totalUsers,
        activeTrials,
        usedTrials,
        eligibleUsers
      }
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/trial:', err);
    return NextResponse.json({ error: err.message || 'Failed to load trial settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const trialCol = await getTrialConfigCollection();
    const usersCol = await getUsersCollection();

    // 1. Action: Reset trial eligibility for a specific user
    if (body.action === 'reset_user_trial' && body.userId) {
      const target = await usersCol.findOne({
        $or: [{ userId: body.userId }, { id: body.userId }]
      });
      if (!target) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      await usersCol.updateOne(
        { _id: target._id },
        {
          $set: {
            hasUsedTrial: false,
            trialActive: false,
            trialEnded: false,
            trialStartDate: null,
            trialEndDate: null,
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: `Successfully reset trial eligibility for ${target.username || target.email}. User can now claim the free trial again.`
      });
    }

    // 2. Action: Manually grant trial to a specific user
    if (body.action === 'grant_user_trial' && body.userId) {
      const target = await usersCol.findOne({
        $or: [{ userId: body.userId }, { id: body.userId }]
      });
      if (!target) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const days = Number(body.days || 7);
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await usersCol.updateOne(
        { _id: target._id },
        {
          $set: {
            trialActive: true,
            trialStartDate: startDate,
            trialEndDate: endDate,
            hasUsedTrial: true,
            plan: 'pro',
            planStartedAt: startDate,
            planExpiresAt: endDate,
            planDurationDays: days,
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: `Granted ${days}-day Pro trial to ${target.username || target.email}.`
      });
    }

    // 3. Action: Update global trial feature toggle and duration
    const isEnabled = Boolean(body.isEnabled);
    const durationDays = Math.max(1, Math.min(30, Number(body.durationDays || 7)));
    const trialName = String(body.trialName || '7-Day Free Pro Trial');

    await trialCol.updateOne(
      { id: 'pro_plan_trial' },
      {
        $set: {
          id: 'pro_plan_trial',
          isEnabled,
          durationDays,
          trialName,
          updatedBy: admin.email,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      isEnabled,
      durationDays,
      trialName,
      message: isEnabled
        ? `7-Day Free Trial feature is now ENABLED for all eligible streamers!`
        : `7-Day Free Trial feature has been DISABLED.`
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/trial:', err);
    return NextResponse.json({ error: err.message || 'Failed to update trial settings' }, { status: 500 });
  }
}
