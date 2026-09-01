import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const SAFE_FIELDS = ['name', 'phone', 'address', 'city', 'country', 'zipCode'];

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, phone: true, address: true, city: true, country: true, zipCode: true, avatar: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const data = await req.json();

    // Only allow updating safe fields
    const updateData: Record<string, string> = {};
    for (const field of SAFE_FIELDS) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, phone: true, address: true, city: true, country: true, zipCode: true, avatar: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
