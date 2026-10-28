import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { simulateGoogleAuth } from '@/lib/google-auth';

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const idToken = body.idToken as string;
    if (!idToken) {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    const { email, name, avatar } = simulateGoogleAuth(idToken);

    let user = await db.user.findUnique({ where: { email } });

    if (user && user.banned) {
      return NextResponse.json({ error: 'Your account has been suspended. Please contact customer support.' }, { status: 403 });
    }

    if (!user) {
      // Create new user with BUYER role and a random password (they auth via Google)
      const { hash } = await import('bcryptjs');
      const randomPassword = await hash(`google_${Date.now()}_${Math.random()}`, 12);
      user = await db.user.create({
        data: {
          email,
          name,
          password: randomPassword,
          role: 'BUYER',
          avatar: avatar || '',
        },
      });
    }

    const { password: _, ...safeUser } = user;
    let sellerProfile: any = null;
    if (user.role === 'SELLER') {
      sellerProfile = await db.sellerProfile.findUnique({ where: { userId: user.id } });
    }

    return NextResponse.json({ user: safeUser, sellerProfile });
  } catch (error) {
    console.error('[GOOGLE-AUTH] Exception:', error);
    return NextResponse.json({ error: 'Google auth failed: ' + String(error) }, { status: 500 });
  }
}
