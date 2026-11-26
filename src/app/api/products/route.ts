import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { getAuthenticatedUser } from '@/lib/user-auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'createdAt';
    const featured = searchParams.get('featured');
    const sellerId = searchParams.get('sellerId');
    const includeDisabled = searchParams.get('includeDisabled') === 'true';

    const where: Record<string, unknown> = {};
    if (!sellerId && !includeDisabled) {
      where.active = { not: false };
    }
    if (category) {
      const cat = await db.category.findFirst({
        where: {
          OR: [
            { slug: category },
            { slug: category === 'watch' ? 'watches' : category === 'watches' ? 'watch' : category },
            { name: { equals: category, mode: 'insensitive' } }
          ]
        }
      });
      if (cat) where.categoryId = cat.id;
    }

    if (subcategory) {
      const cleanSub = subcategory.trim();
      const subVariant = cleanSub.replace(/-/g, ' ');
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { subcategory: { contains: cleanSub, mode: 'insensitive' } },
            { subcategory: { contains: subVariant, mode: 'insensitive' } },
            { tags: { contains: cleanSub, mode: 'insensitive' } },
            { tags: { contains: subVariant, mode: 'insensitive' } },
            { name: { contains: cleanSub, mode: 'insensitive' } },
            { name: { contains: subVariant, mode: 'insensitive' } },
          ]
        }
      ];
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
    const { name, slug, description, price, comparePrice, image, images, categoryId, subcategory, sellerId, stock, featured, tags, colors, sizes } = body;

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

    // Check authorization: Must be Admin or the Seller themselves
    const adminToken = req.headers.get('x-admin-token');
    const admin = verifyAdminToken(adminToken);
    const authUser = getAuthenticatedUser(req);

    if (!admin && !authUser) {
      return NextResponse.json({ error: 'Authentication required to publish products.' }, { status: 401 });
    }

    if (!admin && authUser && authUser.userId !== sellerId) {
      return NextResponse.json({ error: 'Unauthorized to publish products for another seller.' }, { status: 403 });
    }

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

    const cleanSubcategory = subcategory ? String(subcategory).trim() : null;
    const finalTags = [String(tags || ''), cleanSubcategory || ''].filter(Boolean).join(', ');

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
        subcategory: cleanSubcategory,
        sellerId,
        stock: validStock,
        featured: Boolean(featured),
        active: body.active !== undefined ? Boolean(body.active) : true,
        tags: finalTags,
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

export async function PUT(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const adminToken = req.headers.get('x-admin-token');
    const admin = verifyAdminToken(adminToken);

    if (!authUser && !admin) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const existingProduct = await db.product.findUnique({
      where: { id },
      include: { specs: true },
    });
    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Verify ownership
    if (!admin && authUser && authUser.userId !== existingProduct.sellerId) {
      return NextResponse.json({ error: 'Unauthorized to edit this product.' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const trimmed = String(body.name).trim();
      if (trimmed) updateData.name = trimmed;
    }
    if (body.description !== undefined) {
      updateData.description = String(body.description);
    }
    if (body.price !== undefined) {
      const p = parseFloat(String(body.price));
      if (!isNaN(p) && p >= 0) updateData.price = p;
    }
    if (body.comparePrice !== undefined) {
      if (body.comparePrice === null || String(body.comparePrice).trim() === '') {
        updateData.comparePrice = null;
      } else {
        const cp = parseFloat(String(body.comparePrice));
        if (!isNaN(cp) && cp >= 0) updateData.comparePrice = cp;
      }
    }
    if (body.stock !== undefined) {
      const s = parseInt(String(body.stock), 10);
      if (!isNaN(s) && s >= 0) updateData.stock = s;
    }
    if (body.active !== undefined) {
      updateData.active = Boolean(body.active);
    }
    if (body.featured !== undefined && admin) {
      updateData.featured = Boolean(body.featured);
    }
    if (body.categoryId !== undefined) {
      updateData.categoryId = String(body.categoryId);
    }
    if (body.subcategory !== undefined) {
      updateData.subcategory = body.subcategory ? String(body.subcategory).trim() : null;
    }
    if (body.tags !== undefined) {
      updateData.tags = String(body.tags);
    }
    if (body.colors !== undefined) {
      updateData.colors = String(body.colors);
    }
    if (body.sizes !== undefined) {
      updateData.sizes = String(body.sizes);
    }
    if (body.image !== undefined) {
      updateData.image = String(body.image).replace(/[\r\n\t]+/g, '').trim();
    }
    if (body.images !== undefined) {
      const cleaned = String(body.images).replace(/[\r\n\t]+/g, '').trim();
      updateData.images = cleaned;
      if (!updateData.image && cleaned) {
        updateData.image = cleaned.split(',')[0].trim();
      }
    }

    // Specs replacement if provided
    const hasSpecs = Array.isArray(body.specs);

    const updated = await db.$transaction(async (tx) => {
      if (hasSpecs) {
        await tx.productSpec.deleteMany({ where: { productId: id } });
        const specsData = body.specs
          .filter((s: any) => s && s.label && String(s.label).trim())
          .map((s: { label: string; value: string }, i: number) => ({
            productId: id,
            label: String(s.label).trim().slice(0, 255),
            value: String(s.value || '').trim().slice(0, 1000),
            sortOrder: i,
          }));
        if (specsData.length > 0) {
          await tx.productSpec.createMany({ data: specsData });
        }
      }

      return tx.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          specs: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    console.error('[UPDATE-PRODUCT-ERROR]:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update product',
    }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    const adminToken = req.headers.get('x-admin-token');
    const admin = verifyAdminToken(adminToken);

    if (!authUser && !admin) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // body could be empty if ID is in searchParams
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Verify ownership
    if (!admin && authUser && authUser.userId !== product.sellerId) {
      return NextResponse.json({ error: 'Unauthorized to delete this product.' }, { status: 403 });
    }

    // Check if order items exist
    const orderCount = await db.orderItem.count({ where: { productId: id } });
    if (orderCount > 0) {
      // Archive product to protect historical customer orders
      await db.product.update({
        where: { id },
        data: {
          active: false,
          stock: 0,
          featured: false,
          name: product.name.startsWith('[Archived]') ? product.name : `[Archived] ${product.name}`,
        },
      });
      await db.$transaction([
        db.cartItem.deleteMany({ where: { productId: id } }),
        db.wishlist.deleteMany({ where: { productId: id } }),
      ]);
      return NextResponse.json({
        success: true,
        archived: true,
        message: 'Product archived to preserve order history.',
      });
    }

    // Cascade delete related records
    await db.$transaction([
      db.cartItem.deleteMany({ where: { productId: id } }),
      db.wishlist.deleteMany({ where: { productId: id } }),
      db.review.deleteMany({ where: { productId: id } }),
      db.productSpec.deleteMany({ where: { productId: id } }),
      db.product.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('[DELETE-PRODUCT-ERROR]:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete product',
    }, { status: 500 });
  }
}
