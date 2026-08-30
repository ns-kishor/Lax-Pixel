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

    const { email, password, name, role, phone, address, city, country, zipCode, companyName, companyDescription } = body;

    console.error('[USER-REGISTER] email:', JSON.stringify(email), 'name:', JSON.stringify(name), 'role:', role);

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: email as string } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await hash(password as string, 12);
    console.error('[USER-REGISTER] Hashed pw, creating user...');

    const user = await db.user.create({
      data: {
        email: email as string,
        password: hashedPassword,
        name: name as string,
        role: (role as string) || 'BUYER',
        phone: (phone as string) || '',
        address: (address as string) || '',
        city: (city as string) || '',
        country: (country as string) || '',
        zipCode: (zipCode as string) || '',
      },
    });

    console.error('[USER-REGISTER] User created:', user.id);

    let sellerProfile = null;
    if (role === 'SELLER') {
      sellerProfile = await db.sellerProfile.create({
        data: {
          userId: user.id,
          companyName: (companyName as string) || (name as string),
          description: (companyDescription as string) || '',
          approved: false,
        },
      });
    }

    const { password: _, ...safeUser } = user;
    console.error('[USER-REGISTER] SUCCESS:', user.email);
    return NextResponse.json({ user: safeUser, sellerProfile }, { status: 201 });
  } catch (error) {
    console.error('[USER-REGISTER] EXCEPTION:', error);
    return NextResponse.json({ error: 'Registration failed: ' + String(error) }, { status: 500 });
  }
}
