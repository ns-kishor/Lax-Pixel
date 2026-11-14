import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const slides = await db.heroSlide.findMany({
      where: {
        active: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    if (slides.length > 0) {
      return NextResponse.json({ slides });
    }

    // Fallback: If no slides active in heroSlide table, return featured products
    const featuredProducts = await db.product.findMany({
      where: { featured: true },
      include: { category: true },
      orderBy: { salesCount: 'desc' },
      take: 6,
    });

    const fallbackSlides = featuredProducts.map((p, idx) => ({
      id: `fallback-${p.id}`,
      productId: p.id,
      sortOrder: idx + 1,
      active: true,
      product: p,
    }));

    return NextResponse.json({ slides: fallbackSlides });
  } catch (error) {
    console.error('Failed to fetch hero slides:', error);
    return NextResponse.json({ error: 'Failed to fetch hero slides' }, { status: 500 });
  }
}
