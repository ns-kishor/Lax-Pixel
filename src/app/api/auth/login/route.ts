import { db } from '@/lib/db';
import { compare } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { password: _, ...safeUser } = user;
    let sellerProfile = null;
    if (user.role === 'SELLER') {
      sellerProfile = await db.sellerProfile.findUnique({ where: { userId: user.id } });
    }

    return NextResponse.json({ user: safeUser, sellerProfile });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}