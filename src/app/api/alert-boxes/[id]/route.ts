import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAlertBoxesCollection, getUsersCollection, getAlertSettingsCollection } from '@/server/database/mongo';
import { getAuthenticatedUser } from '@/server/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid alert box ID' }, { status: 400 });
    }

    const col = await getAlertBoxesCollection();
    const box = await col.findOne({ _id: new ObjectId(id) });
    if (!box) {
      return NextResponse.json({ success: false, error: 'Alert box not found' }, { status: 404 });
    }

    let overlayToken = null;
    try {
      const usersCol = await getUsersCollection();
      const streamer = await usersCol.findOne({ $or: [{ userId: box.userId }, { id: box.userId }, { username: box.userId }] }) as any;
      overlayToken = streamer?.overlayToken || streamer?.overlay_token || null;
    } catch (e) {}

    return NextResponse.json({ success: true, alertBox: box, overlayToken });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const authUser = getAuthenticatedUser(req as any);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid alert box ID' }, { status: 400 });
    }

    const col = await getAlertBoxesCollection();
    const existing = await col.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Alert box not found' }, { status: 404 });
    }
    if (existing.userId !== authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to modify this alert box.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updateFields: any = { updatedAt: new Date(), isEnabled: true };

    const allowed = [
      'name',
      'minAmountCondition',
      'templateStyle',
      'showImage',
      'mediaUrl',
      'soundUrl',
      'soundVolume',
      'durationSeconds',
      'glowColor',
      'fontFamily',
      'fontSize',
      'ttsEnabled',
      'ttsMinAmount',
      'ttsType',
      'clonedVoiceName',
      'clonedVoiceSampleUrl',
      'textTemplate',
      'textColor',
      'donorColor',
      'amountColor',
      'messageTemplate',
      'layoutMode',
      'animationStyle',
      'capcutAnimation',
      'capcutLabel',
      'conditions'
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'name') {
          const trimmed = String(body[key]).trim().slice(0, 16);
          if (!trimmed) {
            return NextResponse.json({ success: false, error: 'Donation box name is required' }, { status: 400 });
          }
          updateFields[key] = trimmed;
        } else if (key === 'minAmountCondition') {
          updateFields[key] = Math.max(0.001, Number(body[key]) > 0 ? Number(body[key]) : 0.01);
        } else if (key === 'clonedVoiceSampleUrl') {
          const val = body[key];
          if (typeof val === 'string' && val.startsWith('data:audio')) {
            try {
              const matches = val.match(/^data:audio\/([a-zA-Z0-9_-]+);base64,(.+)$/);
              if (matches && matches[2]) {
                const ext = matches[1] === 'webm' ? 'webm' : matches[1] === 'mp3' ? 'mp3' : 'wav';
                const fileName = `box_voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
                const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'voices');
                if (!fs.existsSync(uploadDir)) {
                  fs.mkdirSync(uploadDir, { recursive: true });
                }
                fs.writeFileSync(path.join(uploadDir, fileName), Buffer.from(matches[2], 'base64'));
                updateFields[key] = `/uploads/voices/${fileName}`;
              }
            } catch (_) {
              updateFields[key] = '';
            }
          } else {
            updateFields[key] = typeof val === 'string' && val.length < 250 ? val : '';
          }
        } else if (key === 'conditions' && Array.isArray(body.conditions)) {
          const sanitized = body.conditions.slice(0, 20).map((c: any, idx: number) => ({
            ...c,
            id: String(c?.id || `cond_${Date.now()}_${idx}`),
            minAmountCondition: Math.max(0.001, Number(c?.minAmountCondition) > 0 ? Number(c.minAmountCondition) : 0.01),
            isEnabled: true
          }));
          updateFields.conditions = sanitized;
          if (sanitized.length > 0) {
            updateFields.minAmountCondition = Math.min(...sanitized.map((c: any) => c.minAmountCondition));
          }
        } else {
          updateFields[key] = body[key];
        }
      }
    }

    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id), userId: authUser.id },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Alert box not found' }, { status: 404 });
    }

    // Synchronize to MongoDB alert_settings
    try {
      const alertSettingsCol = await getAlertSettingsCollection();
      await alertSettingsCol.updateOne(
        { streamerId: result.userId },
        {
          $set: {
            templateStyle: result.templateStyle || 'neon-box',
            glowColor: result.glowColor || '#00F0FF',
            soundUrl: result.soundUrl || '/sounds/cash-register-kaching.mp3',
            soundVolume: Number(result.soundVolume) || 0.85,
            duration: Number(result.durationSeconds) || 8,
            customGifUrl: result.mediaUrl || '',
            textTemplate: result.textTemplate || '{donator} donated {amount} through superchat!',
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (e) {
      console.warn('[AlertBox] Error syncing to alert_settings on update:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Donation box updated successfully',
      alertBox: result
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const authUser = getAuthenticatedUser(req as any);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid alert box ID' }, { status: 400 });
    }

    const col = await getAlertBoxesCollection();
    const existing = await col.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Alert box not found' }, { status: 404 });
    }
    if (existing.userId !== authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to delete this alert box.' },
        { status: 403 }
      );
    }

    const result = await col.deleteOne({ _id: new ObjectId(id), userId: authUser.id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Alert box not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Alert box deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
