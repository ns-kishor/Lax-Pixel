import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const rawEmail = (body.email as string)?.trim();
    if (!rawEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase();
    const name = String(body.name || '').trim() || email.split('@')[0] || 'Google User';
    const avatar = String(body.avatar || '');
    const requestedRole = body.role === 'SELLER' ? 'SELLER' : 'BUYER';

    // 1. Check if user already exists (case-insensitive lookup)
    let user = await db.user.findUnique({ where: { email } });
    if (!user && rawEmail !== email) {
      user = await db.user.findUnique({ where: { email: rawEmail } });
    }

    // 2. Enforce ban check
    if (user && user.banned) {
      return NextResponse.json({ error: 'Your account has been suspended. Please contact customer support.' }, { status: 403 });
    }

    // 3. Create user if new
    if (!user) {
      const randomPassword = await hash(`google_${Date.now()}_${Math.random()}`, 12);
      user = await db.user.create({
        data: {
          email,
          name,
          password: randomPassword,
          role: requestedRole,
          avatar: avatar || '',
        },
      });

      if (requestedRole === 'SELLER') {
        await db.sellerProfile.create({
          data: {
            userId: user.id,
            companyName: name,
            description: '',
            approved: false,
          },
        });
      }
    } else if (avatar && !user.avatar) {
      // Update avatar if missing
      user = await db.user.update({
        where: { id: user.id },
        data: { avatar },
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
