import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 });
    }

    // Try finding the user by User ID or SellerProfile ID
    const user = await db.user.findFirst({
      where: {
        OR: [
          { id },
          { sellerProfile: { id } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phone: true,
        createdAt: true,
        role: true,
        banned: true,
        sellerProfile: true,
      },
    });

    if (!user || user.banned) {
      return NextResponse.json({ error: 'Seller not found or unavailable' }, { status: 404 });
    }

    // Fetch all products uploaded by this seller
    const products = await db.product.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
      },
    });

    // Derive summary metrics
    const totalProducts = products.length;
    const totalReviews = products.reduce((sum, p) => sum + (p.reviewCount || 0), 0);
    const avgRating = products.length > 0
      ? (products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length).toFixed(1)
      : (user.sellerProfile?.rating || 5.0).toFixed(1);

    // Extract categories
    const categoriesMap = new Map<string, { id: string; name: string; slug: string; count: number }>();
    for (const p of products) {
      if (p.category) {
        const existing = categoriesMap.get(p.category.id);
        if (existing) {
          existing.count += 1;
        } else {
          categoriesMap.set(p.category.id, {
            id: p.category.id,
            name: p.category.name,
            slug: p.category.slug,
            count: 1,
          });
        }
      }
    }

    return NextResponse.json({
      seller: {
        id: user.id,
        name: user.name,
        companyName: user.sellerProfile?.companyName || user.name || 'Store',
        description: user.sellerProfile?.description || '',
        logo: user.sellerProfile?.logo || user.avatar || '',
        banner: user.sellerProfile?.banner || null,
        rating: Number(avgRating),
        totalSales: user.sellerProfile?.totalSales || 0,
        approved: user.sellerProfile?.approved ?? true,
        whatsapp: user.sellerProfile?.whatsapp || '',
        phone: user.sellerProfile?.phone || user.phone || '',
        email: user.sellerProfile?.email || user.email || '',
        address: user.sellerProfile?.address || '',
        city: user.sellerProfile?.city || '',
        country: user.sellerProfile?.country || 'Bangladesh',
        joinedAt: user.createdAt,
        totalProducts,
        totalReviews,
      },
      categories: Array.from(categoriesMap.values()),
      products,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error fetching seller details:', error);
    return NextResponse.json({ error: 'Failed to fetch seller details' }, { status: 500 });
  }
}
