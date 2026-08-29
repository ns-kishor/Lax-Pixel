import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json([]);

    const items = await db.cartItem.findMany({
      where: { userId },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { productId, quantity } = await req.json();
    if (!productId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const existing = await db.cartItem.findUnique({ where: { userId_productId: { userId, productId } } });
    if (existing) {
      const updated = await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: (existing.quantity || 1) + (quantity || 1) },
        include: { product: true },
      });
      return NextResponse.json(updated);
    }

    const item = await db.cartItem.create({
      data: { userId, productId, quantity: quantity || 1 },
      include: { product: true },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { productId, quantity } = await req.json();
    if (quantity <= 0) {
      await db.cartItem.delete({ where: { userId_productId: { userId, productId } } });
      return NextResponse.json({ success: true });
    }

    const updated = await db.cartItem.update({
      where: { userId_productId: { userId, productId } },
      data: { quantity },
      include: { product: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (productId) {
      await db.cartItem.delete({ where: { userId_productId: { userId, productId } } });
    } else {
      await db.cartItem.deleteMany({ where: { userId } });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 });
  }
}
