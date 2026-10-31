import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/server/auth';
import { isAdminEmail } from '@/server/database/db';
import { getMongoDb, getUsersCollection } from '@/server/database/mongo';

async function checkAdmin(req: NextRequest) {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) return null;

  let row: any = null;
  try {
    const usersCol = await getUsersCollection();
    row = await usersCol.findOne({ userId: authUser.id });
  } catch (e) {}

  const email = row?.email || authUser.email;
  if (!isAdminEmail(email)) return null;
  return { ...authUser, email };
}

function formatPromotionRow(row: any) {
  const isEnabled = Boolean(row?.isEnabled === true || row?.is_enabled === 1 || row?.is_enabled === true);
  const promoTitle = row?.promoTitle || row?.promo_title || 'SPECIAL PROMOTION';
  const promoPriceUsd = Number(row?.promoPriceUsd ?? row?.promo_price_usd ?? 2.99);
  const promoPriceKhr = Number(row?.promoPriceKhr ?? row?.promo_price_khr ?? 12000);
  const originalPriceUsd = Number(row?.originalPriceUsd ?? row?.original_price_usd ?? 4.99);
  const originalPriceKhr = Number(row?.originalPriceKhr ?? row?.original_price_khr ?? 20000);
  const startDate = row?.startDate || row?.start_date || null;
  const endDate = row?.endDate || row?.end_date || null;

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

  const annualDiscountPercent = Math.max(0, Math.min(100, Number(row?.annualDiscountPercent ?? row?.annual_discount_percent ?? 10)));

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
    updatedBy: row?.updatedBy || row?.updated_by || null,
    updatedAt: row?.updatedAt || row?.updated_at || null
  };
}

export async function GET() {
  try {
    const mongoDb = await getMongoDb();
    const promoCol = mongoDb.collection('platform_promotions');
    let row = await promoCol.findOne({ id: 'pro_plan_promo' }) as any;

    if (!row) {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
      const defaultPromo = {
        id: 'pro_plan_promo',
        isEnabled: false,
        promoTitle: 'SPECIAL PROMOTION',
        promoPriceUsd: 2.99,
        promoPriceKhr: 12000,
        originalPriceUsd: 4.99,
        originalPriceKhr: 20000,
        annualDiscountPercent: 10,
        startDate: now.toISOString(),
        endDate: nextMonth.toISOString(),
        updatedAt: now.toISOString()
      };
      await promoCol.insertOne(defaultPromo);
      row = defaultPromo;
    }

    return NextResponse.json(formatPromotionRow(row));
  } catch (err: any) {
    console.error('[Promotions GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch promotion' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required (hchenheng@gmail.com)' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const mongoDb = await getMongoDb();
    const promoCol = mongoDb.collection('platform_promotions');
    const current = await promoCol.findOne({ id: 'pro_plan_promo' }) as any;

    const isEnabled =
      body.isEnabled !== undefined ? Boolean(body.isEnabled) : (current?.isEnabled ?? false);
    const promoTitle =
      body.promoTitle !== undefined
        ? String(body.promoTitle).trim() || 'SPECIAL PROMOTION'
        : current?.promoTitle || current?.promo_title || 'SPECIAL PROMOTION';
    const promoPriceUsd =
      body.promoPriceUsd !== undefined
        ? Math.max(0, Number(body.promoPriceUsd))
        : Number(current?.promoPriceUsd ?? current?.promo_price_usd ?? 2.99);
    const promoPriceKhr =
      body.promoPriceKhr !== undefined
        ? Math.max(0, Math.round(Number(body.promoPriceKhr)))
        : Number(current?.promoPriceKhr ?? current?.promo_price_khr ?? 12000);
    const originalPriceUsd =
      body.originalPriceUsd !== undefined
        ? Math.max(0.01, Number(body.originalPriceUsd))
        : Number(current?.originalPriceUsd ?? current?.original_price_usd ?? 4.99);
    const originalPriceKhr =
      body.originalPriceKhr !== undefined
        ? Math.max(100, Math.round(Number(body.originalPriceKhr)))
        : Number(current?.originalPriceKhr ?? current?.original_price_khr ?? 20000);
    const annualDiscountPercent =
      body.annualDiscountPercent !== undefined
        ? Math.max(0, Math.min(100, Math.round(Number(body.annualDiscountPercent))))
        : Math.max(0, Math.min(100, Number(current?.annualDiscountPercent ?? current?.annual_discount_percent ?? 10)));
    const startDate =
      body.startDate !== undefined ? body.startDate || null : current?.startDate || current?.start_date || null;
    const endDate =
      body.endDate !== undefined ? body.endDate || null : current?.endDate || current?.end_date || null;

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

    const updatedDoc = {
      id: 'pro_plan_promo',
      isEnabled,
      promoTitle,
      promoPriceUsd,
      promoPriceKhr,
      originalPriceUsd,
      originalPriceKhr,
      annualDiscountPercent,
      startDate,
      endDate,
      updatedBy: admin.email,
      updatedAt
    };

    await promoCol.updateOne(
      { id: 'pro_plan_promo' },
      { $set: updatedDoc },
      { upsert: true }
    );

    const formatted = formatPromotionRow(updatedDoc);

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
