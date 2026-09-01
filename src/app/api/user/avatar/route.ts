import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { avatar } = await req.json();
    if (!avatar) {
      return NextResponse.json({ error: 'Avatar data required' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { avatar },
      select: { id: true, email: true, name: true, role: true, phone: true, address: true, city: true, country: true, zipCode: true, avatar: true, createdAt: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
  }
}
