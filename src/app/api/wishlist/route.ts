import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json([]);
    const items = await db.wishlist.findMany({
      where: { userId },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { productId } = await req.json();
    const existing = await db.wishlist.findUnique({ where: { userId_productId: { userId, productId } } });
    if (existing) {
      await db.wishlist.delete({ where: { id: existing.id } });
      return NextResponse.json({ wishlisted: false });
    }
    await db.wishlist.create({ data: { userId, productId } });
    return NextResponse.json({ wishlisted: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
