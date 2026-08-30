import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

// Re-export sessions reference to keep it alive across modules
void sessions;

export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const [totalUsers, totalOrders, totalRevenue, totalProducts, recentOrders, ordersByStatusRaw, topProductsRaw] =
      await Promise.all([
        db.user.count(),
        db.order.count(),
        db.order.aggregate({ _sum: { totalAmount: true } }),
        db.product.count(),
        db.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, email: true } },
            items: true,
          },
        }),
        db.order.groupBy({ by: ['status'], _count: { status: true } }),
        db.product.findMany({
          take: 5,
          orderBy: { salesCount: 'desc' },
          include: { category: { select: { name: true } } },
        }),
      ]);

    const ordersByStatus: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    for (const row of ordersByStatusRaw) {
      ordersByStatus[row.status] = row._count.status;
    }

    const topProducts = topProductsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      salesCount: p.salesCount,
      image: p.image,
      categoryName: p.category.name,
    }));

    const recentOrdersFormatted = recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      userName: o.user.name,
      itemCount: o.items.length,
    }));

    return NextResponse.json({
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalProducts,
      recentOrders: recentOrdersFormatted,
      ordersByStatus,
      topProducts,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
