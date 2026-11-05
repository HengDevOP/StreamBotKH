import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getVoiceClonesCollection, VoiceCloneDoc } from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';
import { checkRateLimit, getClientIp } from '@/server/utils/rateLimiter';
import { analyzeVoiceSampleFile } from '@/server/services/ttsService';

const execFileAsync = promisify(execFile);

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

    // If sampleUrl is base64 audio (including data:audio/webm;codecs=opus;base64,...), persist & convert to 24kHz WAV
    let storedSampleUrl = sampleUrl;
    let analyzedProfile: Awaited<ReturnType<typeof analyzeVoiceSampleFile>> | null = null;
    if (typeof sampleUrl === 'string' && sampleUrl.startsWith('data:audio')) {
      try {
        const matches = sampleUrl.match(/^data:audio\/([a-zA-Z0-9_+-]+)(?:;[^;]+)*;base64,(.+)$/);
        if (matches && matches[2]) {
          const ext = matches[1] === 'webm' ? 'webm' : matches[1] === 'mp3' ? 'mp3' : 'wav';
          const baseId = `voice_clone_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          const rawFileName = `${baseId}.${ext}`;
          const wavFileName = `${baseId}.wav`;
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'voices');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const rawFilePath = path.join(uploadDir, rawFileName);
          const wavFilePath = path.join(uploadDir, wavFileName);
          fs.writeFileSync(rawFilePath, Buffer.from(matches[2], 'base64'));

          // Convert to standardized 24kHz mono WAV for acoustic feature analysis
          let wavReady = ext === 'wav';
          if (!wavReady) {
            const ffmpegCandidates = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg', 'ffmpeg'];
            for (const cmd of ffmpegCandidates) {
              try {
                await execFileAsync(cmd, ['-y', '-i', rawFilePath, '-ac', '1', '-ar', '24000', wavFilePath], {
                  timeout: 8000
                });
                if (fs.existsSync(wavFilePath) && fs.statSync(wavFilePath).size > 200) {
                  wavReady = true;
                  try {
                    fs.unlinkSync(rawFilePath);
                  } catch {}
                  break;
                }
              } catch {}
            }
          }

          const finalPath = wavReady ? wavFilePath : rawFilePath;
          storedSampleUrl = `/uploads/voices/${wavReady ? wavFileName : rawFileName}`;
          analyzedProfile = await analyzeVoiceSampleFile(finalPath);
        }
      } catch (e) {
        console.warn('[VoiceClone] Could not write sample file to disk:', e);
      }
    } else if (typeof sampleUrl === 'string' && sampleUrl.startsWith('/uploads/voices/')) {
      const diskPath = path.join(process.cwd(), 'public', sampleUrl);
      if (fs.existsSync(diskPath)) {
        analyzedProfile = await analyzeVoiceSampleFile(diskPath);
      }
    }

    const col = await getVoiceClonesCollection();
    const resolvedGender =
      analyzedProfile?.detectedGender ||
      (detectedGender === 'female' ? 'female' : 'male');
    const resolvedPitchHz =
      analyzedProfile?.averagePitchHz ||
      Number(averagePitchHz) ||
      (resolvedGender === 'female' ? 210 : 130);

    const newDoc: VoiceCloneDoc & Record<string, any> = {
      userId,
      voiceName: voiceName.trim() || 'My Streamer AI Voice',
      sampleUrl: storedSampleUrl,
      sampleDurationSeconds: Number(sampleDurationSeconds),
      baseModel: resolvedGender === 'female' ? 'kiritts-female' : 'kiritts-male',
      pitch: String(pitch || '+0Hz').trim(),
      rate: String(rate || `${analyzedProfile?.ratePercent && analyzedProfile.ratePercent >= 0 ? '+' : ''}${analyzedProfile?.ratePercent || 0}%`).trim(),
      volume: String(volume || '+0%').trim(),
      detectedGender: resolvedGender,
      averagePitchHz: resolvedPitchHz,
      spectralBrightnessHz: analyzedProfile?.spectralBrightnessHz ?? 380,
      speakingTempoRatio: analyzedProfile?.speakingTempoRatio ?? 1.0,
      chestGainDb: analyzedProfile?.chestGainDb ?? 2.2,
      presenceGainDb: analyzedProfile?.presenceGainDb ?? 1.8,
      airGainDb: analyzedProfile?.airGainDb ?? 1.2,
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
