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

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: String(name).trim(),
        role: assignedRole,
        phone: (phone as string) || '',
        address: (address as string) || '',
        city: (city as string) || '',
        country: (country as string) || '',
        zipCode: (zipCode as string) || '',
      },
    });

    let sellerProfile: any = null;
    if (assignedRole === 'SELLER') {
      sellerProfile = await db.sellerProfile.create({
        data: {
          userId: user.id,
          companyName: (companyName as string) || String(name).trim(),
          description: (companyDescription as string) || '',
          approved: false,
        },
      });
    }

    const { password: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser, sellerProfile }, { status: 201 });
  } catch (error) {
    console.error('[USER-REGISTER] EXCEPTION:', error);
    return NextResponse.json({ error: 'Registration failed: ' + String(error) }, { status: 500 });
  }
}
