import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { getUsersCollection, getGatewayConfigCollection, getTemporaryDonationsCollection } from '@/server/database/mongo';
import { sanitizeSocialLinks } from '@/utils/socialPlatforms';

const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'login',
  'logout',
  'dashboard',
  'pricing',
  'documents',
  'docs',
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
    // Non-fatal
  }

  return { available: true };
}

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional live username availability check
    const checkParam = req.nextUrl.searchParams.get('checkUsername');
    if (checkParam !== null) {
      const clean = checkParam.replace(/^@/, '').trim().toLowerCase();
      if (!clean) {
        return NextResponse.json({ available: false, error: 'Username cannot be empty.' });
      }
      const result = await checkUsernameAvailability(clean, authUser.id);
      return NextResponse.json(result);
    }

    const usersCol = await getUsersCollection();
    const streamer = await usersCol.findOne({
      $or: [{ userId: authUser.id }, { id: authUser.id as any }]
    });

    if (!streamer) {
      return NextResponse.json({ error: 'Streamer not found' }, { status: 404 });
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
      plan: streamer.plan || 'free',
      overlayToken: streamer.overlayToken || streamer.overlay_token,
      telegramChatId: (streamer as any).telegramChatId || (streamer as any).telegram_chat_id,
      telegramPairingCode: streamer.telegramPairingCode || (streamer as any).telegram_pairing_code
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

    const usersCol = await getUsersCollection();
    const current = await usersCol.findOne({
      $or: [{ userId: authUser.id }, { id: authUser.id as any }]
    });

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

    const newDisplayName = displayName !== undefined ? String(displayName).trim() : current.displayName;
    const newAvatarUrl = avatarUrl !== undefined ? String(avatarUrl).trim() : current.avatarUrl;
    const newPlan = plan !== undefined ? String(plan).toLowerCase() : (current.plan || 'free');
    const newThanks = customThanksMessage !== undefined ? String(customThanksMessage).trim() : (current.customThanksMessage || '');

    // 3. Process social links with plan limits: Free (1 link), Pro (5 links)
    const isPro = newPlan === 'pro';
    const currentLinks: any[] = Array.isArray(current.socialLinks) ? current.socialLinks : [];

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

    const now = new Date();

    // 4. Update MongoDB users collection
    await usersCol.updateOne(
      { _id: current._id },
      {
        $set: {
          username: newUsername,
          displayName: newDisplayName,
          bio: newBio,
          avatarUrl: newAvatarUrl,
          plan: newPlan,
          customThanksMessage: newThanks,
          socialLinks: finalLinks,
          updatedAt: now
        }
      }
    );

    // 5. Cascade username changes to related collections
    if (newUsername !== current.username) {
      try {
        const gatewayCol = await getGatewayConfigCollection();
        await gatewayCol.updateMany(
          { $or: [{ streamerId: authUser.id }, { _id: `khqr_${authUser.id}` }] },
          { $set: { streamerUsername: newUsername, updatedAt: now } }
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

    const updated = await usersCol.findOne({ _id: current._id });

    // 6. Issue refreshed JWT token with the new username
    let newToken: string | undefined;
    try {
      const { generateToken } = await import('@/app/api/auth/google/route');
      newToken = generateToken({
        id: updated?.userId || authUser.id,
        username: updated?.username || newUsername,
        email: updated?.email || authUser.email
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Account profile updated successfully!',
      token: newToken,
      user: {
        id: updated?.userId || authUser.id,
        email: updated?.email,
        username: updated?.username,
        displayName: updated?.displayName,
        avatarUrl: updated?.avatarUrl,
        bio: updated?.bio,
        customThanksMessage: updated?.customThanksMessage || newThanks,
        socialLinks: finalLinks,
        links: finalLinks,
        isVerified: Boolean(updated?.isVerified),
        plan: updated?.plan || 'free',
        overlayToken: updated?.overlayToken || updated?.overlay_token,
        telegramChatId: (updated as any)?.telegramChatId || (updated as any)?.telegram_chat_id,
        telegramPairingCode: updated?.telegramPairingCode || (updated as any)?.telegram_pairing_code
      }
    });
  } catch (err: any) {
    console.error('API /api/streamer/profile PUT error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 });
  }
}
