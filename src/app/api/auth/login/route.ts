import { db } from '@/lib/db';
import { compare } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const email = (body.email as string)?.trim();
    const password = body.password as string;

    console.error('[USER-LOGIN] email:', JSON.stringify(email), 'pwLen:', password?.length || 0);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    console.error('[USER-LOGIN] DB result:', user ? 'FOUND ' + user.id : 'NOT FOUND');

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await compare(password, user.password);
    console.error('[USER-LOGIN] bcrypt compare:', valid);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { password: _, ...safeUser } = user;
    let sellerProfile = null;
    if (user.role === 'SELLER') {
      sellerProfile = await db.sellerProfile.findUnique({ where: { userId: user.id } });
    }

    console.error('[USER-LOGIN] SUCCESS:', user.email);
    return NextResponse.json({ user: safeUser, sellerProfile });
  } catch (error) {
    console.error('[USER-LOGIN] EXCEPTION:', error);
    return NextResponse.json({ error: 'Login failed: ' + String(error) }, { status: 500 });
  }
}
