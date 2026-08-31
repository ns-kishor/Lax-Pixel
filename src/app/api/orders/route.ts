import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const sellerId = req.headers.get('x-seller-id');

    if (!userId && !sellerId) return NextResponse.json([]);

    if (sellerId) {
      const orders = await db.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true } },
          tracking: { orderBy: { timestamp: 'asc' } },
        },
      });
      return NextResponse.json(orders);
    }

    const orders = await db.order.findMany({
      where: { userId: userId! },
      orderBy: { createdAt: 'desc' },
      include: { items: true, tracking: { orderBy: { timestamp: 'asc' } } },
    });
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { items, shippingAddress, shippingCity, shippingCountry, shippingZip, paymentMethod } = await req.json();

    const cartItems = await db.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    const orderItems = items || cartItems.map(ci => ({
      productId: ci.product.id,
      productName: ci.product.name,
      productImage: ci.product.image || '/products/hero.png',
      price: ci.product.price,
      quantity: ci.quantity,
    }));

    const subtotal = orderItems.reduce((sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity, 0);
    const shippingCost = subtotal > 2000 ? 0 : 50;
    const tax = subtotal * 0.01;
    const totalAmount = subtotal + shippingCost + tax;
    const orderNumber = `NOR-${Date.now().toString(36).toUpperCase()}`;

    const order = await db.order.create({
      data: {
        orderNumber,
        userId,
        status: 'PENDING',
        totalAmount,
        subtotal,
        shippingCost,
        tax,
        shippingAddress: shippingAddress || '',
        shippingCity: shippingCity || '',
        shippingCountry: shippingCountry || '',
        shippingZip: shippingZip || '',
        paymentMethod: paymentMethod || 'CREDIT_CARD',
        paymentStatus: 'PAID',
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        items: { create: orderItems },
        tracking: {
          create: {
            status: 'ORDERED',
            description: 'Order placed successfully',
            location: 'Online',
          },
        },
      },
      include: { items: true, tracking: true },
    });

    // Update product stock and sales
    for (const item of orderItems) {
      await db.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          salesCount: { increment: item.quantity },
        },
      });
    }

    // Clear cart
    await db.cartItem.deleteMany({ where: { userId } });

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
