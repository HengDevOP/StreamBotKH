import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { db, isAdminEmail } from '@/server/database/db';
import { getIssueReportsCollection, getUsersCollection } from '@/server/database/mongo';

function getCallerWithRole(req: NextRequest) {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) return null;

  const row = db.prepare('SELECT id, email, username, display_name, avatar_url FROM streamers WHERE id = ?').get(authUser.id) as any;
  const email = row?.email || authUser.email || '';
  return {
    id: authUser.id,
    email,
    username: row?.username || authUser.username || 'streamer',
    displayName: row?.display_name || authUser.username || 'Streamer',
    avatarUrl: row?.avatar_url || '',
    isAdmin: isAdminEmail(email)
  };
}

export async function GET(req: NextRequest) {
  try {
    const caller = getCallerWithRole(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = req.nextUrl.searchParams.get('scope');
    const fetchAll = caller.isAdmin && scope !== 'mine';

    const rows = (
      fetchAll
        ? db.prepare('SELECT * FROM issue_reports ORDER BY datetime(created_at) DESC').all()
        : db.prepare('SELECT * FROM issue_reports WHERE streamer_id = ? ORDER BY datetime(created_at) DESC').all(caller.id)
    ) as any[];

    const issues = rows.map((r) => ({
      id: r.id,
      streamerId: r.streamer_id,
      streamerUsername: r.streamer_username,
      streamerDisplayName: r.streamer_display_name,
      streamerEmail: r.streamer_email,
      streamerAvatar: r.streamer_avatar,
      title: r.title,
      category: r.category || 'bug',
      priority: r.priority || 'medium',
      description: r.description,
      status: r.status || 'open',
      adminNote: r.admin_note || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at
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
    const caller = getCallerWithRole(req);
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

    db.prepare(`
      INSERT INTO issue_reports (
        id, streamer_id, streamer_username, streamer_display_name, streamer_email, streamer_avatar,
        title, category, priority, description, status, admin_note, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', '', ?, ?)
    `).run(
      id,
      caller.id,
      caller.username,
      caller.displayName,
      caller.email,
      caller.avatarUrl,
      title,
      category,
      priority,
      description,
      now,
      now
    );

    // Sync to MongoDB Atlas
    try {
      const col = await getIssueReportsCollection();
      await col.insertOne({
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
      });
    } catch (mongoErr) {
      console.warn('[Issues POST] Non-fatal MongoDB sync warning:', mongoErr);
    }

    return NextResponse.json({
      success: true,
      issue: {
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
      }
    });
  } catch (err: any) {
    console.error('[Issues POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit issue report' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const caller = getCallerWithRole(req);
    if (!caller || !caller.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required (hchenheng@gmail.com)' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, status, adminNote, upgradeUserPlan, durationDays = 31 } = body;

    if (!id) {
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT * FROM issue_reports WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Issue report not found' }, { status: 404 });
    }

    const newStatus = status || existing.status || 'open';
    const newNote = adminNote !== undefined ? String(adminNote) : (existing.admin_note || '');
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE issue_reports
      SET status = ?, admin_note = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, newNote, now, id);

    // Optional: 1-Click upgrade reporting user to Pro for 31 days directly from the Pull Request
    if (upgradeUserPlan && existing.streamer_id) {
      const days = Math.max(1, Number(durationDays) || 31);
      const startedAt = now;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        UPDATE streamers
        SET plan = 'pro', plan_started_at = ?, plan_expires_at = ?, plan_duration_days = ?
        WHERE id = ?
      `).run(startedAt, expiresAt, days, existing.streamer_id);

      try {
        const usersCol = await getUsersCollection();
        await usersCol.updateOne(
          { userId: existing.streamer_id },
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

    // Sync to MongoDB Atlas
    try {
      const col = await getIssueReportsCollection();
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
    } catch (mongoErr) {
      console.warn('[Issues PUT] Non-fatal MongoDB sync warning:', mongoErr);
    }

    const updated = db.prepare('SELECT * FROM issue_reports WHERE id = ?').get(id) as any;
    return NextResponse.json({
      success: true,
      issue: {
        id: updated.id,
        streamerId: updated.streamer_id,
        streamerUsername: updated.streamer_username,
        streamerDisplayName: updated.streamer_display_name,
        streamerEmail: updated.streamer_email,
        streamerAvatar: updated.streamer_avatar,
        title: updated.title,
        category: updated.category,
        priority: updated.priority,
        description: updated.description,
        status: updated.status,
        adminNote: updated.admin_note || '',
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      }
    });
  } catch (err: any) {
    console.error('[Issues PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update issue report' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const caller = getCallerWithRole(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT * FROM issue_reports WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (!caller.isAdmin && existing.streamer_id !== caller.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    db.prepare('DELETE FROM issue_reports WHERE id = ?').run(id);

    try {
      const col = await getIssueReportsCollection();
      await col.deleteOne({ id });
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Issues DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete issue report' }, { status: 500 });
  }
}
