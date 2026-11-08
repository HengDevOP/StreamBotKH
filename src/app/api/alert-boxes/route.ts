import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
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
    const authUser = getAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in to create alert boxes.' },
        { status: 401 }
      );
    }
    const userId = authUser.id;
    const body = await req.json();
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
      capcutAnimation = '',
      capcutLabel = '',
      conditions
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: 'Donation box name is required' }, { status: 400 });
    }

    const sanitizedName = String(name).trim().slice(0, 16);
    const resolvedMinAmount = Math.max(0.001, Number(minAmountCondition) > 0 ? Number(minAmountCondition) : 0.01);

    const col = await getAlertBoxesCollection();
    const existingCount = await col.countDocuments({ userId });
    if (existingCount >= 20) {
      return NextResponse.json(
        { success: false, error: 'Maximum limit of 20 donation alert boxes reached.' },
        { status: 400 }
      );
    }

    const cleanSampleUrl = (url?: string): string | undefined => {
      if (!url) return undefined;
      if (typeof url === 'string' && url.startsWith('data:audio')) {
        try {
          const matches = url.match(/^data:audio\/([a-zA-Z0-9_-]+);base64,(.+)$/);
          if (matches && matches[2]) {
            const ext = matches[1] === 'webm' ? 'webm' : matches[1] === 'mp3' ? 'mp3' : 'wav';
            const fileName = `box_voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'voices');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            fs.writeFileSync(path.join(uploadDir, fileName), Buffer.from(matches[2], 'base64'));
            return `/uploads/voices/${fileName}`;
          }
        } catch (_) {}
        return '';
      }
      return url.length < 250 ? url : '';
    };

    const sanitizedSampleUrl = cleanSampleUrl(clonedVoiceSampleUrl);

    const sanitizedConditions = Array.isArray(conditions) && conditions.length > 0
      ? conditions.slice(0, 20).map((c: any, idx: number) => ({
          id: String(c?.id || `cond_${Date.now()}_${idx}`),
          minAmountCondition: Math.max(0.001, Number(c?.minAmountCondition) > 0 ? Number(c.minAmountCondition) : 0.01),
          isEnabled: true,
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
          clonedVoiceSampleUrl: cleanSampleUrl(c?.clonedVoiceSampleUrl) ?? sanitizedSampleUrl,
          textTemplate: c?.textTemplate || textTemplate,
          textColor: c?.textColor || textColor,
          donorColor: c?.donorColor || donorColor || undefined,
          amountColor: c?.amountColor || amountColor || undefined,
          layoutMode: c?.layoutMode || layoutMode || 'top',
          animationStyle: c?.animationStyle || animationStyle || 'fade',
          capcutAnimation: c?.capcutAnimation || capcutAnimation || '',
          capcutLabel: c?.capcutLabel || capcutLabel || ''
        }))
      : [
          {
            id: `cond_${Date.now()}_0`,
            minAmountCondition: resolvedMinAmount,
            isEnabled: true,
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
            clonedVoiceSampleUrl: sanitizedSampleUrl,
            textTemplate,
            textColor,
            donorColor: donorColor || undefined,
            amountColor: amountColor || undefined,
            layoutMode,
            animationStyle,
            capcutAnimation,
            capcutLabel
          }
        ];

    const lowestThreshold = Math.min(...sanitizedConditions.map((c: any) => c.minAmountCondition));

    const col = await getAlertBoxesCollection();
    const newDoc: AlertBoxDoc = {
      userId,
      name: sanitizedName,
      minAmountCondition: lowestThreshold,
      isEnabled: true,
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
      capcutAnimation,
      capcutLabel,
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
