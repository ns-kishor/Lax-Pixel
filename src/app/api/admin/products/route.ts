import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 1000);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET: List products
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = sanitizeInput(searchParams.get('search'));
    const category = sanitizeInput(searchParams.get('category'));
    const featuredParam = searchParams.get('featured');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (category) {
      where.category = { slug: category };
    }
    if (featuredParam !== null && featuredParam !== '') {
      where.featured = featuredParam === 'true';
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, name: true, email: true } },
          specs: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      db.product.count({ where }),
    ]);

    return NextResponse.json({ products, total });
  } catch (error) {
    console.error('Admin list products error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Create product
export async function POST(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const name = sanitizeInput(body.name);
    if (!name) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }

    const description = sanitizeInput(body.description) || '';
    const price = parseFloat(body.price);
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Invalid price.' }, { status: 400 });
    }

    const comparePrice = body.comparePrice !== undefined && body.comparePrice !== null ? parseFloat(body.comparePrice) : null;
    const stock = parseInt(body.stock, 10) || 0;
    const categoryId = sanitizeInput(body.categoryId);
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId is required.' }, { status: 400 });
    }
    // Resolve sellerId: if 'system' or missing, find/create a system seller account
    let sellerId = sanitizeInput(body.sellerId);
    if (!sellerId || sellerId === 'system') {
      let systemUser = await db.user.findFirst({ where: { email: 'system@laxpixel.com' } });
      if (!systemUser) {
        const { hashPassword } = await import('@/lib/admin-auth');
        systemUser = await db.user.create({
          data: {
            email: 'system@laxpixel.com',
            password: hashPassword('system-pw-' + Date.now()),
            name: 'Lax Pixel Store',
            role: 'SELLER',
          },
        });
        // Also create seller profile
        await db.sellerProfile.create({
          data: {
            userId: systemUser.id,
            companyName: 'Lax Pixel Store',
            approved: true,
          },
        });
      }
      sellerId = systemUser.id;
    }
    const featured = body.featured !== undefined ? Boolean(body.featured) : false;
    const productCode = body.productCode !== undefined ? sanitizeInput(body.productCode) || null : null;
    const tags = body.tags !== undefined ? sanitizeInput(body.tags) : '';
    const images = body.images !== undefined ? sanitizeInput(body.images) : '';

    let slug = slugify(name);
    // Ensure unique slug
    const existing = await db.product.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Handle specs
    const specsData = Array.isArray(body.specs)
      ? body.specs.map((s: { label: string; value: string }, i: number) => ({
          label: String(s.label || '').slice(0, 255),
          value: String(s.value || '').slice(0, 1000),
          sortOrder: i,
        }))
      : [];

    const product = await db.product.create({
      data: {
        name,
        slug,
        description,
        price,
        comparePrice,
        image: images ? images.split(',')[0].trim() : '',
        images,
        categoryId,
        sellerId,
        stock,
        featured,
        productCode,
        tags,
        specs: {
          create: specsData,
        },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, name: true, email: true } },
        specs: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Admin create product error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update product
export async function PATCH(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const id = sanitizeInput(body.id);
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    const allowedFields = ['name', 'description', 'price', 'comparePrice', 'stock', 'featured', 'categoryId', 'productCode', 'tags', 'images'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'featured') {
          data[field] = Boolean(body[field]);
        } else if (field === 'price' || field === 'comparePrice') {
          const val = parseFloat(body[field]);
          if (isNaN(val) || val < 0) {
            return NextResponse.json({ error: `Invalid ${field}.` }, { status: 400 });
          }
          data[field] = val;
        } else if (field === 'stock') {
          const val = parseInt(body[field], 10);
          if (isNaN(val) || val < 0) {
            return NextResponse.json({ error: 'Invalid stock value.' }, { status: 400 });
          }
          data[field] = val;
        } else {
          data[field] = sanitizeInput(body[field]);
        }
      }
    }

    // Handle specs replacement
    const hasSpecs = Array.isArray(body.specs);

    const product = await db.$transaction(async (tx) => {
      // If specs array provided, replace all specs
      if (hasSpecs) {
        await tx.productSpec.deleteMany({ where: { productId: id } });
        const specsData = body.specs.map((s: { label: string; value: string }, i: number) => ({
          productId: id,
          label: String(s.label || '').slice(0, 255),
          value: String(s.value || '').slice(0, 1000),
          sortOrder: i,
        }));
        if (specsData.length > 0) {
          await tx.productSpec.createMany({ data: specsData });
        }
      }

      if (Object.keys(data).length === 0 && !hasSpecs) {
        return null;
      }

      return tx.product.update({
        where: { id },
        data,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, name: true, email: true } },
          specs: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });

    if (!product) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Admin update product error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete product
export async function DELETE(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const id = sanitizeInput(body.id);
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Delete related records in a transaction
    await db.$transaction([
      db.cartItem.deleteMany({ where: { productId: id } }),
      db.wishlist.deleteMany({ where: { productId: id } }),
      db.orderItem.deleteMany({ where: { productId: id } }),
      db.review.deleteMany({ where: { productId: id } }),
      db.product.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete product error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
