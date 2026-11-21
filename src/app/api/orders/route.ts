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
    const {
      items,
      phone,
      shippingAddress,
      shippingCity,
      shippingCountry,
      shippingZip,
      paymentMethod: paymentMethodInput,
      paymentMethodId,
      transactionId,
      senderNumber,
      paymentProofImage,
      couponCode: inputCouponCode,
    } = body;

    const buyerPhone = phone ? String(phone).trim() : (user.phone ? String(user.phone).trim() : '');
    if (!buyerPhone) {
      return NextResponse.json({ error: 'Contact phone number is required to place an order' }, { status: 400 });
    }

    if (buyerPhone && buyerPhone !== user.phone) {
      await db.user.update({
        where: { id: userId },
        data: { phone: buyerPhone },
      }).catch(() => {});
    }

    // Gather requested items
    interface RawOrderItemInput {
      productId: string;
      quantity?: number;
      selectedColor?: string | null;
      selectedSize?: string | null;
      color?: string | null;
      size?: string | null;
    }

    let requestedItems: RawOrderItemInput[] = [];

    if (items && Array.isArray(items) && items.length > 0) {
      requestedItems = items.map((i: any) => ({
        productId: String(i.productId || ''),
        quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
        selectedColor: i.selectedColor || i.color || null,
        selectedSize: i.selectedSize || i.size || null,
      }));
    } else {
      const cartItems = await db.cartItem.findMany({
        where: { userId },
      });
      requestedItems = cartItems.map((ci) => ({
        productId: ci.productId,
        quantity: Math.max(1, Math.floor(Number(ci.quantity) || 1)),
        selectedColor: ci.selectedColor || null,
        selectedSize: ci.selectedSize || null,
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
      selectedColor?: string | null;
      selectedSize?: string | null;
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
        selectedColor: item.selectedColor || item.color || null,
        selectedSize: item.selectedSize || item.size || null,
      });
    }

    const subtotal = verifiedOrderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Dynamic Shipping fee from Admin Settings (defaults to 150 BDT)
    const shippingSetting = await db.siteSetting.findUnique({ where: { key: 'shipping_fee' } });
    const shippingCost = shippingSetting?.value !== undefined && !isNaN(parseFloat(shippingSetting.value))
      ? parseFloat(shippingSetting.value)
      : 150;
    const tax = 0; // Tax is removed per requirement

    // Validate and calculate coupon discount
    let appliedCouponRecord: any = null;
    let validatedCouponDiscount = 0;
    const cleanCouponCode = typeof inputCouponCode === 'string' ? inputCouponCode.trim().toUpperCase() : '';

    if (cleanCouponCode) {
      const c = await db.coupon.findUnique({ where: { code: cleanCouponCode } });
      if (c && c.active && !c.banned && c.type === 'PRODUCT') {
        const now = new Date();
        const dateOk = (!c.startDate || now >= new Date(c.startDate)) && (!c.endDate || now <= new Date(c.endDate));
        const usesOk = c.maxUses === null || c.usedCount < c.maxUses;
        if (dateOk && usesOk) {
          let eligibleSubtotal = subtotal;
          let isEligible = true;

          if (c.sellerId) {
            const sellerDbProducts = dbProducts.filter((p) => p.sellerId === c.sellerId);
            const sellerProductIds = new Set(sellerDbProducts.map((p) => p.id));
            const sellerItems = verifiedOrderItems.filter((i) => sellerProductIds.has(i.productId));
            if (sellerItems.length === 0) {
              isEligible = false;
            } else {
              eligibleSubtotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
            }
          } else if (c.appliesTo === 'SPECIFIC' && c.productIds) {
            let targetIds: string[] = [];
            try {
              targetIds = c.productIds.startsWith('[') ? JSON.parse(c.productIds) : c.productIds.split(',').map((s) => s.trim());
            } catch {
              targetIds = c.productIds.split(',').map((s) => s.trim());
            }
            const specificItems = verifiedOrderItems.filter((i) => targetIds.includes(i.productId));
            if (specificItems.length === 0) {
              isEligible = false;
            } else {
              eligibleSubtotal = specificItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
            }
          }

          if (isEligible && (c.minOrderAmount <= 0 || eligibleSubtotal >= c.minOrderAmount)) {
            if (c.discountType === 'PERCENTAGE') {
              validatedCouponDiscount = Math.round(((eligibleSubtotal * c.discountValue) / 100) * 100) / 100;
            } else {
              validatedCouponDiscount = Math.min(c.discountValue, eligibleSubtotal);
            }
            appliedCouponRecord = c;
          }
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - validatedCouponDiscount + shippingCost);
    const orderNumber = `NOR-${Date.now().toString(36).toUpperCase()}`;
    const trackingCode = generateTrackingCode();

    // Resolve payment method details
    let resolvedPaymentMethod = paymentMethodInput || 'cash_on_delivery';
    let resolvedPaymentMethodId: string | undefined;

    if (paymentMethodId) {
      const method = await db.paymentMethod.findUnique({ where: { id: paymentMethodId } });
      if (method) {
        resolvedPaymentMethod = method.name;
        resolvedPaymentMethodId = method.id;
      }
    } else {
      const defaultMethod = await db.paymentMethod.findFirst({
        where: { name: resolvedPaymentMethod, active: true },
      });
      if (defaultMethod) {
        resolvedPaymentMethodId = defaultMethod.id;
      }
    }

    const isCod = resolvedPaymentMethod === 'cash_on_delivery' ||
                  resolvedPaymentMethod === 'Cash on Delivery' ||
                  resolvedPaymentMethod === 'COD';

    let paymentStatus = 'PAID';
    let needsProof = false;

    if (isCod) {
      paymentStatus = 'PENDING';
      needsProof = false;
    } else {
      // Non-COD methods require Transaction ID and Sender Phone Number
      if (!transactionId || !String(transactionId).trim() || !senderNumber || !String(senderNumber).trim()) {
        return NextResponse.json({
          error: `Transaction ID and Sender Phone Number are required for ${resolvedPaymentMethod}`,
        }, { status: 400 });
      }
      paymentStatus = 'PENDING_VERIFICATION';
      needsProof = true;
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

      // If coupon used, increment coupon usedCount
      if (appliedCouponRecord) {
        await tx.coupon.update({
          where: { id: appliedCouponRecord.id },
          data: { usedCount: { increment: 1 } },
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
          couponCode: appliedCouponRecord ? appliedCouponRecord.code : null,
          couponDiscount: validatedCouponDiscount,
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

      // Create payment proof if needed (TrxID + Sender Number)
      if (needsProof && resolvedPaymentMethodId) {
        await tx.paymentProof.create({
          data: {
            orderId: newOrder.id,
            userId,
            paymentMethodId: resolvedPaymentMethodId,
            amount: totalAmount,
            proofImage: paymentProofImage || null,
            notes: `TrxID: ${String(transactionId).trim()} | Sender: ${String(senderNumber).trim()}`,
            status: 'PENDING',
          },
        });
      }

      // Remove only the checked out products from user's cart (preserving any unselected items)
      await tx.cartItem.deleteMany({
        where: {
          userId,
          productId: { in: verifiedOrderItems.map((i) => i.productId) },
        },
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
