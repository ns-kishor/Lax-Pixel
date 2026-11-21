import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'createdAt';
    const featured = searchParams.get('featured');
    const sellerId = searchParams.get('sellerId');

    const where: Record<string, unknown> = {};
    if (category) {
      const cat = await db.category.findUnique({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }
    if (featured === 'true') where.featured = true;
    if (sellerId) where.sellerId = sellerId;
    if (search) {
      const trimmed = search.trim();
      const words = trimmed.split(/\s+/).filter(w => w.length > 0);

      const fieldMatches = (term: string) => [
        { name: { contains: term, mode: 'insensitive' as const } },
        { description: { contains: term, mode: 'insensitive' as const } },
        { tags: { contains: term, mode: 'insensitive' as const } },
        { productCode: { contains: term, mode: 'insensitive' as const } },
        { category: { name: { contains: term, mode: 'insensitive' as const } } },
        { seller: { name: { contains: term, mode: 'insensitive' as const } } },
        { seller: { sellerProfile: { companyName: { contains: term, mode: 'insensitive' as const } } } },
        { specs: { some: { value: { contains: term, mode: 'insensitive' as const } } } },
        { specs: { some: { label: { contains: term, mode: 'insensitive' as const } } } },
      ];

      if (words.length <= 1) {
        where.OR = fieldMatches(trimmed);
      } else {
        where.OR = [
          ...fieldMatches(trimmed),
          {
            AND: words.map(word => ({
              OR: fieldMatches(word),
            })),
          },
          ...words.flatMap(word => fieldMatches(word)),
        ];
      }
    }

    let orderBy: any;
    if (sort === 'price-asc') orderBy = [{ price: 'asc' }];
    else if (sort === 'price-desc') orderBy = [{ price: 'desc' }];
    else if (sort === 'rating') orderBy = [{ rating: 'desc' }, { reviewCount: 'desc' }];
    else if (sort === 'popular') orderBy = [{ salesCount: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }];
    else if (sort === 'discount') orderBy = [{ price: 'asc' }];
    else orderBy = [{ createdAt: 'desc' }];

    const products = await db.product.findMany({
      where,
      orderBy,
      include: {
        category: true,
        specs: { orderBy: { sortOrder: 'asc' } },
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            sellerProfile: {
              select: {
                id: true,
                companyName: true,
                logo: true,
                rating: true,
                totalSales: true,
                approved: true,
                whatsapp: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, description, price, comparePrice, image, images, categoryId, sellerId, stock, featured, tags, colors, sizes } = body;

    const trimmedName = String(name || '').trim();
    if (!trimmedName || price === undefined || price === null || !categoryId || !sellerId) {
      return NextResponse.json({ error: 'Name, price, category, and seller are required' }, { status: 400 });
    }

    const parsedPrice = parseFloat(String(price));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    const parsedComparePrice = comparePrice !== undefined && comparePrice !== null && String(comparePrice).trim() !== ''
      ? parseFloat(String(comparePrice))
      : null;

    const parsedStock = parseInt(String(stock || '0'), 10);
    const validStock = isNaN(parsedStock) || parsedStock < 0 ? 0 : parsedStock;

    // Check seller verification approval
    const sellerProfile = await db.sellerProfile.findUnique({ where: { userId: sellerId } });
    if (sellerProfile && !sellerProfile.approved) {
      return NextResponse.json({
        error: 'Your seller account has not been approved yet. Please wait for admin verification.',
      }, { status: 403 });
    }

    // Generate safe and guaranteed-unique slug
    let baseSlug = (slug ? String(slug) : trimmedName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!baseSlug) {
      baseSlug = 'product';
    }

    let finalSlug = baseSlug;
    const existing = await db.product.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    // Clean image URLs (remove newlines, whitespace)
    const cleanImg = image ? String(image).replace(/[\r\n\t]+/g, '').trim() : '/products/hero.png';
    const cleanImgs = images ? String(images).replace(/[\r\n\t]+/g, '').trim() : cleanImg;

    // Handle specifications (optional)
    const specsData = Array.isArray(body.specs)
      ? body.specs
          .filter((s: any) => s && s.label && String(s.label).trim())
          .map((s: { label: string; value: string }, i: number) => ({
            label: String(s.label).trim().slice(0, 255),
            value: String(s.value || '').trim().slice(0, 1000),
            sortOrder: i,
          }))
      : [];

    const product = await db.product.create({
      data: {
        name: trimmedName,
        slug: finalSlug,
        description: String(description || ''),
        price: parsedPrice,
        comparePrice: parsedComparePrice !== null && !isNaN(parsedComparePrice) ? parsedComparePrice : null,
        image: cleanImg || '/products/hero.png',
        images: cleanImgs || cleanImg || '/products/hero.png',
        categoryId,
        sellerId,
        stock: validStock,
        featured: Boolean(featured),
        tags: String(tags || ''),
        colors: String(colors || ''),
        sizes: String(sizes || ''),
        aiGenerated: false,
        aiTags: '',
        specs: specsData.length > 0 ? { create: specsData } : undefined,
      },
      include: {
        category: true,
        specs: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('[CREATE-PRODUCT-ERROR]:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create product',
    }, { status: 500 });
  }
}
