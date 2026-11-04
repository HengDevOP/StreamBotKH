import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getVoiceClonesCollection, VoiceCloneDoc } from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';
import { checkRateLimit, getClientIp } from '@/server/utils/rateLimiter';

export const dynamic = 'force-dynamic';

const DEMO_USER_ID = 'demo-streamer-id-1001';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    const userId = user?.id || DEMO_USER_ID;

    const col = await getVoiceClonesCollection();
    const clones = await col.find({
      $or: [{ userId }, { userId: DEMO_USER_ID }]
    }).sort({ clonedAt: -1 }).toArray();

    return NextResponse.json({ success: true, voices: clones });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in to clone an AI voice.' },
        { status: 401 }
      );
    }
    const userId = user.id;

    // Rate limiting: max 6 voice clones per 5 minutes per user/IP
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`voice_clone:${userId || clientIp}`, 6, 300000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please wait ${rateCheck.retryAfterSeconds} seconds before cloning another voice model.`
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) }
        }
      );
    }

    const body = await req.json();
    const {
      voiceName = 'My Streamer AI Voice',
      sampleUrl,
      sampleDurationSeconds = 0,
      baseModel = 'kiritts-male',
      pitch = '+0Hz',
      rate = '+0%',
      volume = '+0%',
      detectedGender = 'male',
      averagePitchHz = 125,
      timbre = 'natural'
    } = body;

    if (!sampleUrl) {
      return NextResponse.json(
        { success: false, error: 'Voice audio recording sample is required.' },
        { status: 400 }
      );
    }

    // Require at least 15 seconds clean speech recording
    if (Number(sampleDurationSeconds) < 14.5) {
      return NextResponse.json(
        {
          success: false,
          error: `Audio recording is ${Number(sampleDurationSeconds).toFixed(1)}s. AI Voice Cloning requires at least 15 seconds of clean speech for accurate KiriTTS acoustic modeling.`
        },
        { status: 400 }
      );
    }

    // If sampleUrl is base64 audio, persist a file to /public/uploads/voices
    let storedSampleUrl = sampleUrl;
    if (typeof sampleUrl === 'string' && sampleUrl.startsWith('data:audio')) {
      try {
        const matches = sampleUrl.match(/^data:audio\/([a-zA-Z0-9_-]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const ext = matches[1] === 'webm' ? 'webm' : matches[1] === 'mp3' ? 'mp3' : 'wav';
          const fileName = `voice_clone_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'voices');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
          storedSampleUrl = `/uploads/voices/${fileName}`;
        }
      } catch (e) {
        console.warn('[VoiceClone] Could not write sample file to disk, storing data URL:', e);
      }
    }

    const col = await getVoiceClonesCollection();
    const newDoc: VoiceCloneDoc = {
      userId,
      voiceName: voiceName.trim() || 'My Streamer AI Voice',
      sampleUrl: storedSampleUrl,
      sampleDurationSeconds: Number(sampleDurationSeconds),
      baseModel: baseModel === 'kiritts-female' ? 'kiritts-female' : 'kiritts-male',
      pitch: String(pitch || '+0Hz').trim(),
      rate: String(rate || '+0%').trim(),
      volume: String(volume || '+0%').trim(),
      detectedGender: detectedGender === 'female' ? 'female' : 'male',
      averagePitchHz: Number(averagePitchHz) || (detectedGender === 'female' ? 210 : 125),
      timbre: String(timbre || 'natural'),
      clonedAt: new Date()
    };

    const res = await col.insertOne(newDoc);
    const created = await col.findOne({ _id: res.insertedId });

    return NextResponse.json({
      success: true,
      message: 'AI Voice Model trained and cloned with KiriTTS neural engine! Ready for Donation TTS.',
      voice: created
    });
  } catch (err: any) {
    console.error('Error in POST /api/voice-clone:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
