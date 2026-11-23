import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { couponValidateLimiter, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // SEC-FIND-07: Rate limit coupon validation to prevent dictionary attacks
    const ip = getClientIp(req);
    const limit = couponValidateLimiter.check(ip);
    if (!limit.success) {
      return NextResponse.json({ error: limit.message }, { status: 429 });
    }

    const body = await req.json();
    const { code, type = 'PRODUCT', subtotal = 0, items = [] } = body;

    const cleanCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    if (!cleanCode) {
      return NextResponse.json({ error: 'Please enter a coupon code.' }, { status: 400 });
    }

    const coupon = await db.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid coupon code (সঠিক কুপন কোড দিন)' }, { status: 404 });
    }

    if (!coupon.active || coupon.banned) {
      return NextResponse.json({ error: 'This coupon is inactive or has been disabled.' }, { status: 400 });
    }

    if (coupon.type !== type) {
      if (type === 'PRODUCT') {
        return NextResponse.json({ error: 'This coupon cannot be used for product purchases.' }, { status: 400 });
      } else {
        return NextResponse.json({ error: 'This coupon is not valid for seller verification.' }, { status: 400 });
      }
    }

    const now = new Date();
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      return NextResponse.json({ error: 'This coupon has not started yet.' }, { status: 400 });
    }

    if (coupon.endDate && now > new Date(coupon.endDate)) {
      return NextResponse.json({ error: 'This coupon has expired (কুপনের মেয়াদ শেষ হয়ে গেছে).' }, { status: 400 });
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: 'This coupon usage limit has been reached.' }, { status: 400 });
    }

    let eligibleAmount = Number(subtotal) || 0;

    if (type === 'PRODUCT') {
      const orderItems = Array.isArray(items) ? items : [];

      // If created by a specific seller, only products from that seller are eligible
      if (coupon.sellerId) {
        const sellerItems = orderItems.filter((i: any) => i.sellerId === coupon.sellerId);
        if (sellerItems.length === 0) {
          return NextResponse.json({
            error: 'এই কুপনটি শুধুমাত্র নির্দিষ্ট বিক্রেতার প্রোডাক্টের ক্ষেত্রে প্রযোজ্য।',
          }, { status: 400 });
        }
        eligibleAmount = sellerItems.reduce((sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
      } else if (coupon.appliesTo === 'SPECIFIC' && coupon.productIds) {
        // Admin coupon targeting specific products
        let targetIds: string[] = [];
        try {
          if (coupon.productIds.startsWith('[')) {
            targetIds = JSON.parse(coupon.productIds);
          } else {
            targetIds = coupon.productIds.split(',').map((s) => s.trim()).filter(Boolean);
          }
        } catch {
          targetIds = coupon.productIds.split(',').map((s) => s.trim()).filter(Boolean);
        }

        const matchedItems = orderItems.filter((i: any) => targetIds.includes(i.productId));
        if (matchedItems.length === 0) {
          return NextResponse.json({
            error: 'এই কুপনটি নির্বাচিত প্রোডাক্টের জন্য প্রযোজ্য নয়।',
          }, { status: 400 });
        }
        eligibleAmount = matchedItems.reduce((sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
      }

      if (coupon.minOrderAmount > 0 && eligibleAmount < coupon.minOrderAmount) {
        return NextResponse.json({
          error: `এই কুপনটি ব্যবহারের জন্য ন্যূনতম ৳${coupon.minOrderAmount} টাকার প্রোডাক্ট অর্ডার করতে হবে।`,
        }, { status: 400 });
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round(((eligibleAmount * coupon.discountValue) / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(coupon.discountValue, eligibleAmount);
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
      },
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return NextResponse.json({ error: 'Failed to validate coupon.' }, { status: 500 });
  }
}
