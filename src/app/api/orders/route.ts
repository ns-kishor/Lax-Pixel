import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function generateTrackingCode(): string {
  const min = 1000000000000;
  const max = 9999999999999;
  let code: string;
  do {
    code = String(Math.floor(Math.random() * (max - min + 1)) + min);
  } while (false);
  return code;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    const sellerId = req.headers.get('x-seller-id');

    if (!userId && !sellerId) return NextResponse.json([]);

    if (sellerId) {
      const orders = await db.order.findMany({
        where: {
          items: {
            some: {
              product: {
                sellerId: sellerId,
              },
            },
          },
        },
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

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.banned) {
      return NextResponse.json({ error: 'Your account has been suspended. Please contact support.' }, { status: 403 });
    }

    const body = await req.json();
    const { items, shippingAddress, shippingCity, shippingCountry, shippingZip, paymentMethod: paymentMethodInput, paymentMethodId, paymentProofImage } = body;

    // Gather requested items
    interface RawOrderItemInput {
      productId: string;
      quantity?: number;
    }

    let requestedItems: RawOrderItemInput[] = [];

    if (items && Array.isArray(items) && items.length > 0) {
      requestedItems = items.map((i: any) => ({
        productId: String(i.productId || ''),
        quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
      }));
    } else {
      const cartItems = await db.cartItem.findMany({
        where: { userId },
      });
      requestedItems = cartItems.map((ci) => ({
        productId: ci.productId,
        quantity: Math.max(1, Math.floor(Number(ci.quantity) || 1)),
      }));
    }

    if (requestedItems.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    // Retrieve authoritative product records from DB to verify price and stock
    const productIds = requestedItems.map((i) => i.productId);
    const dbProducts = await db.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    interface VerifiedOrderItem {
      productId: string;
      productName: string;
      productImage: string;
      price: number;
      quantity: number;
    }
    const verifiedOrderItems: VerifiedOrderItem[] = [];
    for (const item of requestedItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 });
      }
      const qty = item.quantity || 1;
      if (product.stock < qty) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${qty}` },
          { status: 400 }
        );
      }
      verifiedOrderItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.image || '/products/hero.png',
        price: product.price, // STRICT DB PRICE - prevents client price tampering
        quantity: qty,
      });
    }

    const subtotal = verifiedOrderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingCost = subtotal > 2000 ? 0 : 50;
    const tax = subtotal * 0.01;
    const totalAmount = subtotal + shippingCost + tax;
    const orderNumber = `NOR-${Date.now().toString(36).toUpperCase()}`;
    const trackingCode = generateTrackingCode();

    // Resolve payment method details
    let resolvedPaymentMethod = paymentMethodInput || 'CREDIT_CARD';
    let paymentStatus = 'PAID';
    let needsProof = false;
    let resolvedPaymentMethodId: string | undefined;

    if (paymentMethodId) {
      const method = await db.paymentMethod.findUnique({ where: { id: paymentMethodId } });
      if (method) {
        resolvedPaymentMethod = method.name;
        resolvedPaymentMethodId = method.id;

        if (method.proofRequired) {
          needsProof = true;
          if (!paymentProofImage) {
            return NextResponse.json({ error: `Payment proof is required for ${method.name}` }, { status: 400 });
          }
          paymentStatus = 'PENDING_VERIFICATION';
        } else if (method.name === 'COD') {
          paymentStatus = 'PENDING';
        }
      }
    }

    // Atomic transaction for order creation and inventory decrement
    const order = await db.$transaction(async (tx) => {
      // Decrement stock and update sales count
      for (const item of verifiedOrderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            salesCount: { increment: item.quantity },
          },
        });
      }

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          trackingCode,
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
          paymentMethod: resolvedPaymentMethod,
          paymentStatus,
          estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          items: { create: verifiedOrderItems },
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

      // Create payment proof if needed
      if (needsProof && paymentProofImage && resolvedPaymentMethodId) {
        await tx.paymentProof.create({
          data: {
            orderId: newOrder.id,
            userId,
            paymentMethodId: resolvedPaymentMethodId,
            amount: totalAmount,
            proofImage: paymentProofImage,
            status: 'PENDING',
          },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { userId } });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
