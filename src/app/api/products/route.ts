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
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const orderBy: Record<string, string> = {};
    if (sort === 'price-asc') orderBy.price = 'asc';
    else if (sort === 'price-desc') orderBy.price = 'desc';
    else if (sort === 'rating') orderBy.rating = 'desc';
    else if (sort === 'popular') orderBy.salesCount = 'desc';
    else orderBy.createdAt = 'desc';

    const products = await db.product.findMany({
      where,
      orderBy,
      include: { category: true, seller: { select: { id: true, name: true } } },
    });

    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, description, price, comparePrice, image, categoryId, sellerId, stock, featured, tags } = body;

    if (!name || !price || !categoryId || !sellerId) {
      return NextResponse.json({ error: 'Name, price, category, and seller are required' }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: description || '',
        price: Number(price),
        comparePrice: comparePrice ? Number(comparePrice) : null,
        image: image || '/products/hero.png',
        categoryId,
        sellerId,
        stock: stock || 0,
        featured: featured || false,
        tags: tags || '',
        aiGenerated: true,
        aiTags: 'AI-created',
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
