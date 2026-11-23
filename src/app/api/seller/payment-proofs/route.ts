import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/user-auth';

// GET: List payment proofs for this seller's products
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    const sellerId = auth?.userId;
    if (!sellerId) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const proofs = await db.paymentProof.findMany({
      where: {
        order: {
          items: {
            some: {
              product: { sellerId },
            },
          },
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
        paymentMethod: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ proofs });
  } catch (err) {
    console.error('Seller list payment proofs error:', err);
    return NextResponse.json({ error: 'Failed to fetch payment proofs.' }, { status: 500 });
  }
}

// PATCH: Approve or Reject a payment proof by seller
export async function PATCH(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    const sellerId = auth?.userId;
    if (!sellerId) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const body = await req.json();
    const id = body.id || new URL(req.url).searchParams.get('id');
    const action = String(body.action || '').toUpperCase(); // 'APPROVE' or 'REJECT'
    const notes = body.notes ? String(body.notes).trim() : '';

    if (!id) {
      return NextResponse.json({ error: 'Payment Proof ID is required.' }, { status: 400 });
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'action must be either APPROVE or REJECT.' }, { status: 400 });
    }

    // Verify proof exists and order contains a product from this seller
    const proof = await db.paymentProof.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              where: { product: { sellerId } },
            },
          },
        },
      },
    });

    if (!proof || proof.order.items.length === 0) {
      return NextResponse.json({
        error: 'Payment proof not found or you do not have permission for this proof.',
      }, { status: 403 });
    }

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId: sellerId },
      select: { companyName: true },
    });
    const sellerName = sellerProfile?.companyName || 'Seller';

    const newStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';

    const updatedProof = await db.$transaction(async (tx) => {
      const p = await tx.paymentProof.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedBy: sellerId,
          verifiedAt: new Date(),
          notes: notes ? `${proof.notes || ''} [Note: ${notes}]` : proof.notes,
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          order: { select: { id: true, orderNumber: true, totalAmount: true, status: true, paymentStatus: true } },
          paymentMethod: { select: { id: true, name: true, icon: true } },
        },
      });

      if (action === 'APPROVE') {
        // Update order paymentStatus to PAID
        await tx.order.update({
          where: { id: proof.orderId },
          data: {
            paymentStatus: 'PAID',
            ...(proof.order.status === 'PENDING' ? { status: 'CONFIRMED' } : {}),
          },
        });

        await tx.orderTracking.create({
          data: {
            orderId: proof.orderId,
            status: 'PAYMENT_VERIFIED',
            description: `Payment proof verified and approved by ${sellerName}.`,
            location: sellerName,
          },
        });
      } else {
        // Reject payment proof
        await tx.order.update({
          where: { id: proof.orderId },
          data: { paymentStatus: 'FAILED' },
        });

        await tx.orderTracking.create({
          data: {
            orderId: proof.orderId,
            status: 'PAYMENT_REJECTED',
            description: `Payment proof rejected by ${sellerName}${notes ? `: ${notes}` : ''}.`,
            location: sellerName,
          },
        });
      }

      return p;
    });

    return NextResponse.json({
      proof: updatedProof,
      message: action === 'APPROVE'
        ? 'Payment proof approved and order payment marked as PAID!'
        : 'Payment proof rejected.',
    });
  } catch (err) {
    console.error('Seller update payment proof error:', err);
    return NextResponse.json({ error: 'Failed to update payment proof.' }, { status: 500 });
  }
}
