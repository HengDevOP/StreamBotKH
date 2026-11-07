import { NextRequest, NextResponse } from 'next/server';
import {
  getSubscriberSettingsCollection,
  getUsersCollection
} from '@/server/database/mongo';
import { DEFAULT_SUBSCRIBER_TIERS } from '@/types/subscriber';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    if (!username) {
      return NextResponse.json({ success: false, error: 'Username required' }, { status: 400 });
    }

    const cleanUsername = username.replace(/^@/, '').trim();
    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({
      username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Streamer not found' }, { status: 404 });
    }

    const settingsCol = await getSubscriberSettingsCollection();
    const docs = await settingsCol.find({
      $or: [
        { streamerUsername: user.username },
        { streamerToken: user.overlayToken }
      ]
    }).sort({ updatedAt: -1, _id: -1 }).toArray();

    const settings = docs.find((d: any) => Array.isArray(d.tiers) && d.tiers.length > 0) || docs[0];

    const rawTiers = Array.isArray(settings?.tiers) ? settings.tiers : [];
    const activeTiers = rawTiers.filter((t: any) => t.enabled !== false);

    return NextResponse.json({
      success: true,
      enabled: activeTiers.length > 0,
      tiers: activeTiers
    });
  } catch (error: any) {
    console.error('Failed to fetch public subscriber tiers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
