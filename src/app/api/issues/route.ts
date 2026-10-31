import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getIssueReportsCollection, getUsersCollection } from '@/server/database/mongo';

async function getCallerWithRole(req: NextRequest) {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) return null;

  let row: any = null;
  try {
    const usersCol = await getUsersCollection();
    row = await usersCol.findOne({ userId: authUser.id });
  } catch (e) {}

  const email = row?.email || authUser.email || '';
  return {
    id: authUser.id,
    email,
    username: row?.username || authUser.username || 'streamer',
    displayName: row?.displayName || authUser.username || 'Streamer',
    avatarUrl: row?.avatarUrl || '',
    isAdmin: isAdminEmail(email)
  };
}

export async function GET(req: NextRequest) {
  try {
    const caller = await getCallerWithRole(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = req.nextUrl.searchParams.get('scope');
    const fetchAll = caller.isAdmin && scope !== 'mine';

    const col = await getIssueReportsCollection();
    const query: any = fetchAll ? {} : { streamerId: caller.id };

    const rows = await col.find(query).sort({ createdAt: -1 }).toArray();

    const issues = rows.map((r: any) => ({
      id: r.id,
      streamerId: r.streamerId || r.streamer_id,
      streamerUsername: r.streamerUsername || r.streamer_username,
      streamerDisplayName: r.streamerDisplayName || r.streamer_display_name,
      streamerEmail: r.streamerEmail || r.streamer_email,
      streamerAvatar: r.streamerAvatar || r.streamer_avatar,
      title: r.title,
      category: r.category || 'bug',
      priority: r.priority || 'medium',
      description: r.description,
      status: r.status || 'open',
      adminNote: r.adminNote || r.admin_note || '',
      createdAt: r.createdAt || r.created_at,
      updatedAt: r.updatedAt || r.updated_at
    }));

    const summary = {
      total: issues.length,
      open: issues.filter((i) => i.status === 'open').length,
      inProgress: issues.filter((i) => i.status === 'in_progress').length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
      closed: issues.filter((i) => i.status === 'closed').length
    };

    return NextResponse.json({ issues, summary });
  } catch (err: any) {
    console.error('[Issues GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch issue reports' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await getCallerWithRole(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const category = String(body.category || 'bug').trim();
    const priority = String(body.priority || 'medium').trim();

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const id = 'PR-' + Math.floor(1000 + Math.random() * 9000) + '-' + uuidv4().slice(0, 4).toUpperCase();
    const now = new Date().toISOString();

    const newIssue = {
      id,
      streamerId: caller.id,
      streamerUsername: caller.username,
      streamerDisplayName: caller.displayName,
      streamerEmail: caller.email,
      streamerAvatar: caller.avatarUrl,
      title,
      category,
      priority,
      description,
      status: 'open',
      adminNote: '',
      createdAt: now,
      updatedAt: now
    };

    const col = await getIssueReportsCollection();
    await col.insertOne(newIssue);

    return NextResponse.json({
      success: true,
      issue: newIssue
    });
  } catch (err: any) {
    console.error('[Issues POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit issue report' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const caller = await getCallerWithRole(req);
    if (!caller || !caller.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required (hchenheng@gmail.com)' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, status, adminNote, upgradeUserPlan, durationDays = 31 } = body;

    if (!id) {
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
    }

    const col = await getIssueReportsCollection();
    const existing = await col.findOne({ id }) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Issue report not found' }, { status: 404 });
    }

    const newStatus = status || existing.status || 'open';
    const newNote = adminNote !== undefined ? String(adminNote) : (existing.adminNote || existing.admin_note || '');
    const now = new Date().toISOString();

    await col.updateOne(
      { id },
      {
        $set: {
          status: newStatus,
          adminNote: newNote,
          updatedAt: now
        }
      }
    );

    // Optional: 1-Click upgrade reporting user to Pro for 31 days directly from the Pull Request
    const existingStreamerId = existing.streamerId || existing.streamer_id;
    if (upgradeUserPlan && existingStreamerId) {
      const days = Math.max(1, Number(durationDays) || 31);
      const startedAt = now;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      try {
        const usersCol = await getUsersCollection();
        await usersCol.updateOne(
          { userId: existingStreamerId },
          {
            $set: {
              plan: 'pro',
              planStartedAt: startedAt,
              planExpiresAt: expiresAt,
              planDurationDays: days,
              updatedAt: new Date()
            }
          }
        );
      } catch (e) {}
    }

    const updated = await col.findOne({ id }) as any;
    return NextResponse.json({
      success: true,
      issue: {
        id: updated.id,
        streamerId: updated.streamerId || updated.streamer_id,
        streamerUsername: updated.streamerUsername || updated.streamer_username,
        streamerDisplayName: updated.streamerDisplayName || updated.streamer_display_name,
        streamerEmail: updated.streamerEmail || updated.streamer_email,
        streamerAvatar: updated.streamerAvatar || updated.streamer_avatar,
        title: updated.title,
        category: updated.category,
        priority: updated.priority,
        description: updated.description,
        status: updated.status,
        adminNote: updated.adminNote || updated.admin_note || '',
        createdAt: updated.createdAt || updated.created_at,
        updatedAt: updated.updatedAt || updated.updated_at
      }
    });
  } catch (err: any) {
    console.error('[Issues PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update issue report' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const caller = await getCallerWithRole(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
    }

    const col = await getIssueReportsCollection();
    const existing = await col.findOne({ id }) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const existingStreamerId = existing.streamerId || existing.streamer_id;
    if (!caller.isAdmin && existingStreamerId !== caller.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await col.deleteOne({ id });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Issues DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete issue report' }, { status: 500 });
  }
}
