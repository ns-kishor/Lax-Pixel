import { db } from '@/lib/db';
import { compare } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { tryAdminLogin } from '@/lib/admin-auth';
import { generateUserToken } from '@/lib/user-auth';
import { authLimiter, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // SEC-FIND-07: Rate limiting on authentication attempts (10 per 15 min per IP)
    const ip = getClientIp(req);
    const limit = authLimiter.check(ip);
    if (!limit.success) {
      return NextResponse.json({ error: limit.message }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const rawEmail = (body.email as string)?.trim();
    const password = body.password as string;

    if (!rawEmail || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase();

    // 1. Try regular user login (case-insensitive email lookup)
    let user = await db.user.findUnique({ where: { email } });
    if (!user && rawEmail !== email) {
      user = await db.user.findUnique({ where: { email: rawEmail } });
    }

    if (user) {
      if (user.banned) {
        return NextResponse.json({ error: 'Your account has been suspended. Please contact customer support.' }, { status: 403 });
      }
      const valid = await compare(password, user.password);
      if (valid) {
        const { password: _, ...safeUser } = user;
        let sellerProfile: any = null;
        if (user.role === 'SELLER') {
          sellerProfile = await db.sellerProfile.findUnique({ where: { userId: user.id } });
        }
        const token = generateUserToken({ id: user.id, email: user.email, role: user.role });
        return NextResponse.json({ user: safeUser, sellerProfile, token });
      }
    }

    // 2. If no user found or password didn't match, try admin login
    const adminResult = await tryAdminLogin(rawEmail, password);
    if (adminResult) {
      return NextResponse.json({
        isAdmin: true,
        token: adminResult.token,
        admin: adminResult.admin,
      });
    }

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  } catch (error) {
    console.error('[LOGIN] Exception:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during login. Please try again.' }, { status: 500 });
  }
}
