import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';
import { getUsersCollection } from '@/server/database/mongo';
import { sanitizeSocialLinks } from '@/utils/socialPlatforms';

const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'login',
  'logout',
  'dashboard',
  'pricing',
  'resources',
  'discord',
  'donate',
  'overlay',
  'widget',
  'settings',
  'support',
  'help'
]);

async function checkUsernameAvailability(cleanUsername: string, currentUserId: string): Promise<{ available: boolean; error?: string }> {
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
    return {
      available: false,
      error: 'Username must be 3-24 characters and contain only letters, numbers, and underscores.'
    };
  }

  if (RESERVED_USERNAMES.has(cleanUsername.toLowerCase())) {
    return {
      available: false,
      error: `The username "@${cleanUsername}" is reserved. Please choose another.`
    };
  }

  // Check SQLite streamers table (case-insensitive)
  const existingSqlite = db
    .prepare('SELECT id FROM streamers WHERE LOWER(username) = LOWER(?) AND id != ?')
    .get(cleanUsername, currentUserId);

  if (existingSqlite) {
    return {
      available: false,
      error: `The username "@${cleanUsername}" is already taken. Please choose another.`
    };
  }

  // Also check MongoDB users collection (case-insensitive)
  try {
    const usersCol = await getUsersCollection();
    const escaped = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingMongo = await usersCol.findOne({
      username: { $regex: new RegExp(`^${escaped}$`, 'i') },
      userId: { $ne: currentUserId }
    });
    if (existingMongo) {
      return {
        available: false,
        error: `The username "@${cleanUsername}" is already taken. Please choose another.`
      };
    }
  } catch {
    // Non-fatal if Mongo check skipped
  }

  return { available: true };
}

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional live username availability check: GET /api/streamer/profile?checkUsername=...
    const checkParam = req.nextUrl.searchParams.get('checkUsername');
    if (checkParam !== null) {
      const clean = checkParam.replace(/^@/, '').trim().toLowerCase();
      if (!clean) {
        return NextResponse.json({ available: false, error: 'Username cannot be empty.' });
      }
      const result = await checkUsernameAvailability(clean, authUser.id);
      return NextResponse.json(result);
    }

    const streamer = db.prepare('SELECT * FROM streamers WHERE id = ?').get(authUser.id) as any;
    if (!streamer) {
      return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
    }

    let customThanks = streamer.custom_thanks_message || '';
    let userSocialLinks: any[] = [];

    // Parse social links from SQLite fallback
    if (streamer.social_links) {
      try {
        userSocialLinks = JSON.parse(streamer.social_links);
      } catch (e) {}
    }

    try {
      const usersCol = await getUsersCollection();
      const mongoUser = await usersCol.findOne({ userId: authUser.id });
      if (mongoUser?.customThanksMessage) {
        customThanks = mongoUser.customThanksMessage;
      }
      if (Array.isArray(mongoUser?.socialLinks) && mongoUser.socialLinks.length > 0) {
        userSocialLinks = mongoUser.socialLinks;
      }
    } catch (e) {}

    return NextResponse.json({
      id: streamer.id,
      email: streamer.email,
      username: streamer.username,
      displayName: streamer.display_name,
      avatarUrl: streamer.avatar_url,
      bio: streamer.bio,
      customThanksMessage: customThanks,
      socialLinks: userSocialLinks,
      links: userSocialLinks,
      isVerified: streamer.is_verified === 1,
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
    const { username, description, bio, displayName, avatarUrl, plan, customThanksMessage } = body;
    const incomingLinks = body.socialLinks !== undefined ? body.socialLinks : body.links;

    const current = db.prepare('SELECT * FROM streamers WHERE id = ?').get(authUser.id) as any;
    if (!current) {
      return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
    }

    // 1. Process and validate username if provided
    let newUsername = current.username;
    if (username !== undefined && typeof username === 'string') {
      const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
      if (!cleanUsername) {
        return NextResponse.json({ error: 'Username cannot be empty.' }, { status: 400 });
      }

      if (cleanUsername !== current.username.toLowerCase()) {
        const check = await checkUsernameAvailability(cleanUsername, authUser.id);
        if (!check.available) {
          return NextResponse.json({ error: check.error }, { status: 400 });
        }
        newUsername = cleanUsername;
      }
    }

    // 2. Process description / bio
    const rawBio = description !== undefined ? description : bio;
    const newBio = rawBio !== undefined ? String(rawBio).trim() : current.bio;

    const newDisplayName = displayName !== undefined ? String(displayName).trim() : current.display_name;
    const newAvatarUrl = avatarUrl !== undefined ? String(avatarUrl).trim() : current.avatar_url;
    const newPlan = plan !== undefined ? String(plan).toLowerCase() : (current.plan || 'free');
    const newThanks = customThanksMessage !== undefined ? String(customThanksMessage).trim() : (current.custom_thanks_message || '');

    // 3. Process social links with plan limits: Free (1 link), Pro (5 links)
    const isPro = newPlan === 'pro';
    let currentLinks: any[] = [];
    if (current.social_links) {
      try {
        currentLinks = JSON.parse(current.social_links);
      } catch (e) {}
    }

    let finalLinks = currentLinks;
    if (incomingLinks !== undefined) {
      if (!Array.isArray(incomingLinks)) {
        return NextResponse.json({ error: 'Social links must be an array' }, { status: 400 });
      }
      if (!isPro && incomingLinks.length > 1) {
        return NextResponse.json({
          error: 'Free plan is limited to 1 link. Upgrade to Pro to add up to 5 links!'
        }, { status: 400 });
      }
      if (isPro && incomingLinks.length > 5) {
        return NextResponse.json({
          error: 'Pro plan allows a maximum of 5 links.'
        }, { status: 400 });
      }
      finalLinks = sanitizeSocialLinks(incomingLinks, isPro);
    }

    // 4. Update SQLite database
    db.prepare(`
      UPDATE streamers
      SET username = ?, display_name = ?, bio = ?, avatar_url = ?, plan = ?, custom_thanks_message = ?, social_links = ?
      WHERE id = ?
    `).run(newUsername, newDisplayName, newBio, newAvatarUrl, newPlan, newThanks, JSON.stringify(finalLinks), authUser.id);

    // 5. Synchronize with MongoDB users collection
    try {
      const usersCol = await getUsersCollection();
      await usersCol.updateOne(
        { userId: authUser.id },
        {
          $set: {
            username: newUsername,
            displayName: newDisplayName,
            avatarUrl: newAvatarUrl,
            bio: newBio,
            customThanksMessage: newThanks,
            socialLinks: finalLinks,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (mongoErr) {
      console.error('[MongoDB] Failed updating user profile in Mongo:', mongoErr);
    }

    // 6. Cascade username changes to related collections (gateway_settings & temporary_donations)
    if (newUsername !== current.username) {
      try {
        const { getGatewayConfigCollection, getTemporaryDonationsCollection } = await import('@/server/database/mongo');
        const gatewayCol = await getGatewayConfigCollection();
        await gatewayCol.updateMany(
          { $or: [{ streamerId: authUser.id }, { _id: `khqr_${authUser.id}` }] },
          { $set: { streamerUsername: newUsername, updatedAt: new Date() } }
        );

        const tempCol = await getTemporaryDonationsCollection();
        await tempCol.updateMany(
          { streamerId: authUser.id },
          { $set: { streamerUsername: newUsername } }
        );
      } catch (cascadeErr) {
        console.warn('[Profile PUT] Cascade username update warning:', cascadeErr);
      }
    }

    const updated = db.prepare('SELECT * FROM streamers WHERE id = ?').get(authUser.id) as any;

    // 7. Issue refreshed JWT token with the new username
    let newToken: string | undefined;
    try {
      const { generateToken } = await import('@/app/api/auth/google/route');
      newToken = generateToken({
        id: updated.id,
        username: updated.username,
        email: updated.email
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Account profile updated successfully!',
      token: newToken,
      user: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        displayName: updated.display_name,
        avatarUrl: updated.avatar_url,
        bio: updated.bio,
        customThanksMessage: updated.custom_thanks_message || newThanks,
        socialLinks: finalLinks,
        links: finalLinks,
        isVerified: updated.is_verified === 1,
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
