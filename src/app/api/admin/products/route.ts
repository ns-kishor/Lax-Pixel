import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 1000);
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
    const allowedFields = ['name', 'description', 'price', 'comparePrice', 'stock', 'featured', 'categoryId'];

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

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const product = await db.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, name: true, email: true } },
      },
    });

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
