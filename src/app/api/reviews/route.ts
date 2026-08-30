import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    if (!productId) return NextResponse.json([]);
    const reviews = await db.review.findMany({
      where: { productId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(reviews);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { productId, rating, title, comment } = await req.json();
    if (!productId || !rating) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const review = await db.review.upsert({
      where: { userId_productId: { userId, productId } },
      update: { rating, title, comment },
      create: { userId, productId, rating, title, comment },
    });

    // Update product rating
    const allReviews = await db.review.findMany({ where: { productId } });
    const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await db.product.update({ where: { id: productId }, data: { rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length } });

    return NextResponse.json(review, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
