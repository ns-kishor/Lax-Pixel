import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 255);
}

// GET: List coupons
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = sanitizeInput(searchParams.get('search'));
    const type = sanitizeInput(searchParams.get('type'));
    const sellerId = sanitizeInput(searchParams.get('sellerId'));

    const where: Record<string, unknown> = {};
    if (search) {
      where.code = { contains: search.toUpperCase() };
    }
    if (type && ['PRODUCT', 'SELLER_VERIFICATION'].includes(type)) {
      where.type = type;
    }
    if (sellerId) {
      where.sellerId = sellerId;
    }

    const rawCoupons = await db.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch seller names for seller-created coupons
    const sellerIds = Array.from(new Set(rawCoupons.map((c) => c.sellerId).filter(Boolean))) as string[];
    const sellers = sellerIds.length > 0 ? await db.user.findMany({
      where: { id: { in: sellerIds } },
      select: {
        id: true,
        name: true,
        email: true,
        sellerProfile: { select: { companyName: true } },
      },
    }) : [];

    const sellerMap = new Map(sellers.map((s) => [s.id, s.sellerProfile?.companyName || s.name || s.email]));

    const coupons = rawCoupons.map((c) => ({
      ...c,
      sellerName: c.sellerId ? (sellerMap.get(c.sellerId) || 'Seller') : null,
    }));

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('Admin list coupons error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Create coupon
export async function POST(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const code = sanitizeInput(body.code).toUpperCase();
    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required.' }, { status: 400 });
    }

    const type = sanitizeInput(body.type) || 'PRODUCT';
    if (!['PRODUCT', 'SELLER_VERIFICATION'].includes(type)) {
      return NextResponse.json({ error: 'Invalid coupon type.' }, { status: 400 });
    }

    const appliesTo = sanitizeInput(body.appliesTo) || 'ALL';
    const productIds = Array.isArray(body.productIds)
      ? JSON.stringify(body.productIds)
      : typeof body.productIds === 'string'
      ? body.productIds.trim()
      : null;

    const discountType = sanitizeInput(body.discountType);
    if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
      return NextResponse.json({ error: 'discountType must be PERCENTAGE or FIXED.' }, { status: 400 });
    }

    const discountValue = parseFloat(body.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: 'discountValue must be a positive number.' }, { status: 400 });
    }

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100.' }, { status: 400 });
    }

    const minOrderAmount = parseFloat(body.minOrderAmount) || 0;
    const maxUses = body.maxUses !== undefined && body.maxUses !== null && body.maxUses !== '' ? parseInt(body.maxUses, 10) : null;
    const startDate = body.startDate ? new Date(body.startDate) : null;
    const endDate = body.endDate ? new Date(body.endDate) : null;
    const active = body.active !== undefined ? Boolean(body.active) : true;

    const existing = await db.coupon.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists.' }, { status: 409 });
    }

    const coupon = await db.coupon.create({
      data: {
        code,
        type,
        appliesTo,
        productIds,
        discountType,
        discountValue,
        minOrderAmount,
        maxUses,
        startDate,
        endDate,
        active,
        banned: false,
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error('Admin create coupon error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update coupon
export async function PATCH(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required (query param).' }, { status: 400 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.code !== undefined) {
      data.code = sanitizeInput(body.code).toUpperCase();
    }
    if (body.type !== undefined) {
      const t = sanitizeInput(body.type);
      if (['PRODUCT', 'SELLER_VERIFICATION'].includes(t)) {
        data.type = t;
      }
    }
    if (body.appliesTo !== undefined) {
      data.appliesTo = sanitizeInput(body.appliesTo) || 'ALL';
    }
    if (body.productIds !== undefined) {
      data.productIds = Array.isArray(body.productIds)
        ? JSON.stringify(body.productIds)
        : typeof body.productIds === 'string'
        ? body.productIds.trim()
        : null;
    }
    if (body.discountType !== undefined) {
      const dt = sanitizeInput(body.discountType);
      if (!['PERCENTAGE', 'FIXED'].includes(dt)) {
        return NextResponse.json({ error: 'discountType must be PERCENTAGE or FIXED.' }, { status: 400 });
      }
      data.discountType = dt;
    }
    if (body.discountValue !== undefined) {
      const dv = parseFloat(body.discountValue);
      if (isNaN(dv) || dv <= 0) {
        return NextResponse.json({ error: 'discountValue must be a positive number.' }, { status: 400 });
      }
      data.discountValue = dv;
    }
    if (body.minOrderAmount !== undefined) {
      data.minOrderAmount = parseFloat(body.minOrderAmount) || 0;
    }
    if (body.maxUses !== undefined) {
      data.maxUses = body.maxUses !== null && body.maxUses !== '' ? parseInt(body.maxUses, 10) : null;
    }
    if (body.startDate !== undefined) {
      data.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    if (body.endDate !== undefined) {
      data.endDate = body.endDate ? new Date(body.endDate) : null;
    }
    if (body.active !== undefined) {
      data.active = Boolean(body.active);
    }
    if (body.banned !== undefined) {
      data.banned = Boolean(body.banned);
    }

    const coupon = await db.coupon.update({
      where: { id },
      data,
    });

    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Admin update coupon error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete coupon
export async function DELETE(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required (query param).' }, { status: 400 });
    }

    const coupon = await db.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 });
    }

    await db.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete coupon error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
