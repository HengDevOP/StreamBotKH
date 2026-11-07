import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getUsersCollection, processExpiredAccountDeletions } from '@/server/database/mongo';
import { sendAccountDeletionRequestEmail } from '@/server/services/emailService';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/streamer/account/delete
 * Initiates a 7-day account deletion request for the authenticated streamer
 * and sends a security notification email via Nodemailer.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await processExpiredAccountDeletions();

    const body = await req.json().catch(() => ({}));
    if (!body?.acknowledgedTerms) {
      return NextResponse.json(
        { error: 'You must read and acknowledge the account deletion terms before proceeding.' },
        { status: 400 }
      );
    }

    const usersCol = await getUsersCollection();
    const escapedEmail = (authUser.email || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const streamer = await usersCol.findOne({
      $or: [
        { userId: authUser.id },
        { id: authUser.id as any },
        ...(escapedEmail ? [{ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] : [])
      ]
    });

    if (!streamer) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const now = new Date();
    const scheduledAt = new Date(now.getTime() + SEVEN_DAYS_MS);

    await usersCol.updateOne(
      { _id: streamer._id },
      {
        $set: {
          deletionStatus: 'pending',
          deletionRequestedAt: now.toISOString(),
          deletionScheduledAt: scheduledAt.toISOString(),
          updatedAt: now
        }
      }
    );

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:5173';
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'Authenticated Session';

    let emailResult: { sent: boolean; simulated?: boolean; error?: string } = {
      sent: false
    };

    if (streamer.email) {
      emailResult = await sendAccountDeletionRequestEmail({
        toEmail: streamer.email,
        displayName: streamer.displayName || streamer.username,
        username: streamer.username,
        requestedAt: now,
        scheduledDeletionAt: scheduledAt,
        ipAddress,
        dashboardUrl: origin
      });
    }

    return NextResponse.json({
      success: true,
      deletionStatus: 'pending',
      deletionRequestedAt: now.toISOString(),
      deletionScheduledAt: scheduledAt.toISOString(),
      emailSent: emailResult.sent,
      emailSimulated: Boolean(emailResult.simulated)
    });
  } catch (err: any) {
    console.error('[Account Delete POST] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to request account deletion' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/streamer/account/delete
 * Cancels an active 7-day account deletion request and restores normal account status.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await processExpiredAccountDeletions();

    const usersCol = await getUsersCollection();
    const escapedEmail = (authUser.email || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const streamer = await usersCol.findOne({
      $or: [
        { userId: authUser.id },
        { id: authUser.id as any },
        ...(escapedEmail ? [{ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }] : [])
      ]
    });

    if (!streamer) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await usersCol.updateOne(
      { _id: streamer._id },
      {
        $set: {
          deletionStatus: null,
          deletionRequestedAt: null,
          deletionScheduledAt: null,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      deletionStatus: null,
      deletionRequestedAt: null,
      deletionScheduledAt: null
    });
  } catch (err: any) {
    console.error('[Account Delete DELETE] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to cancel account deletion request' },
      { status: 500 }
    );
  }
}
