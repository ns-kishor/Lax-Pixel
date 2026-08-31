import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 1000);
}

const VALID_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];

// GET: List payment proofs
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = sanitizeInput(searchParams.get('status'));

    const where: Record<string, unknown> = {};
    if (statusParam && VALID_STATUSES.includes(statusParam.toUpperCase())) {
      where.status = statusParam.toUpperCase();
    }

    const proofs = await db.paymentProof.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        order: { select: { id: true, orderNumber: true, totalAmount: true, paymentStatus: true, status: true } },
        paymentMethod: { select: { id: true, name: true, icon: true } },
      },
    });

    return NextResponse.json({ proofs });
  } catch (error) {
    console.error('Admin list payment proofs error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update proof status
export async function PATCH(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Proof ID is required (query param).' }, { status: 400 });
    }

    const body = await req.json();
    const status = body.status ? sanitizeInput(body.status).toUpperCase() : undefined;

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (body.notes !== undefined) data.notes = sanitizeInput(body.notes) || null;
    if (status === 'VERIFIED') {
      data.verifiedBy = admin.adminId;
      data.verifiedAt = new Date();
    }

    const proof = await db.$transaction(async (tx) => {
      const updated = await tx.paymentProof.update({
        where: { id },
        data,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          order: { select: { id: true, orderNumber: true, totalAmount: true, paymentStatus: true, status: true } },
          paymentMethod: { select: { id: true, name: true, icon: true } },
        },
      });

      // When verified, update the order's paymentStatus to PAID
      if (status === 'VERIFIED') {
        await tx.order.update({
          where: { id: updated.orderId },
          data: { paymentStatus: 'PAID' },
        });
      }

      return updated;
    });

    return NextResponse.json(proof);
  } catch (error) {
    console.error('Admin update payment proof error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
