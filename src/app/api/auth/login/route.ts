import { db } from '@/lib/db';
import { compare } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { tryAdminLogin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!body.termsAccepted) {
      return NextResponse.json({ error: 'You must accept the Terms and Conditions' }, { status: 400 });
    }

    const email = (body.email as string)?.trim();
    const password = body.password as string;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Try regular user login first
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      const valid = await compare(password, user.password);
      if (valid) {
        const { password: _, ...safeUser } = user;
        let sellerProfile: any = null;
        if (user.role === 'SELLER') {
          sellerProfile = await db.sellerProfile.findUnique({ where: { userId: user.id } });
        }
        return NextResponse.json({ user: safeUser, sellerProfile });
      }
    }

    // 2. If no user found or password didn't match, try admin login
    const adminResult = await tryAdminLogin(email, password);
    if (adminResult) {
      return NextResponse.json({
        isAdmin: true,
        token: adminResult.token,
        admin: adminResult.admin,
      });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('[LOGIN] Exception:', error);
    return NextResponse.json({ error: 'Login failed: ' + String(error) }, { status: 500 });
  }
}
