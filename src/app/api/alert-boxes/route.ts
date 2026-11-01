import { NextRequest, NextResponse } from 'next/server';
import { getAlertBoxesCollection, AlertBoxDoc, getUsersCollection, getAlertSettingsCollection } from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';

export const dynamic = 'force-dynamic';

const DEMO_USER_ID = 'demo-streamer-id-1001';

async function resolveStreamerUserId(req: NextRequest, bodyToken?: string): Promise<string> {
  const user = getAuthenticatedUser(req);
  if (user?.id) {
    return user.id;
  }

  const { searchParams } = new URL(req.url);
  const token = (searchParams.get('token') || bodyToken || searchParams.get('userId') || '').trim();
  if (token) {
    try {
      const usersCol = await getUsersCollection();
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const streamer = await usersCol.findOne({
        $or: [
          { overlayToken: token },
          { userId: token },
          { id: token },
          { username: { $regex: new RegExp(`^${escaped}$`, 'i') } }
        ]
      }) as any;
      if (streamer?.userId || streamer?.id) {
        return streamer.userId || streamer.id;
      }
    } catch (e) {}
  }

  return DEMO_USER_ID;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveStreamerUserId(req);
    const col = await getAlertBoxesCollection();
    const boxes = await col.find({ userId }).sort({ minAmountCondition: 1 }).toArray();

    let overlayToken = null;
    try {
      const usersCol = await getUsersCollection();
      const streamer = await usersCol.findOne({ $or: [{ userId }, { id: userId }, { username: userId }] }) as any;
      overlayToken = streamer?.overlayToken || streamer?.overlay_token || null;
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
    const userId = await resolveStreamerUserId(req, body.token);
    const {
      name,
      minAmountCondition = 0.01,
      isEnabled = true,
      templateStyle = 'neon-box',
      showImage = true,
      mediaUrl = 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
      soundUrl = '/sounds/cash-register-kaching.mp3',
      soundVolume = 0.85,
      durationSeconds = 8,
      glowColor = '#00F0FF',
      fontFamily = 'Chakra Petch',
      fontSize = 24,
      ttsEnabled = true,
      ttsMinAmount = 0.01,
      ttsType = 'google',
      clonedVoiceName,
      clonedVoiceSampleUrl,
      textTemplate = '{donator} donated {amount} through superchat!',
      textColor = '#FFFFFF',
      donorColor,
      amountColor,
      messageTemplate,
      layoutMode = 'top',
      animationStyle = 'fade',
      conditions
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Donation box name is required' }, { status: 400 });
    }

    const sanitizedName = String(name).trim().slice(0, 16);
    const resolvedMinAmount = Math.max(0.001, Number(minAmountCondition) > 0 ? Number(minAmountCondition) : 0.01);

    const sanitizedConditions = Array.isArray(conditions) && conditions.length > 0
      ? conditions.map((c: any, idx: number) => ({
          id: String(c?.id || `cond_${Date.now()}_${idx}`),
          minAmountCondition: Math.max(0.001, Number(c?.minAmountCondition) > 0 ? Number(c.minAmountCondition) : 0.01),
          isEnabled: c?.isEnabled !== false,
          templateStyle: c?.templateStyle || templateStyle || 'neon-box',
          showImage: c?.showImage !== false,
          mediaUrl: c?.mediaUrl ?? mediaUrl ?? 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
          soundUrl: c?.soundUrl || soundUrl || '/sounds/cash-register-kaching.mp3',
          soundVolume: Math.min(1, Math.max(0, Number(c?.soundVolume ?? soundVolume ?? 0.85))),
          durationSeconds: Math.min(30, Math.max(3, Number(c?.durationSeconds || durationSeconds || 8))),
          glowColor: c?.glowColor || glowColor || '#00F0FF',
          fontFamily: c?.fontFamily || fontFamily || 'Chakra Petch',
          fontSize: Number(c?.fontSize || fontSize || 24),
          ttsEnabled: c?.ttsEnabled !== false,
          ttsMinAmount: Number(c?.ttsMinAmount ?? ttsMinAmount ?? 0.01),
          ttsType: c?.ttsType || ttsType || 'google',
          clonedVoiceName: c?.clonedVoiceName ?? clonedVoiceName,
          clonedVoiceSampleUrl: c?.clonedVoiceSampleUrl ?? clonedVoiceSampleUrl,
          textTemplate: c?.textTemplate || textTemplate,
          textColor: c?.textColor || textColor,
          donorColor: c?.donorColor || donorColor || undefined,
          amountColor: c?.amountColor || amountColor || undefined,
          layoutMode: c?.layoutMode || layoutMode || 'top',
          animationStyle: c?.animationStyle || animationStyle || 'fade'
        }))
      : [
          {
            id: `cond_${Date.now()}_0`,
            minAmountCondition: resolvedMinAmount,
            isEnabled: Boolean(isEnabled),
            templateStyle: templateStyle || 'neon-box',
            showImage: showImage !== false,
            mediaUrl: mediaUrl || 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
            soundUrl: soundUrl || '/sounds/cash-register-kaching.mp3',
            soundVolume: Math.min(1, Math.max(0, Number(soundVolume) ?? 0.85)),
            durationSeconds: Math.min(30, Math.max(3, Number(durationSeconds) || 8)),
            glowColor: glowColor || '#00F0FF',
            fontFamily: fontFamily || 'Chakra Petch',
            fontSize: Number(fontSize) || 24,
            ttsEnabled: Boolean(ttsEnabled),
            ttsMinAmount: Number(ttsMinAmount) || 0.01,
            ttsType: ttsType || 'google',
            clonedVoiceName,
            clonedVoiceSampleUrl,
            textTemplate,
            textColor,
            donorColor: donorColor || undefined,
            amountColor: amountColor || undefined,
            layoutMode,
            animationStyle
          }
        ];

    const lowestThreshold = Math.min(...sanitizedConditions.map((c: any) => c.minAmountCondition));

    const col = await getAlertBoxesCollection();
    const newDoc: AlertBoxDoc = {
      userId,
      name: sanitizedName,
      minAmountCondition: lowestThreshold,
      isEnabled: Boolean(isEnabled),
      templateStyle: templateStyle || 'neon-box',
      showImage: showImage !== false,
      mediaUrl: mediaUrl || 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
      soundUrl: soundUrl || '/sounds/cash-register-kaching.mp3',
      soundVolume: Math.min(1, Math.max(0, Number(soundVolume) ?? 0.85)),
      durationSeconds: Math.min(30, Math.max(3, Number(durationSeconds) || 8)),
      glowColor: glowColor || '#00F0FF',
      fontFamily: fontFamily || 'Chakra Petch',
      fontSize: Number(fontSize) || 24,
      ttsEnabled: Boolean(ttsEnabled),
      ttsMinAmount: Number(ttsMinAmount) || 0.01,
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
      conditions: sanitizedConditions,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await col.insertOne(newDoc);
    const created = await col.findOne({ _id: result.insertedId });

    // Synchronize to MongoDB alert_settings
    try {
      const alertSettingsCol = await getAlertSettingsCollection();
      await alertSettingsCol.updateOne(
        { streamerId: userId },
        {
          $set: {
            templateStyle: created?.templateStyle || 'neon-box',
            glowColor: created?.glowColor || '#00F0FF',
            soundUrl: created?.soundUrl || '/sounds/cash-register-kaching.mp3',
            soundVolume: Number(created?.soundVolume) || 0.85,
            duration: Number(created?.durationSeconds) || 8,
            customGifUrl: created?.mediaUrl || '',
            textTemplate: created?.textTemplate || '{donator} donated {amount} through superchat!',
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (e) {
      console.warn('[AlertBox] Error syncing to alert_settings on create:', e);
    }

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
