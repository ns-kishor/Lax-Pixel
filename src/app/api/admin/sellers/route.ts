import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 255);
}

// GET: List seller profiles
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = sanitizeInput(searchParams.get('status'));

    const where: Record<string, unknown> = {};
    if (statusParam === 'approved') {
      where.approved = true;
    } else if (statusParam === 'rejected') {
      where.approved = false;
    } else if (statusParam === 'pending') {
      // pending = not approved and recently created (no explicit field, use approved=false)
      where.approved = false;
    }

    const sellers = await db.sellerProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            banned: true,
            createdAt: true,
            _count: { select: { orders: true } },
          },
        },
      },
    });

    // Attach product count
    const sellersWithCounts = await Promise.all(
      sellers.map(async (s) => {
        const productCount = await db.product.count({ where: { sellerId: s.userId } });
        return {
          ...s,
          user: {
            ...s.user,
            productCount,
          },
        };
      })
    );

    return NextResponse.json({ sellers: sellersWithCounts });
  } catch (error) {
    console.error('Admin list sellers error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update seller (approve/reject, ban user)
export async function PATCH(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Seller ID is required (query param).' }, { status: 400 });
    }

    const body = await req.json();
    const sellerData: Record<string, unknown> = {};

    if (body.approved !== undefined) {
      sellerData.approved = Boolean(body.approved);
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.sellerProfile.update({
        where: { id },
        data: sellerData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              banned: true,
              createdAt: true,
              _count: { select: { orders: true } },
            },
          },
        },
      });

      // Ban/unban user if requested
      if (body.userId && body.banned !== undefined) {
        await tx.user.update({
          where: { id: sanitizeInput(body.userId) },
          data: { banned: Boolean(body.banned) },
        });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin update seller error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete seller account + user
export async function DELETE(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    const userId = sanitizeInput(searchParams.get('userId'));

    if (!id || !userId) {
      return NextResponse.json({ error: 'Both id and userId query params are required.' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.sellerProfile.delete({ where: { id } });
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete seller error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
