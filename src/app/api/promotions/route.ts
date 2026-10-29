import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { db, isAdminEmail } from '@/server/database/db';
import { getMongoDb } from '@/server/database/mongo';

function checkAdmin(req: NextRequest) {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) return null;

  const row = db.prepare('SELECT id, email, username FROM streamers WHERE id = ?').get(authUser.id) as any;
  const email = row?.email || authUser.email;
  if (!isAdminEmail(email)) return null;
  return { ...authUser, email };
}

function formatPromotionRow(row: any) {
  const isEnabled = Boolean(row?.is_enabled === 1 || row?.is_enabled === true);
  const promoTitle = row?.promo_title || 'SPECIAL PROMOTION';
  const promoPriceUsd = Number(row?.promo_price_usd ?? 2.99);
  const promoPriceKhr = Number(row?.promo_price_khr ?? 12000);
  const originalPriceUsd = Number(row?.original_price_usd ?? 4.99);
  const originalPriceKhr = Number(row?.original_price_khr ?? 20000);
  const startDate = row?.start_date || null;
  const endDate = row?.end_date || null;

  const now = Date.now();
  const startMs = startDate ? new Date(startDate).getTime() : null;
  const endMs = endDate ? new Date(endDate).getTime() : null;

  let status: 'active' | 'scheduled' | 'expired' | 'disabled' = 'disabled';
  let isActive = false;

  if (!isEnabled) {
    status = 'disabled';
    isActive = false;
  } else if (startMs && !isNaN(startMs) && now < startMs) {
    status = 'scheduled';
    isActive = false;
  } else if (endMs && !isNaN(endMs) && now > endMs) {
    status = 'expired';
    isActive = false;
  } else {
    status = 'active';
    isActive = true;
  }

  const discountPercent =
    originalPriceUsd > 0 && promoPriceUsd < originalPriceUsd
      ? Math.round(((originalPriceUsd - promoPriceUsd) / originalPriceUsd) * 100)
      : 0;

  const annualDiscountPercent = Math.max(0, Math.min(100, Number(row?.annual_discount_percent ?? 10)));

  return {
    id: row?.id || 'pro_plan_promo',
    isEnabled,
    isActive,
    status,
    promoTitle,
    promoPriceUsd,
    promoPriceKhr,
    originalPriceUsd,
    originalPriceKhr,
    discountPercent,
    annualDiscountPercent,
    startDate,
    endDate,
    updatedBy: row?.updated_by || null,
    updatedAt: row?.updated_at || null
  };
}

export async function GET() {
  try {
    let row = db.prepare('SELECT * FROM platform_promotions WHERE id = ?').get('pro_plan_promo') as any;
    if (!row) {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
      db.prepare(`
        INSERT INTO platform_promotions (
          id, is_enabled, promo_title, promo_price_usd, promo_price_khr,
          original_price_usd, original_price_khr, start_date, end_date
        ) VALUES (?, 0, 'SPECIAL PROMOTION', 2.99, 12000, 4.99, 20000, ?, ?)
      `).run('pro_plan_promo', now.toISOString(), nextMonth.toISOString());
      row = db.prepare('SELECT * FROM platform_promotions WHERE id = ?').get('pro_plan_promo') as any;
    }

    return NextResponse.json(formatPromotionRow(row));
  } catch (err: any) {
    console.error('[Promotions GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch promotion' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = checkAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required (hchenheng@gmail.com)' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const current = db.prepare('SELECT * FROM platform_promotions WHERE id = ?').get('pro_plan_promo') as any;

    const isEnabled =
      body.isEnabled !== undefined ? (body.isEnabled ? 1 : 0) : current?.is_enabled ?? 0;
    const promoTitle =
      body.promoTitle !== undefined
        ? String(body.promoTitle).trim() || 'SPECIAL PROMOTION'
        : current?.promo_title || 'SPECIAL PROMOTION';
    const promoPriceUsd =
      body.promoPriceUsd !== undefined
        ? Math.max(0, Number(body.promoPriceUsd))
        : Number(current?.promo_price_usd ?? 2.99);
    const promoPriceKhr =
      body.promoPriceKhr !== undefined
        ? Math.max(0, Math.round(Number(body.promoPriceKhr)))
        : Number(current?.promo_price_khr ?? 12000);
    const originalPriceUsd =
      body.originalPriceUsd !== undefined
        ? Math.max(0.01, Number(body.originalPriceUsd))
        : Number(current?.original_price_usd ?? 4.99);
    const originalPriceKhr =
      body.originalPriceKhr !== undefined
        ? Math.max(100, Math.round(Number(body.originalPriceKhr)))
        : Number(current?.original_price_khr ?? 20000);
    const annualDiscountPercent =
      body.annualDiscountPercent !== undefined
        ? Math.max(0, Math.min(100, Math.round(Number(body.annualDiscountPercent))))
        : Math.max(0, Math.min(100, Number(current?.annual_discount_percent ?? 10)));
    const startDate =
      body.startDate !== undefined ? body.startDate || null : current?.start_date || null;
    const endDate =
      body.endDate !== undefined ? body.endDate || null : current?.end_date || null;

    if (startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      if (!isNaN(s) && !isNaN(e) && e <= s) {
        return NextResponse.json(
          { error: 'End date must be after the start date.' },
          { status: 400 }
        );
      }
    }

    const updatedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO platform_promotions (
        id, is_enabled, promo_title, promo_price_usd, promo_price_khr,
        original_price_usd, original_price_khr, annual_discount_percent, start_date, end_date, updated_by, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        is_enabled = excluded.is_enabled,
        promo_title = excluded.promo_title,
        promo_price_usd = excluded.promo_price_usd,
        promo_price_khr = excluded.promo_price_khr,
        original_price_usd = excluded.original_price_usd,
        original_price_khr = excluded.original_price_khr,
        annual_discount_percent = excluded.annual_discount_percent,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    `).run(
      'pro_plan_promo',
      isEnabled,
      promoTitle,
      promoPriceUsd,
      promoPriceKhr,
      originalPriceUsd,
      originalPriceKhr,
      annualDiscountPercent,
      startDate,
      endDate,
      admin.email,
      updatedAt
    );

    const updatedRow = db.prepare('SELECT * FROM platform_promotions WHERE id = ?').get('pro_plan_promo') as any;
    const formatted = formatPromotionRow(updatedRow);

    // Non-blocking sync to MongoDB Atlas
    getMongoDb()
      .then((mongoDb) =>
        mongoDb.collection('platform_promotions').updateOne(
          { id: 'pro_plan_promo' },
          { $set: { ...formatted, updatedAt: new Date(updatedAt) } },
          { upsert: true }
        )
      )
      .catch(() => {});

    return NextResponse.json({
      success: true,
      promotion: formatted
    });
  } catch (err: any) {
    console.error('[Promotions PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update promotion' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
