import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { saveOtp } from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/email';
import { otpResendLimiter, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const email = String(body.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // SEC-FIND-07: Rate limiting on OTP resend (max 4 per 15 min)
    const ip = getClientIp(req);
    const limit = otpResendLimiter.check(`${ip}:${email}`);
    if (!limit.success) {
      return NextResponse.json({ error: limit.message }, { status: 429 });
    }

    // Check if user is already registered
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'This account is already registered and active. Please sign in.' }, { status: 400 });
    }

    // Retrieve previous pending OTP row to re-use payload
    let payload: any = null;
    try {
      // SEC-FIND-15: Parameterized tagged query instead of raw unsafe SQL
      const rows = await db.$queryRaw<any[]>`
        SELECT payload FROM email_otps WHERE LOWER(email) = LOWER(${email}) ORDER BY created_at DESC LIMIT 1
      `;
      if (rows && rows.length > 0) {
        payload = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
      }
    } catch (dbErr) {
      console.warn('DB check on resend:', dbErr);
    }

    if (!payload) {
      return NextResponse.json(
        { error: 'Registration session expired. Please fill the registration form again.' },
        { status: 400 }
      );
    }

    // Generate new 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save renewed code
    await saveOtp(email, code, payload);

    // Send email
    const emailResult = await sendOtpEmail({
      to: email,
      name: payload.name || 'User',
      code,
    });

    // SEC-FIND-05: Restrict devCode strictly to development mode
    return NextResponse.json({
      success: true,
      message: 'A new 6-digit verification code has been sent.',
      devCode: process.env.NODE_ENV === 'development' ? (emailResult.devCode || undefined) : undefined,
    });
  } catch (error) {
    console.error('[RESEND-OTP] EXCEPTION:', error);
    return NextResponse.json({ error: 'Failed to resend code: ' + String(error) }, { status: 500 });
  }
}

