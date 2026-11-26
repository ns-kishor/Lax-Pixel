import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/user-auth';

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    const userId = auth?.userId;
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { avatar } = await req.json();
    if (!avatar || typeof avatar !== 'string') {
      return NextResponse.json({ error: 'Avatar data required' }, { status: 400 });
    }

    // Limit avatar size to max 200KB to prevent database bloat (ISSUE-PERF-01)
    if (avatar.length > 200 * 1024) {
      return NextResponse.json({ error: 'Avatar image is too large. Maximum size is 200KB.' }, { status: 400 });
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
