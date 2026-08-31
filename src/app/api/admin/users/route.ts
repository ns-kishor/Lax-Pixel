import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 255);
}

// GET: List users
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = sanitizeInput(searchParams.get('search'));
    const role = sanitizeInput(searchParams.get('role'));
    const bannedParam = searchParams.get('banned');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role && ['BUYER', 'SELLER'].includes(role.toUpperCase())) {
      where.role = role.toUpperCase();
    }
    if (bannedParam !== null && bannedParam !== '') {
      where.banned = bannedParam === 'true';
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          phone: true,
          country: true,
          city: true,
          address: true,
          banned: true,
          createdAt: true,
          sellerProfile: { select: { companyName: true, approved: true, rating: true, totalSales: true } },
          _count: {
            select: {
              orders: true,
              wishlist: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({ users, total });
  } catch (error) {
    console.error('Admin list users error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete user
export async function DELETE(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const id = sanitizeInput(body.id);
    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (id === admin.adminId) {
      return NextResponse.json({ error: 'Cannot delete your own admin account.' }, { status: 400 });
    }

    // Check user exists
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update user role or ban status
export async function PATCH(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const id = sanitizeInput(body.id);
    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (body.role !== undefined) {
      const role = sanitizeInput(body.role);
      if (!['BUYER', 'SELLER'].includes(role.toUpperCase())) {
        return NextResponse.json({ error: 'Role must be BUYER or SELLER.' }, { status: 400 });
      }
      data.role = role.toUpperCase();
    }

    if (body.banned !== undefined) {
      data.banned = Boolean(body.banned);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
