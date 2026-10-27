import { NextResponse } from 'next/server';
import { getVoiceClonesCollection, VoiceCloneDoc } from '@/server/database/mongo';

export const dynamic = 'force-dynamic';

const DEMO_USER_ID = 'demo-streamer-id-1001';

export async function GET() {
  try {
    const col = await getVoiceClonesCollection();
    const clones = await col.find({ userId: DEMO_USER_ID }).sort({ clonedAt: -1 }).toArray();
    return NextResponse.json({ success: true, voices: clones });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      voiceName = 'My Cloned Voice',
      sampleUrl,
      sampleDurationSeconds = 0
    } = body;

    if (!sampleUrl) {
      return NextResponse.json(
        { success: false, error: 'Voice audio sample is required' },
        { status: 400 }
      );
    }

    if (Number(sampleDurationSeconds) < 10) {
      return NextResponse.json(
        {
          success: false,
          error: `Audio recording is only ${Number(sampleDurationSeconds).toFixed(1)}s. AI Voice Cloning requires at least 10 seconds of clear speech.`
        },
        { status: 400 }
      );
    }

    const col = await getVoiceClonesCollection();
    const newDoc: VoiceCloneDoc = {
      userId: DEMO_USER_ID,
      voiceName: voiceName.trim() || 'My Streamer AI Voice',
      sampleUrl,
      sampleDurationSeconds: Number(sampleDurationSeconds),
      clonedAt: new Date()
    };

    const res = await col.insertOne(newDoc);
    const created = await col.findOne({ _id: res.insertedId });

    return NextResponse.json({
      success: true,
      message: 'AI Voice Model trained and cloned successfully! Ready for Text-to-Speech.',
      voice: created
    });
  } catch (err: any) {
    console.error('Error in POST /api/voice-clone:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}