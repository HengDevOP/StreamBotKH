import { NextResponse } from 'next/server';
import { getAlertBoxesCollection } from '@/server/database/mongo';
import { ObjectId } from 'mongodb';
import { db } from '@/server/database/db';

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
      const streamer = db.prepare('SELECT overlay_token FROM streamers WHERE id = ? OR username = ?').get(box.userId, box.userId) as any;
      overlayToken = streamer?.overlay_token || null;
    } catch (e) {}

    return NextResponse.json({ success: true, alertBox: box, overlayToken });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid alert box ID' }, { status: 400 });
    }

    const body = await req.json();
    const updateFields: any = { updatedAt: new Date() };

    const allowed = [
      'name',
      'minAmountCondition',
      'isEnabled',
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
      'animationStyle'
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'minAmountCondition') {
          updateFields[key] = Math.max(0.001, Number(body[key]) >= 0 ? Number(body[key]) : 0.01);
        } else {
          updateFields[key] = body[key];
        }
      }
    }

    const col = await getAlertBoxesCollection();
    const result = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Alert box not found' }, { status: 404 });
    }

    // Synchronize to SQLite alert_settings for multi-backend consistency
    try {
      const streamer = db.prepare('SELECT id FROM streamers WHERE id = ? OR username = ? OR email = ?').get(result.userId, result.userId, result.userId) as any;
      if (streamer?.id) {
        db.prepare(`
          INSERT INTO alert_settings (streamer_id, template_style, glow_color, sound_url, sound_volume, duration_seconds, custom_gif_url, text_template)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(streamer_id) DO UPDATE SET
            template_style = excluded.template_style,
            glow_color = excluded.glow_color,
            sound_url = excluded.sound_url,
            sound_volume = excluded.sound_volume,
            duration_seconds = excluded.duration_seconds,
            custom_gif_url = excluded.custom_gif_url,
            text_template = excluded.text_template
        `).run(
          streamer.id,
          result.templateStyle || 'neon-box',
          result.glowColor || '#00F0FF',
          result.soundUrl || '/sounds/cash-register-kaching.mp3',
          Number(result.soundVolume) || 0.85,
          Number(result.durationSeconds) || 8,
          result.mediaUrl || '',
          result.textTemplate || '{donator} donated {amount} through superchat!'
        );
      }
    } catch (e) {
      console.warn('[AlertBox] Error syncing to sqlite alert_settings:', e);
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
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid alert box ID' }, { status: 400 });
    }

    const col = await getAlertBoxesCollection();
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Alert box not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Alert box deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}