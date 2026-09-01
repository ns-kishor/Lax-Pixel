import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber');
    const trackingCode = searchParams.get('trackingCode');
    const query = orderNumber || trackingCode;

    if (!query) return NextResponse.json({ error: 'Order number or tracking code required' }, { status: 400 });

    // Try trackingCode first (exact match), then orderNumber
    let order = trackingCode
      ? await db.order.findUnique({
          where: { trackingCode },
          include: { items: true, tracking: { orderBy: { timestamp: 'asc' } }, user: { select: { name: true, email: true } } },
        })
      : null;

    if (!order && orderNumber) {
      order = await db.order.findUnique({
        where: { orderNumber },
        include: { items: true, tracking: { orderBy: { timestamp: 'asc' } }, user: { select: { name: true, email: true } } },
      });
    }

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tracking' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sellerId = req.headers.get('x-user-id');
    if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { orderId, status, description, location } = await req.json();
    const tracking = await db.orderTracking.create({
      data: { orderId, status, description, location: location || '' },
    });

    const statusMap: Record<string, string> = {
      CONFIRMED: 'CONFIRMED',
      PROCESSING: 'PROCESSING',
      SHIPPED: 'SHIPPED',
      OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
      DELIVERED: 'DELIVERED',
    };

    if (statusMap[status]) {
      await db.order.update({ where: { id: orderId }, data: { status: statusMap[status] } });
    }

    return NextResponse.json(tracking, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to add tracking update' }, { status: 500 });
  }
}
