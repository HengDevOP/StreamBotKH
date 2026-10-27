import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAuthenticatedUser } from '@/server/auth';
import { db } from '@/server/database/db';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const newToken = 'ovl_' + uuidv4().replace(/-/g, '').slice(0, 24);
    db.prepare('UPDATE streamers SET overlay_token = ? WHERE id = ?').run(newToken, user.id);

    return NextResponse.json({ success: true, overlayToken: newToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
