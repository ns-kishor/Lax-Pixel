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

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.stock <= 0) return NextResponse.json({ error: 'Product is currently out of stock' }, { status: 400 });

    const addQty = Math.max(1, Math.min(50, Math.floor(Number(quantity) || 1)));

    const existing = await db.cartItem.findUnique({ where: { userId_productId: { userId, productId } } });
    if (existing) {
      const newQty = Math.min(product.stock, existing.quantity + addQty);
      const updated = await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
        include: { product: true },
      });
      return NextResponse.json(updated);
    }

    const item = await db.cartItem.create({
      data: { userId, productId, quantity: Math.min(product.stock, addQty) },
      include: { product: true },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Cart POST error:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { productId, quantity } = await req.json();
    if (!productId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const numQty = Math.floor(Number(quantity));
    if (isNaN(numQty) || numQty <= 0) {
      await db.cartItem.deleteMany({ where: { userId, productId } });
      return NextResponse.json({ success: true, removed: true });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const clampedQty = Math.min(product.stock, Math.min(50, numQty));

    const updated = await db.cartItem.update({
      where: { userId_productId: { userId, productId } },
      data: { quantity: clampedQty },
      include: { product: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Cart PUT error:', error);
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
      await db.cartItem.deleteMany({ where: { userId, productId } });
    } else {
      await db.cartItem.deleteMany({ where: { userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cart DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete cart item' }, { status: 500 });
  }
}
