import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 500);
}

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const VALID_PAYMENT_STATUSES = ['PENDING', 'PAID', 'REFUNDED', 'FAILED'];

const STATUS_DESCRIPTIONS: Record<string, string> = {
  CONFIRMED: 'Order has been confirmed.',
  PROCESSING: 'Order is being processed.',
  SHIPPED: 'Order has been shipped.',
  DELIVERED: 'Order has been delivered.',
  CANCELLED: 'Order has been cancelled.',
};

// GET: List orders
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = sanitizeInput(searchParams.get('status'));
    const search = sanitizeInput(searchParams.get('search'));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }
    if (search) {
      where.orderNumber = { contains: search };
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: {
              product: { select: { name: true, image: true, productCode: true } },
            },
          },
          paymentProofs: {
            select: { id: true, status: true, proofImage: true, createdAt: true },
          },
        },
      }),
      db.order.count({ where }),
    ]);

    const formattedOrders = orders.map((o) => ({
      ...o,
      userName: o.user.name,
      userPhone: o.user.phone,
      userEmail: o.user.email,
      fullAddress: `${o.shippingAddress}, ${o.shippingCity}, ${o.shippingCountry}${o.shippingZip ? ` ${o.shippingZip}` : ''}`,
      itemCount: o.items.length,
    }));

    return NextResponse.json({ orders: formattedOrders, total });
  } catch (error) {
    console.error('Admin list orders error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update order
export async function PATCH(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const id = sanitizeInput(body.id);
    const status = body.status !== undefined ? sanitizeInput(body.status) : undefined;
    const paymentStatus = body.paymentStatus !== undefined ? sanitizeInput(body.paymentStatus) : undefined;
    const trackingNumber = body.trackingNumber !== undefined ? sanitizeInput(body.trackingNumber) : undefined;
    const estimatedDelivery = body.estimatedDelivery !== undefined ? body.estimatedDelivery : undefined;

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const existingOrder = await db.order.findUnique({ where: { id } });
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const trackingEntries: { orderId: string; status: string; description: string; location?: string }[] = [];

    // Handle order status change
    if (status) {
      const upperStatus = status.toUpperCase();
      if (!VALID_STATUSES.includes(upperStatus)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
      }

      updateData.status = upperStatus;

      // Update payment status accordingly when order status changes
      if (upperStatus === 'CANCELLED') {
        updateData.paymentStatus = 'REFUNDED';
      } else if (['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(upperStatus)) {
        updateData.paymentStatus = 'PAID';
      }

      // Create tracking entry for status changes
      if (upperStatus !== existingOrder.status) {
        let description = STATUS_DESCRIPTIONS[upperStatus] || `Order status updated to ${upperStatus}.`;
        if (trackingNumber && upperStatus === 'SHIPPED') {
          description += ` Tracking: ${trackingNumber}`;
        }
        trackingEntries.push({
          orderId: id,
          status: upperStatus,
          description,
        });
      }
    }

    // Handle separate paymentStatus update
    if (paymentStatus && !status) {
      const upperPaymentStatus = paymentStatus.toUpperCase();
      if (!VALID_PAYMENT_STATUSES.includes(upperPaymentStatus)) {
        return NextResponse.json({ error: `Invalid paymentStatus. Must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` }, { status: 400 });
      }
      updateData.paymentStatus = upperPaymentStatus;
    }

    // Handle tracking number
    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber;
    }

    // Handle estimated delivery
    if (estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
    }

    if (Object.keys(updateData).length === 0 && trackingEntries.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const updatedOrder = await db.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: {
              product: { select: { name: true, image: true, productCode: true } },
            },
          },
          paymentProofs: {
            select: { id: true, status: true, proofImage: true, createdAt: true },
          },
        },
      });

      for (const entry of trackingEntries) {
        await tx.orderTracking.create({ data: entry });
      }

      return order;
    });

    return NextResponse.json({
      ...updatedOrder,
      userName: updatedOrder.user.name,
      userPhone: updatedOrder.user.phone,
      userEmail: updatedOrder.user.email,
      fullAddress: `${updatedOrder.shippingAddress}, ${updatedOrder.shippingCity}, ${updatedOrder.shippingCountry}${updatedOrder.shippingZip ? ` ${updatedOrder.shippingZip}` : ''}`,
      itemCount: updatedOrder.items.length,
    });
  } catch (error) {
    console.error('Admin update order error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
