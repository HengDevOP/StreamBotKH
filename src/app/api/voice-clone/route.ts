import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ObjectId } from 'mongodb';
import {
  getVoiceClonesCollection,
  VoiceCloneDoc,
  getAlertSettingsCollection,
  getAlertBoxesCollection,
  getUsersCollection
} from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';
import { analyzeVoiceSampleFile } from '@/server/services/ttsService';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

const DEMO_USER_ID = 'demo-streamer-id-1001';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    const queryToken = req.nextUrl?.searchParams?.get('token') || req.nextUrl?.searchParams?.get('userId');
    let userId = user?.id;

    if (!userId && queryToken) {
      try {
        const usersCol = await getUsersCollection();
        const streamer = (await usersCol.findOne({
          $or: [
            { overlayToken: queryToken },
            { overlay_token: queryToken },
            { userId: queryToken },
            { id: queryToken },
            { username: queryToken }
          ]
        })) as any;
        if (streamer?.userId || streamer?.id) {
          userId = streamer.userId || streamer.id;
        }
      } catch (e) {}
    }

    if (!userId) {
      userId = DEMO_USER_ID;
    }

    const col = await getVoiceClonesCollection();
    const clones = await col.find({
      $or: [{ userId }, { userId: DEMO_USER_ID }]
    }).sort({ clonedAt: -1 }).toArray();

    // Check active alert TTS voice configuration
    let activeClonedVoiceName: string | null = null;
    let isClonedActive = false;

    try {
      const alertCol = await getAlertSettingsCollection();
      const settings = (await alertCol.findOne({
        $or: [{ streamerId: userId }, { streamer_id: userId as any }]
      })) as any;

      if (settings?.ttsType === 'cloned' || settings?.ttsVoice === 'cloned') {
        isClonedActive = true;
        activeClonedVoiceName = settings?.clonedVoiceName || (clones[0]?.voiceName ?? null);
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      voices: clones,
      activeClonedVoiceName,
      isClonedActive,
      maxAllowedVoices: 3,
      count: clones.length
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = getAuthenticatedUser(req);
    let userId = user?.id;

    if (!userId) {
      const token =
        body.token ||
        body.overlayToken ||
        body.userId ||
        req.headers.get('x-streamer-token') ||
        req.nextUrl?.searchParams?.get('token') ||
        '';

      if (token) {
        try {
          const usersCol = await getUsersCollection();
          const streamer = (await usersCol.findOne({
            $or: [
              { overlayToken: token },
              { overlay_token: token },
              { userId: token },
              { id: token },
              { username: token }
            ]
          })) as any;
          if (streamer?.userId || streamer?.id) {
            userId = streamer.userId || streamer.id;
          }
        } catch (e) {}
      }
    }

    if (!userId) {
      userId = DEMO_USER_ID;
    }

    // ACTION: Set this cloned voice as the active TTS voice for all donation alerts
    if (body.action === 'set_active_alert_voice') {
      const { voiceName, sampleUrl } = body;
      if (!voiceName) {
        return NextResponse.json({ success: false, error: 'Voice name is required' }, { status: 400 });
      }

      const alertCol = await getAlertSettingsCollection();
      await alertCol.updateOne(
        { $or: [{ streamerId: userId }, { streamer_id: userId as any }] },
        {
          $set: {
            ttsEnabled: true,
            tts_enabled: 1,
            ttsType: 'cloned',
            ttsVoice: 'cloned',
            tts_voice: 'cloned',
            clonedVoiceName: voiceName,
            clonedVoiceSampleUrl: sampleUrl || null,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      // Also propagate to all active alert boxes for this streamer
      try {
        const boxesCol = await getAlertBoxesCollection();
        await boxesCol.updateMany(
          { userId },
          {
            $set: {
              ttsEnabled: true,
              ttsType: 'cloned',
              clonedVoiceName: voiceName,
              clonedVoiceSampleUrl: sampleUrl || null
            }
          }
        );
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `"${voiceName}" is now set as the active voice for live donation alerts!`
      });
    }

    // ACTION: Reset alert TTS to standard voice
    if (body.action === 'reset_default_voice') {
      const alertCol = await getAlertSettingsCollection();
      await alertCol.updateOne(
        { $or: [{ streamerId: userId }, { streamer_id: userId as any }] },
        {
          $set: {
            ttsType: 'google',
            ttsVoice: 'Google US English',
            clonedVoiceName: null,
            clonedVoiceSampleUrl: null,
            updatedAt: new Date()
          }
        }
      );

      try {
        const boxesCol = await getAlertBoxesCollection();
        await boxesCol.updateMany(
          { userId },
          {
            $set: {
              ttsType: 'google',
              clonedVoiceName: null,
              clonedVoiceSampleUrl: null
            }
          }
        );
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: 'Donation alerts TTS reset to standard voice.'
      });
    }

    // DEFAULT ACTION: TRAIN AND CLONE NEW VOICE
    // All voice cloning features unlocked for free plan creators as well

    // 2. Enforce 3 Cloned Voices maximum limit
    const MAX_CLONED_VOICES = 3;
    const voiceCol = await getVoiceClonesCollection();
    const existingCount = await voiceCol.countDocuments({
      $or: [{ userId }, ...(userId === DEMO_USER_ID ? [{ userId: DEMO_USER_ID }] : [])]
    });

    if (existingCount >= MAX_CLONED_VOICES) {
      return NextResponse.json(
        {
          success: false,
          error: `Pro plan allows up to ${MAX_CLONED_VOICES} cloned voices. You have already reached the limit (${existingCount}/${MAX_CLONED_VOICES}). Please delete an existing voice model before creating a new one.`
        },
        { status: 400 }
      );
    }

    const {
      voiceName = 'My Streamer AI Voice',
      sampleUrl,
      sampleDurationSeconds = 0,
      baseModel = 'neural-male',
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

    // Require at least 5 seconds clean speech recording (supports 5s - 15s or longer)
    if (Number(sampleDurationSeconds) < 4.8) {
      return NextResponse.json(
        {
          success: false,
          error: `Audio recording is ${Number(sampleDurationSeconds).toFixed(1)}s. AI Voice Cloning requires at least 5 seconds of clean speech (5s - 15s or longer).`
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

    const finalBaseModel =
      baseModel && baseModel !== 'auto'
        ? String(baseModel).toLowerCase().trim()
        : resolvedGender === 'female'
        ? 'neural-female'
        : 'neural-male';

    const derivedPitch = analyzedProfile?.pitchOffsetHz !== undefined && analyzedProfile.pitchOffsetHz !== 0
      ? `${analyzedProfile.pitchOffsetHz > 0 ? '+' : ''}${analyzedProfile.pitchOffsetHz}Hz`
      : String(pitch || '+0Hz').trim();

    const derivedRate = analyzedProfile?.ratePercent !== undefined && analyzedProfile.ratePercent !== 0
      ? `${analyzedProfile.ratePercent > 0 ? '+' : ''}${analyzedProfile.ratePercent}%`
      : String(rate || '+0%').trim();

    const newDoc: VoiceCloneDoc & Record<string, any> = {
      userId,
      voiceName: voiceName.trim() || 'My Streamer AI Voice',
      sampleUrl: storedSampleUrl,
      sampleDurationSeconds: Number(sampleDurationSeconds),
      baseModel: finalBaseModel,
      pitch: derivedPitch,
      rate: derivedRate,
      volume: String(volume || '+0%').trim(),
      detectedGender: resolvedGender,
      averagePitchHz: resolvedPitchHz,
      soundStyle: analyzedProfile?.soundStyle || 'Warm & Conversational',
      pacingLabel: analyzedProfile?.pacingLabel || 'Natural (1.0x)',
      timbre: analyzedProfile?.timbre || String(timbre || 'natural voice'),
      tau: analyzedProfile?.tau ?? 0.19,
      f0Std: analyzedProfile?.f0Std ?? 18,
      spectralBrightnessHz: analyzedProfile?.spectralBrightnessHz ?? 380,
      speakingTempoRatio: analyzedProfile?.speakingTempoRatio ?? 1.0,
      chestGainDb: analyzedProfile?.chestGainDb ?? 2.0,
      presenceGainDb: analyzedProfile?.presenceGainDb ?? 1.8,
      airGainDb: analyzedProfile?.airGainDb ?? 1.2,
      clonedAt: new Date()
    };

    const res = await col.insertOne(newDoc);
    const created = await col.findOne({ _id: res.insertedId });

    return NextResponse.json({
      success: true,
      message: 'AI Voice Model trained and cloned with Neural Voice engine! Ready for Donation TTS.',
      voice: created
    });
  } catch (err: any) {
    console.error('Error in POST /api/voice-clone:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    let userId = user?.id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const queryToken =
      searchParams.get('token') ||
      searchParams.get('userId') ||
      req.headers.get('x-streamer-token');

    if (!userId && queryToken) {
      try {
        const usersCol = await getUsersCollection();
        const streamer = (await usersCol.findOne({
          $or: [
            { overlayToken: queryToken },
            { overlay_token: queryToken },
            { userId: queryToken },
            { id: queryToken },
            { username: queryToken }
          ]
        })) as any;
        if (streamer?.userId || streamer?.id) {
          userId = streamer.userId || streamer.id;
        }
      } catch (e) {}
    }

    if (!userId) {
      userId = DEMO_USER_ID;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Voice ID is required' }, { status: 400 });
    }

    const col = await getVoiceClonesCollection();
    let query: any = {
      $or: [{ userId }, { userId: DEMO_USER_ID }]
    };
    if (ObjectId.isValid(id)) {
      query._id = new ObjectId(id);
    } else {
      query.id = id;
    }

    const result = await col.deleteOne(query);
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
