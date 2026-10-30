import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = db.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(user.id) as any;

    if (!settings) {
      db.prepare('INSERT INTO payment_settings (streamer_id) VALUES (?)').run(user.id);
      settings = db.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(user.id);
    }

    // If master_khqr_image is missing in SQLite, restore from MongoDB backup
    if (!settings?.master_khqr_image) {
      try {
        const { restoreMasterKhqrImage } = await import('@/server/database/mongo');
        const res = await restoreMasterKhqrImage(user.id, user.username);
        if (res.restored) {
          settings = db.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(user.id);
        }
      } catch (e) {}
    }

    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { aba_merchant_id, aba_api_key, bakong_account_id, bakong_account_name, is_sandbox } = body;

    db.prepare(`
      INSERT INTO payment_settings (
        streamer_id, aba_merchant_id, aba_api_key, bakong_account_id, bakong_account_name, is_sandbox
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(streamer_id) DO UPDATE SET
        aba_merchant_id = excluded.aba_merchant_id,
        aba_api_key = excluded.aba_api_key,
        bakong_account_id = excluded.bakong_account_id,
        bakong_account_name = excluded.bakong_account_name,
        is_sandbox = excluded.is_sandbox
    `).run(
      user.id,
      aba_merchant_id || 'ec439126',
      aba_api_key || 'f60b06ca198c61e8601ff7a68393ceee47cb50cb',
      bakong_account_id || 'streamneon@abaa',
      bakong_account_name || 'STREAMNEON VIP',
      is_sandbox ? 1 : 0
    );

    const updated = db.prepare('SELECT * FROM payment_settings WHERE streamer_id = ?').get(user.id);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
