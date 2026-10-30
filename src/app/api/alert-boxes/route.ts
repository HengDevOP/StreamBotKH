import { NextRequest, NextResponse } from 'next/server';
import { getAlertBoxesCollection, AlertBoxDoc } from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';

export const dynamic = 'force-dynamic';

const DEMO_USER_ID = 'demo-streamer-id-1001';

function resolveStreamerUserId(req: NextRequest, bodyToken?: string): string {
  const user = getAuthenticatedUser(req);
  if (user?.id) {
    return user.id;
  }

  const { searchParams } = new URL(req.url);
  const token = (searchParams.get('token') || bodyToken || searchParams.get('userId') || '').trim();
  if (token) {
    const streamer = db.prepare(`
      SELECT id FROM streamers
      WHERE overlay_token = ? OR id = ? OR LOWER(username) = LOWER(?)
    `).get(token, token, token) as any;
    if (streamer?.id) {
      return streamer.id;
    }
  }

  return DEMO_USER_ID;
}

export async function GET(req: NextRequest) {
  try {
    const userId = resolveStreamerUserId(req);
    const col = await getAlertBoxesCollection();
    const boxes = await col.find({ userId }).sort({ minAmountCondition: 1 }).toArray();

    let overlayToken = null;
    try {
      const streamer = db.prepare('SELECT overlay_token FROM streamers WHERE id = ? OR username = ?').get(userId, userId) as any;
      overlayToken = streamer?.overlay_token || null;
    } catch (e) {}

    return NextResponse.json({ success: true, alertBoxes: boxes, overlayToken });
  } catch (err: any) {
    console.error('Error in GET /api/alert-boxes:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = resolveStreamerUserId(req, body.token);
    const {
      name,
      minAmountCondition = 1.0,
      isEnabled = true,
      templateStyle = 'neon-box',
      showImage = true,
      mediaUrl = 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
      soundUrl = '/sounds/neon-chime.mp3',
      soundVolume = 0.85,
      durationSeconds = 8,
      glowColor = '#00F0FF',
      fontFamily = 'Chakra Petch',
      fontSize = 24,
      ttsEnabled = true,
      ttsMinAmount = 1.0,
      ttsType = 'google',
      clonedVoiceName,
      clonedVoiceSampleUrl,
      textTemplate = '{donator} donated {amount} through superchat!',
      textColor = '#FFFFFF',
      donorColor,
      amountColor,
      messageTemplate,
      layoutMode = 'top',
      animationStyle = 'bounce'
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Donation box name is required' }, { status: 400 });
    }

    const col = await getAlertBoxesCollection();
    const newDoc: AlertBoxDoc = {
      userId,
      name: name.trim(),
      minAmountCondition: Math.max(0.001, Number(minAmountCondition) >= 0 ? Number(minAmountCondition) : 0.01),
      isEnabled: Boolean(isEnabled),
      templateStyle: templateStyle || 'neon-box',
      showImage: showImage !== false,
      mediaUrl: mediaUrl || 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
      soundUrl: soundUrl || '/sounds/neon-chime.mp3',
      soundVolume: Math.min(1, Math.max(0, Number(soundVolume) ?? 0.85)),
      durationSeconds: Math.min(30, Math.max(3, Number(durationSeconds) || 8)),
      glowColor: glowColor || '#00F0FF',
      fontFamily: fontFamily || 'Chakra Petch',
      fontSize: Number(fontSize) || 24,
      ttsEnabled: Boolean(ttsEnabled),
      ttsMinAmount: Number(ttsMinAmount) || 1.0,
      ttsType: ttsType || 'google',
      clonedVoiceName,
      clonedVoiceSampleUrl,
      textTemplate,
      textColor,
      donorColor: donorColor || undefined,
      amountColor: amountColor || undefined,
      messageTemplate,
      layoutMode,
      animationStyle,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await col.insertOne(newDoc);
    const created = await col.findOne({ _id: result.insertedId });

    return NextResponse.json({
      success: true,
      message: 'Donation box created successfully',
      alertBox: created
    });
  } catch (err: any) {
    console.error('Error in POST /api/alert-boxes:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}