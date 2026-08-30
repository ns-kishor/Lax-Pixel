import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const sellerId = req.headers.get('x-user-id');
    if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const profile = await db.sellerProfile.findUnique({ where: { userId: sellerId } });
    const productCount = await db.product.count({ where: { sellerId } });
    const orders = await db.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true, tracking: { orderBy: { timestamp: 'asc' } }, user: { select: { name: true, email: true } } },
      take: 50,
    });

    const products = await db.product.findMany({
      where: { sellerId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

    return NextResponse.json({
      profile,
      stats: { productCount, totalRevenue, totalOrders, pendingOrders },
      products,
      orders,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch seller data' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sellerId = req.headers.get('x-user-id');
    if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { companyName, description, website } = await req.json();
    const profile = await db.sellerProfile.upsert({
      where: { userId: sellerId },
      update: { companyName, description, website },
      create: { userId: sellerId, companyName: companyName || '', description: description || '', website },
    });
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
