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

    const body = await req.json();
    const { productId, rating, title, comment } = body;

    if (!productId || rating === undefined || rating === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cleanRating = Math.max(1, Math.min(5, Math.round(Number(rating))));
    if (isNaN(cleanRating)) {
      return NextResponse.json({ error: 'Rating must be a number between 1 and 5' }, { status: 400 });
    }

    const cleanComment = String(comment || '').trim();
    if (!cleanComment) {
      return NextResponse.json({ error: 'Review comment cannot be empty' }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const review = await db.review.upsert({
      where: { userId_productId: { userId, productId } },
      update: {
        rating: cleanRating,
        title: title ? String(title).trim().slice(0, 150) : null,
        comment: cleanComment.slice(0, 2000),
      },
      create: {
        userId,
        productId,
        rating: cleanRating,
        title: title ? String(title).trim().slice(0, 150) : null,
        comment: cleanComment.slice(0, 2000),
      },
    });

    // Update product rating and review count
    const allReviews = await db.review.findMany({ where: { productId } });
    const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await db.product.update({
      where: { id: productId },
      data: { rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
