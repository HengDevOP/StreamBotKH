import { NextResponse } from 'next/server';
import { getAlertBoxesCollection } from '@/server/database/mongo';
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

    return NextResponse.json({ success: true, alertBox: box });
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
      'messageTemplate',
      'layoutMode',
      'animationStyle'
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updateFields[key] = body[key];
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

    return NextResponse.json({
      success: true,
      message: 'Donation box updated successfully',
      alertBox: result
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

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