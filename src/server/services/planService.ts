import { getUsersCollection, getOverlayTokenHistoryCollection } from '@/server/database/mongo';

export interface ProVerificationResult {
  isPro: boolean;
  streamerId: string | null;
  plan: string;
  isAdmin: boolean;
  reason?: string;
}

/**
 * Verifies whether a given overlay token belongs to a Pro (or Admin) streamer.
 * Free plan streamers are denied access to Pro stream assets (Timer, Leaderboard, Wheel, Goal, Soundboard, etc.).
 */
export async function verifyProStreamerByToken(token: string): Promise<ProVerificationResult> {
  const cleanToken = (token || '').trim();

  // Handle demo preview token for development testing
  if (cleanToken === 'demo-token' || cleanToken === 'demo_token') {
    return {
      isPro: true,
      streamerId: 'demo-streamer-id-1001',
      plan: 'pro',
      isAdmin: false
    };
  }

  if (!cleanToken) {
    return {
      isPro: false,
      streamerId: null,
      plan: 'free',
      isAdmin: false,
      reason: 'No overlay token provided'
    };
  }

  try {
    const usersCol = await getUsersCollection();
    const histCol = await getOverlayTokenHistoryCollection();

    let streamer: any = await usersCol.findOne({
      $or: [
        { overlayToken: cleanToken },
        { overlay_token: cleanToken } as any,
        { userId: cleanToken },
        { id: cleanToken as any },
        { username: cleanToken }
      ]
    });

    if (!streamer) {
      const hist = await histCol.findOne({ token: cleanToken });
      if (hist?.streamerId) {
        streamer = await usersCol.findOne({
          $or: [
            { userId: hist.streamerId },
            { id: hist.streamerId } as any
          ]
        });
      }
    }

    if (!streamer) {
      return {
        isPro: false,
        streamerId: null,
        plan: 'free',
        isAdmin: false,
        reason: 'Streamer not found for this overlay token'
      };
    }

    const streamerId = streamer.userId || streamer.id || String(streamer._id);
    const plan = String(streamer.plan || 'free').toLowerCase();
    const isAdmin = Boolean(streamer.isAdmin);
    const isPro = isAdmin || (plan !== 'free');

    return {
      isPro,
      streamerId,
      plan,
      isAdmin,
      reason: isPro ? undefined : 'Streamer is on Free plan. Pro plan upgrade required.'
    };
  } catch (err: any) {
    console.error('[planService] Error verifying streamer pro status:', err);
    return {
      isPro: false,
      streamerId: null,
      plan: 'free',
      isAdmin: false,
      reason: 'Internal verification error'
    };
  }
}
