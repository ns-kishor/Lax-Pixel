import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, phone, address, city, country, zipCode, companyName, companyDescription } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await hash(password, 12);
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'BUYER',
        phone: phone || '',
        address: address || '',
        city: city || '',
        country: country || '',
        zipCode: zipCode || '',
      },
    });

    let sellerProfile = null;
    if (role === 'SELLER') {
      sellerProfile = await db.sellerProfile.create({
        data: {
          userId: user.id,
          companyName: companyName || name,
          description: companyDescription || '',
          approved: false,
        },
      });
    }

    const { password: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser, sellerProfile }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}