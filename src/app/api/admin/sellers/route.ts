import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 255);
}

// GET: List seller profiles
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = sanitizeInput(searchParams.get('status'));

    const where: Record<string, unknown> = {};
    if (statusParam === 'approved') {
      where.approved = true;
    } else if (statusParam === 'rejected') {
      where.approved = false;
    } else if (statusParam === 'pending') {
      // pending = not approved and recently created (no explicit field, use approved=false)
      where.approved = false;
    }

    const sellers = await db.sellerProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
            avatar: true,
            banned: true,
            createdAt: true,
            _count: { select: { orders: true, wishlist: true } },
          },
        },
      },
    });

    // Attach comprehensive analytics per seller
    const sellersWithCounts = await Promise.all(
      sellers.map(async (s) => {
        const [products, orderItems, verification] = await Promise.all([
          db.product.findMany({
            where: { sellerId: s.userId },
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              image: true,
              salesCount: true,
              productCode: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          db.orderItem.findMany({
            where: { product: { sellerId: s.userId } },
            select: {
              id: true,
              productId: true,
              price: true,
              quantity: true,
              createdAt: true,
              order: {
                select: {
                  id: true,
                  status: true,
                  createdAt: true,
                },
              },
            },
          }),
          db.sellerVerification.findUnique({
            where: { userId: s.userId },
            select: {
              id: true,
              businessName: true,
              businessType: true,
              businessAddress: true,
              businessCity: true,
              businessCountry: true,
              nidNumber: true,
              phone: true,
              website: true,
              status: true,
              createdAt: true,
            },
          }),
        ]);

        let totalRevenue = 0;
        let totalSales = 0;
        const uniqueOrders = new Set<string>();
        let confirmedOrders = 0;
        const monthlyMap = new Map<string, { revenue: number; sales: number }>();
        const productRevenueMap = new Map<string, number>();

        for (const item of orderItems) {
          const itemRev = item.price * item.quantity;
          totalSales += item.quantity;

          if (item.order) {
            uniqueOrders.add(item.order.id);
            if (['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(item.order.status)) {
              confirmedOrders++;
            }
            if (item.order.status !== 'CANCELLED') {
              totalRevenue += itemRev;
              // Monthly stats
              const date = new Date(item.order.createdAt);
              const mKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              const prev = monthlyMap.get(mKey) || { revenue: 0, sales: 0 };
              monthlyMap.set(mKey, { revenue: prev.revenue + itemRev, sales: prev.sales + item.quantity });
            }
          }

          // Product revenue
          const pRev = productRevenueMap.get(item.productId) || 0;
          productRevenueMap.set(item.productId, pRev + itemRev);
        }

        const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, data]) => ({
          month,
          revenue: Math.round(data.revenue * 100) / 100,
          sales: data.sales,
        })).sort((a, b) => b.month.localeCompare(a.month));

        const productsWithRevenue = products.map(p => ({
          ...p,
          revenue: Math.round((productRevenueMap.get(p.id) || 0) * 100) / 100,
        }));

        return {
          ...s,
          verification,
          products: productsWithRevenue,
          monthlyRevenue,
          totalSales,
          totalOrders: uniqueOrders.size,
          confirmedOrders,
          user: {
            ...s.user,
            productCount: products.length,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
          },
        };
      })
    );

    return NextResponse.json({ sellers: sellersWithCounts });
  } catch (error) {
    console.error('Admin list sellers error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update seller (approve/reject, ban user)
export async function PATCH(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Seller ID is required (query param).' }, { status: 400 });
    }

    const body = await req.json();
    const sellerData: Record<string, unknown> = {};

    if (body.approved !== undefined) {
      sellerData.approved = Boolean(body.approved);
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.sellerProfile.update({
        where: { id },
        data: sellerData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              banned: true,
              createdAt: true,
              _count: { select: { orders: true } },
            },
          },
        },
      });

      // Ban/unban user if requested
      if (body.userId && body.banned !== undefined) {
        await tx.user.update({
          where: { id: sanitizeInput(body.userId) },
          data: { banned: Boolean(body.banned) },
        });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin update seller error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete seller account + user
export async function DELETE(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    const userId = sanitizeInput(searchParams.get('userId'));

    if (!id || !userId) {
      return NextResponse.json({ error: 'Both id and userId query params are required.' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.sellerProfile.delete({ where: { id } });
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete seller error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
