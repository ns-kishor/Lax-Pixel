import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 255);
}

// GET: List hero slides
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeParam = searchParams.get('active');

    const where: Record<string, unknown> = {};
    if (activeParam !== null && activeParam !== '') {
      where.active = activeParam === 'true';
    }

    const slides = await db.heroSlide.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        product: {
          select: { id: true, name: true, image: true, price: true },
        },
      },
    });

    return NextResponse.json({ slides });
  } catch (error) {
    console.error('Admin list hero slides error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Create hero slide
export async function POST(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const productId = sanitizeInput(body.productId);
    if (!productId) {
      return NextResponse.json({ error: 'productId is required.' }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const startDate = body.startDate ? new Date(body.startDate) : null;
    const endDate = body.endDate ? new Date(body.endDate) : null;
    const sortOrder = body.sortOrder !== undefined ? parseInt(body.sortOrder, 10) || 0 : 0;
    const active = body.active !== undefined ? Boolean(body.active) : true;

    const slide = await db.heroSlide.create({
      data: {
        productId,
        startDate,
        endDate,
        sortOrder,
        active,
      },
      include: {
        product: { select: { id: true, name: true, image: true, price: true } },
      },
    });

    return NextResponse.json(slide, { status: 201 });
  } catch (error) {
    console.error('Admin create hero slide error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update hero slide
export async function PATCH(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Slide ID is required (query param).' }, { status: 400 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.productId !== undefined) {
      data.productId = sanitizeInput(body.productId);
    }
    if (body.startDate !== undefined) {
      data.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    if (body.endDate !== undefined) {
      data.endDate = body.endDate ? new Date(body.endDate) : null;
    }
    if (body.sortOrder !== undefined) {
      data.sortOrder = parseInt(body.sortOrder, 10) || 0;
    }
    if (body.active !== undefined) {
      data.active = Boolean(body.active);
    }

    const slide = await db.heroSlide.update({
      where: { id },
      data,
      include: {
        product: { select: { id: true, name: true, image: true, price: true } },
      },
    });

    return NextResponse.json(slide);
  } catch (error) {
    console.error('Admin update hero slide error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Remove hero slide
export async function DELETE(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Slide ID is required (query param).' }, { status: 400 });
    }

    await db.heroSlide.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete hero slide error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
