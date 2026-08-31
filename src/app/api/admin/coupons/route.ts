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

    const where: Record<string, unknown> = {};
    if (search) {
      where.code = { contains: search.toUpperCase() };
    }

    const coupons = await db.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

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
    const maxUses = body.maxUses !== undefined && body.maxUses !== null ? parseInt(body.maxUses, 10) : null;
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
        discountType,
        discountValue,
        minOrderAmount,
        maxUses,
        startDate,
        endDate,
        active,
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
      data.maxUses = body.maxUses !== null ? parseInt(body.maxUses, 10) : null;
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

    if (coupon.usedCount > 0) {
      return NextResponse.json({ error: 'Cannot delete coupon that has been used.' }, { status: 400 });
    }

    await db.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete coupon error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
