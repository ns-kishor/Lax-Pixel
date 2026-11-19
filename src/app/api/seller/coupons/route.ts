import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 255);
}

// GET: List coupons for the authenticated seller
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const coupons = await db.coupon.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('Seller list coupons error:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons.' }, { status: 500 });
  }
}

// POST: Create a product coupon by seller (applies exclusively to their products)
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { sellerProfile: true },
    });

    if (!user || user.role !== 'SELLER') {
      return NextResponse.json({ error: 'Only sellers can create seller coupons.' }, { status: 403 });
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
    const maxUses = body.maxUses !== undefined && body.maxUses !== null && body.maxUses !== '' ? parseInt(body.maxUses, 10) : null;
    const startDate = body.startDate ? new Date(body.startDate) : null;
    const endDate = body.endDate ? new Date(body.endDate) : null;
    const active = body.active !== undefined ? Boolean(body.active) : true;

    const existing = await db.coupon.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'This coupon code already exists. Please choose a different code.' }, { status: 409 });
    }

    const coupon = await db.coupon.create({
      data: {
        code,
        type: 'PRODUCT',
        appliesTo: 'ALL', // All products of THIS seller
        sellerId: user.id,
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
    console.error('Seller create coupon error:', error);
    return NextResponse.json({ error: 'Failed to create coupon.' }, { status: 500 });
  }
}

// PATCH: Update seller coupon
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required.' }, { status: 400 });
    }

    const existing = await db.coupon.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== userId) {
      return NextResponse.json({ error: 'Coupon not found or access denied.' }, { status: 404 });
    }

    if (existing.banned) {
      return NextResponse.json({ error: 'This coupon has been disabled/banned by admin.' }, { status: 403 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.discountType !== undefined) {
      const dt = sanitizeInput(body.discountType);
      if (['PERCENTAGE', 'FIXED'].includes(dt)) data.discountType = dt;
    }
    if (body.discountValue !== undefined) {
      const dv = parseFloat(body.discountValue);
      if (!isNaN(dv) && dv > 0) data.discountValue = dv;
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

    const updated = await db.coupon.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Seller update coupon error:', error);
    return NextResponse.json({ error: 'Failed to update coupon.' }, { status: 500 });
  }
}

// DELETE: Delete seller coupon
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required.' }, { status: 400 });
    }

    const existing = await db.coupon.findUnique({ where: { id } });
    if (!existing || existing.sellerId !== userId) {
      return NextResponse.json({ error: 'Coupon not found or access denied.' }, { status: 404 });
    }

    await db.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Seller delete coupon error:', error);
    return NextResponse.json({ error: 'Failed to delete coupon.' }, { status: 500 });
  }
}
