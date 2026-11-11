import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAndConsumeOtp } from '@/lib/otp-store';

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and 6-digit code are required.' }, { status: 400 });
    }

    // Verify OTP from store
    const verification = await verifyAndConsumeOtp(email, code);
    if (!verification.valid || !verification.payload) {
      return NextResponse.json({ error: verification.error || 'Invalid or expired code.' }, { status: 400 });
    }

    const payload = verification.payload;

    // Double check if user was created meanwhile
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      const { password: _, ...safeUser } = existing;
      const sellerProfile = existing.role === 'SELLER' ? await db.sellerProfile.findUnique({ where: { userId: existing.id } }) : null;
      return NextResponse.json({ user: safeUser, sellerProfile, message: 'Account already active.' }, { status: 200 });
    }

    // Create user in DB
    const user = await db.user.create({
      data: {
        email: payload.email,
        password: payload.passwordHash,
        name: payload.name,
        role: payload.role,
        phone: payload.phone || '',
        address: payload.address || '',
        city: payload.city || '',
        country: payload.country || '',
        zipCode: payload.zipCode || '',
      },
    });

    let sellerProfile: any = null;
    if (payload.role === 'SELLER') {
      sellerProfile = await db.sellerProfile.create({
        data: {
          userId: user.id,
          companyName: payload.companyName || payload.name,
          description: payload.companyDescription || '',
          approved: false,
        },
      });
    }

    const { password: _, ...safeUser } = user;
    return NextResponse.json({
      success: true,
      user: safeUser,
      sellerProfile,
      message: 'Account verified and created successfully.',
    });
  } catch (error) {
    console.error('[VERIFY-OTP] EXCEPTION:', error);
    return NextResponse.json({ error: 'Verification failed: ' + String(error) }, { status: 500 });
  }
}
