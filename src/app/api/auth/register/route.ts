import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { saveOtp } from '@/lib/otp-store';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { password, name, role, phone, address, city, country, zipCode, companyName, companyDescription } = body;

    const rawEmail = (body.email as string)?.trim();
    if (!rawEmail || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase();

    // Check existing email case-insensitively
    let existing = await db.user.findUnique({ where: { email } });
    if (!existing && rawEmail !== email) {
      existing = await db.user.findUnique({ where: { email: rawEmail } });
    }
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await hash(String(password), 12);
    const assignedRole = role === 'SELLER' ? 'SELLER' : 'BUYER';

    // Generate random 6-digit OTP code (e.g. 582194)
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save pending registration payload to OTP store
    await saveOtp(email, code, {
      name: String(name).trim(),
      email,
      passwordHash: hashedPassword,
      role: assignedRole,
      phone: (phone as string) || '',
      address: (address as string) || '',
      city: (city as string) || '',
      country: (country as string) || '',
      zipCode: (zipCode as string) || '',
      companyName: (companyName as string) || String(name).trim(),
      companyDescription: (companyDescription as string) || '',
    });

    // Send OTP code to user's email
    const emailResult = await sendOtpEmail({
      to: email,
      name: String(name).trim(),
      code,
    });

    return NextResponse.json(
      {
        requireOtp: true,
        email,
        message: 'A 6-digit verification code has been sent to your email.',
        devCode: emailResult.devCode || undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[USER-REGISTER] EXCEPTION:', error);
    return NextResponse.json({ error: 'Registration failed: ' + String(error) }, { status: 500 });
  }
}
