import { NextResponse } from 'next/server';
import { getAlertBoxesCollection, AlertBoxDoc } from '@/server/database/mongo';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

const DEMO_USER_ID = 'demo-streamer-id-1001';

export async function GET(req: Request) {
  try {
    const col = await getAlertBoxesCollection();
    let boxes = await col.find({ userId: DEMO_USER_ID }).sort({ minAmountCondition: 1 }).toArray();

    // If no alert boxes exist yet, create default boxes: Standard ($1.00) and VIP Whale ($10.00)
    if (boxes.length === 0) {
      const defaultBoxes: AlertBoxDoc[] = [
        {
          userId: DEMO_USER_ID,
          name: 'Standard Tip Alert',
          minAmountCondition: 1.0,
          isEnabled: true,
          templateStyle: 'neon-box',
          showImage: true,
          mediaUrl: 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif',
          soundUrl: '/sounds/neon-chime.mp3',
          soundVolume: 0.85,
          durationSeconds: 8,
          glowColor: '#00F0FF',
          fontFamily: 'Chakra Petch',
          fontSize: 24,
          ttsEnabled: true,
          ttsMinAmount: 1.0,
          ttsType: 'google',
          textTemplate: '{donator} donated {amount} through superchat!',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          userId: DEMO_USER_ID,
          name: 'VIP Whale Alert ($10+)',
          minAmountCondition: 10.0,
          isEnabled: true,
          templateStyle: 'cyber-glitch',
          showImage: true,
          mediaUrl: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',
          soundUrl: '/sounds/victory-chime.mp3',
          soundVolume: 0.95,
          durationSeconds: 12,
          glowColor: '#FFE600',
          fontFamily: 'Orbitron',
          fontSize: 28,
          ttsEnabled: true,
          ttsMinAmount: 10.0,
          ttsType: 'kiritts-male',
          textTemplate: '{donator} donated {amount} through superchat!',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await col.insertMany(defaultBoxes);
      boxes = await col.find({ userId: DEMO_USER_ID }).sort({ minAmountCondition: 1 }).toArray();
    }

    return NextResponse.json({ success: true, alertBoxes: boxes });
  } catch (err: any) {
    console.error('Error in GET /api/alert-boxes:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
      messageTemplate,
      layoutMode = 'top',
      animationStyle = 'bounce'
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Donation box name is required' }, { status: 400 });
    }

    const col = await getAlertBoxesCollection();
    const newDoc: AlertBoxDoc = {
      userId: DEMO_USER_ID,
      name: name.trim(),
      minAmountCondition: Math.max(0.1, Number(minAmountCondition) || 1.0),
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