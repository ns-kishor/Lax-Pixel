import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const sellerId = req.headers.get('x-user-id');
    if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [profile, verification, products, feeSetting, allPaymentMethods] = await Promise.all([
      db.sellerProfile.findUnique({ where: { userId: sellerId } }),
      db.sellerVerification.findUnique({
        where: { userId: sellerId },
        select: {
          id: true, businessName: true, businessType: true, businessAddress: true,
          businessCity: true, businessCountry: true, nidNumber: true, phone: true,
          whatsapp: true, email: true, website: true, description: true, status: true,
          rejectReason: true, feeAmount: true, paymentMethod: true, transactionId: true,
          senderNumber: true, paymentMethodsData: true, createdAt: true, reviewedAt: true,
        },
      }),
      db.product.findMany({
        where: { sellerId },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.siteSetting.findUnique({ where: { key: 'seller_verification_fee' } }),
      db.paymentMethod.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    // Digital methods only (for fee payment)
    const paymentMethods = allPaymentMethods.filter(
      m => !['cash_on_delivery', 'Cash on Delivery', 'COD'].includes(m.name)
    );

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
      feeAmount: feeSetting?.value ? parseFloat(feeSetting.value) || 500 : 500,
      paymentMethods,
      allPaymentMethods,
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

    const body = await req.json();
    const {
      companyName,
      description,
      website,
      phone,
      whatsapp,
      email,
      address,
      city,
      country,
      logo,
      banner,
      paymentMethodsConfig,
    } = body;

    const pmConfigStr = paymentMethodsConfig !== undefined
      ? (typeof paymentMethodsConfig === 'string' ? paymentMethodsConfig : JSON.stringify(paymentMethodsConfig))
      : undefined;

    const profile = await db.sellerProfile.upsert({
      where: { userId: sellerId },
      update: {
        ...(companyName !== undefined && { companyName }),
        ...(description !== undefined && { description }),
        ...(website !== undefined && { website }),
        ...(phone !== undefined && { phone }),
        ...(whatsapp !== undefined && { whatsapp }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(logo !== undefined && { logo }),
        ...(banner !== undefined && { banner }),
        ...(pmConfigStr !== undefined && { paymentMethodsConfig: pmConfigStr }),
      },
      create: {
        userId: sellerId,
        companyName: companyName || '',
        description: description || '',
        website: website || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        address: address || null,
        city: city || null,
        country: country || 'Bangladesh',
        logo: logo || null,
        banner: banner || null,
        paymentMethodsConfig: pmConfigStr || null,
        approved: false,
      },
    });

    // Also sync user phone/address if supplied
    await db.user.update({
      where: { id: sellerId },
      data: {
        ...(phone && { phone }),
        ...(address && { address }),
        ...(city && { city }),
      },
    }).catch(() => {});

    return NextResponse.json({ profile, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Failed to update seller profile:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
