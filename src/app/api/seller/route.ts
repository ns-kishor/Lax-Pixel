import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const sellerId = req.headers.get('x-user-id');
    if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [profile, verification, products] = await Promise.all([
      db.sellerProfile.findUnique({ where: { userId: sellerId } }),
      db.sellerVerification.findUnique({
        where: { userId: sellerId },
        select: {
          id: true, businessName: true, businessType: true, businessAddress: true,
          businessCity: true, businessCountry: true, nidNumber: true, phone: true,
          website: true, description: true, status: true, rejectReason: true,
          createdAt: true, reviewedAt: true,
        },
      }),
      db.product.findMany({
        where: { sellerId },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Fetch order items belonging exclusively to this seller's products
    const sellerOrderItems = await db.orderItem.findMany({
      where: { product: { sellerId } },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            tracking: { orderBy: { timestamp: 'asc' } },
          },
        },
        product: { select: { id: true, name: true, price: true, image: true, salesCount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute seller-specific metrics
    const totalSales = sellerOrderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = sellerOrderItems.reduce((sum, item) => {
      // Exclude cancelled if marked, otherwise include
      if (item.order.status === 'CANCELLED') return sum;
      return sum + (item.price * item.quantity);
    }, 0);

    // Group items by unique order for the seller
    const ordersMap = new Map<string, any>();
    for (const item of sellerOrderItems) {
      const o = item.order;
      if (!ordersMap.has(o.id)) {
        ordersMap.set(o.id, {
          id: o.id,
          orderNumber: o.orderNumber,
          trackingCode: o.trackingCode,
          status: o.status,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          shippingAddress: o.shippingAddress,
          shippingCity: o.shippingCity,
          shippingCountry: o.shippingCountry,
          shippingZip: o.shippingZip,
          createdAt: o.createdAt,
          user: o.user,
          items: [],
          sellerTotal: 0,
        });
      }
      const orderEntry = ordersMap.get(o.id);
      orderEntry.items.push({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        price: item.price,
        quantity: item.quantity,
      });
      orderEntry.sellerTotal += (item.price * item.quantity);
    }

    const sellerOrders = Array.from(ordersMap.values());
    const totalOrders = sellerOrders.length;
    const pendingOrders = sellerOrders.filter(o => o.status === 'PENDING').length;
    const confirmedOrders = sellerOrders.filter(o => ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)).length;

    // Conversion rate estimation
    const productCount = products.length;
    const conversionRate = productCount > 0
      ? (totalSales > 0 ? Math.min(100, Math.round((totalSales / (productCount * 12 + totalSales)) * 1000) / 10) : 0)
      : 0;

    const isApproved = Boolean(profile?.approved);

    return NextResponse.json({
      profile,
      verification,
      approved: isApproved,
      stats: {
        productCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSales,
        totalOrders,
        pendingOrders,
        confirmedOrders,
        conversionRate,
      },
      products,
      orders: sellerOrders,
    });
  } catch (error) {
    console.error('Failed to fetch seller data:', error);
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
      create: { userId: sellerId, companyName: companyName || '', description: description || '', website, approved: false },
    });
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
