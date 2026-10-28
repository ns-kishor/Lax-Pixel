import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber');
    const trackingCode = searchParams.get('trackingCode');
    const orderId = searchParams.get('orderId') || searchParams.get('id');
    const query = orderNumber || trackingCode || orderId;

    if (!query) return NextResponse.json({ error: 'Order number, tracking code, or order ID required' }, { status: 400 });

    let order: any = null;

    if (orderId) {
      order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true, tracking: { orderBy: { timestamp: 'asc' } }, user: { select: { name: true, email: true } } },
      });
    }

    // Try trackingCode first (exact match), then orderNumber
    if (!order && trackingCode) {
      order = await db.order.findUnique({
        where: { trackingCode },
        include: { items: true, tracking: { orderBy: { timestamp: 'asc' } }, user: { select: { name: true, email: true } } },
      });
    }

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
    const adminToken = req.headers.get('x-admin-token');
    const isAdmin = adminToken ? verifyAdminToken(adminToken) : null;
    const userId = req.headers.get('x-user-id');

    if (!isAdmin && !userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { orderId, status, description, location } = await req.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID and status are required' }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Authorization check: Must be Admin OR Seller owning a product in the order
    if (!isAdmin) {
      const isOwnerSeller = order.items.some((item) => item.product?.sellerId === userId);
      if (!isOwnerSeller) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to update tracking for this order' },
          { status: 403 }
        );
      }
    }

    const tracking = await db.orderTracking.create({
      data: { orderId, status, description: description || `Status updated to ${status}`, location: location || '' },
    });

    const statusMap: Record<string, string> = {
      CONFIRMED: 'CONFIRMED',
      PROCESSING: 'PROCESSING',
      SHIPPED: 'SHIPPED',
      OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
    };

    if (statusMap[status]) {
      await db.order.update({ where: { id: orderId }, data: { status: statusMap[status] } });
    }

    return NextResponse.json(tracking, { status: 201 });
  } catch (error) {
    console.error('Tracking update error:', error);
    return NextResponse.json({ error: 'Failed to add tracking update' }, { status: 500 });
  }
}
