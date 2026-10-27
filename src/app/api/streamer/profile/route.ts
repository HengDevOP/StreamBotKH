import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(authUser.id) as any;
    if (!streamer) {
      return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: streamer.id,
      email: streamer.email,
      username: streamer.username,
      displayName: streamer.display_name,
      avatarUrl: streamer.avatar_url,
      bio: streamer.bio,
      plan: streamer.plan || 'free',
      overlayToken: streamer.overlay_token,
      telegramChatId: streamer.telegram_chat_id,
      telegramPairingCode: streamer.telegram_pairing_code
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { username, description, bio, displayName, avatarUrl, plan } = body;

    const current = db.prepare('SELECT * FROM streamers WHERE id = ?').get(authUser.id) as any;
    if (!current) {
      return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
    }

    // 1. Process and validate username if provided
    let newUsername = current.username;
    if (username !== undefined && typeof username === 'string') {
      const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
      if (cleanUsername) {
        if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
          return NextResponse.json(
            { error: 'Username must be 3-24 characters and contain only letters, numbers, and underscores.' },
            { status: 400 }
          );
        }

        // Check uniqueness if changing
        if (cleanUsername !== current.username.toLowerCase()) {
          const existing = db.prepare('SELECT id FROM streamers WHERE username = ? COLLATE NOCASE AND id != ?').get(cleanUsername, authUser.id);
          if (existing) {
            return NextResponse.json(
              { error: `The username "@${cleanUsername}" is already taken. Please choose another.` },
              { status: 400 }
            );
          }
          newUsername = cleanUsername;
        }
      }
    }

    // 2. Process description / bio
    const rawBio = description !== undefined ? description : bio;
    const newBio = rawBio !== undefined ? String(rawBio).trim() : current.bio;

    const newDisplayName = displayName !== undefined ? String(displayName).trim() : current.display_name;
    const newAvatarUrl = avatarUrl !== undefined ? String(avatarUrl).trim() : current.avatar_url;
    const newPlan = plan !== undefined ? String(plan).toLowerCase() : (current.plan || 'free');

    // 3. Update SQLite database
    db.prepare(`
      UPDATE streamers
      SET username = ?, display_name = ?, bio = ?, avatar_url = ?, plan = ?
      WHERE id = ?
    `).run(newUsername, newDisplayName, newBio, newAvatarUrl, newPlan, authUser.id);

    // 4. Synchronize with MongoDB users collection
    try {
      const usersCol = await getUsersCollection();
      await usersCol.updateOne(
        { userId: authUser.id },
        {
          $set: {
            username: newUsername,
            displayName: newDisplayName,
            avatarUrl: newAvatarUrl,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (mongoErr) {
      console.error('[MongoDB] Failed updating user profile in Mongo:', mongoErr);
    }

    const updated = db.prepare('SELECT * FROM streamers WHERE id = ?').get(authUser.id) as any;

    return NextResponse.json({
      success: true,
      message: 'Account profile updated successfully!',
      user: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        displayName: updated.display_name,
        avatarUrl: updated.avatar_url,
        bio: updated.bio,
        plan: updated.plan || 'free',
        overlayToken: updated.overlay_token,
        telegramChatId: updated.telegram_chat_id,
        telegramPairingCode: updated.telegram_pairing_code
      }
    });
  } catch (err: any) {
    console.error('API /api/streamer/profile PUT error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 });
  }
}
