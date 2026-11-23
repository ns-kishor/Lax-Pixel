import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/user-auth';

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const STATUS_DESCRIPTIONS: Record<string, string> = {
  CONFIRMED: 'Order confirmed by seller.',
  PROCESSING: 'Order is being processed and packaged by seller.',
  SHIPPED: 'Order has been dispatched / handed to courier by seller.',
  DELIVERED: 'Order delivered successfully.',
  CANCELLED: 'Order cancelled by seller.',
};

// PATCH: Update order status by seller
export async function PATCH(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    const sellerId = auth?.userId;
    if (!sellerId) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, status, trackingNumber, notes } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
      return NextResponse.json({
        error: `Valid status is required. Choose from: ${VALID_STATUSES.join(', ')}`,
      }, { status: 400 });
    }

    const upperStatus = status.toUpperCase();

    // Verify that this order contains at least one product belonging to this seller
    const orderItem = await db.orderItem.findFirst({
      where: {
        orderId,
        product: { sellerId },
      },
      include: {
        order: true,
      },
    });

    if (!orderItem) {
      return NextResponse.json({
        error: 'Order not found or you do not have permission to manage this order.',
      }, { status: 403 });
    }

    // SEC-FIND-09: Multi-Vendor Order Cancellation & Global Payment State Tampering Prevention
    // Check if the order contains products fulfilled by other sellers
    const allOrderItems = await db.orderItem.findMany({
      where: { orderId },
      include: { product: true },
    });
    const otherSellersItems = allOrderItems.filter(
      (item) => item.product?.sellerId && item.product.sellerId !== sellerId
    );

    if (otherSellersItems.length > 0 && (upperStatus === 'CANCELLED' || upperStatus === 'DELIVERED')) {
      return NextResponse.json({
        error: `This order contains items belonging to other sellers. Only an administrator can globally change this multi-vendor order to ${upperStatus}.`,
      }, { status: 403 });
    }

    const currentOrder = orderItem.order;

    const updateData: Record<string, unknown> = {
      status: upperStatus,
    };

    if (trackingNumber) {
      updateData.trackingNumber = String(trackingNumber).trim();
    }

    // Auto-update paymentStatus if COD and delivered
    if (upperStatus === 'DELIVERED' && currentOrder.paymentStatus === 'PENDING') {
      updateData.paymentStatus = 'PAID';
    } else if (upperStatus === 'CANCELLED') {
      updateData.paymentStatus = 'REFUNDED';
    }

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: sellerId },
      select: { companyName: true },
    });
    const sellerName = sellerProfile?.companyName || 'Seller';

    let trackingDesc = STATUS_DESCRIPTIONS[upperStatus] || `Status updated to ${upperStatus} by ${sellerName}.`;
    if (trackingNumber && upperStatus === 'SHIPPED') {
      trackingDesc += ` Tracking Number: ${trackingNumber}`;
    }
    if (notes) {
      trackingDesc += ` (${notes})`;
    }

    const updated = await db.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          paymentProofs: { include: { paymentMethod: true } },
          tracking: { orderBy: { timestamp: 'desc' } },
        },
      });

      // Add order tracking milestone
      await tx.orderTracking.create({
        data: {
          orderId,
          status: upperStatus,
          description: trackingDesc,
          location: sellerName,
        },
      });

      return order;
    });

    return NextResponse.json({
      order: updated,
      message: `Order status updated to ${upperStatus} successfully.`,
    });
  } catch (err) {
    console.error('Seller update order error:', err);
    return NextResponse.json({ error: 'Failed to update order status.' }, { status: 500 });
  }
}
