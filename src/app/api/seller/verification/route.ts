import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET — fetch current seller's verification status
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const verification = await db.sellerVerification.findUnique({
      where: { userId },
      select: {
        id: true, businessName: true, businessType: true, businessAddress: true,
        businessCity: true, businessCountry: true, nidNumber: true, phone: true,
        website: true, description: true, status: true, rejectReason: true,
        createdAt: true, reviewedAt: true,
      },
    });

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId },
      select: { approved: true },
    });

    return NextResponse.json({ verification, approved: sellerProfile?.approved ?? false });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch verification' }, { status: 500 });
  }
}

// POST — submit verification form
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const { businessName, businessType, businessAddress, businessCity, businessCountry, nidNumber, phone, website, description } = body;

    if (!businessName || !businessType || !businessAddress || !businessCity || !businessCountry || !nidNumber || !phone) {
      return NextResponse.json({ error: 'All required fields must be filled' }, { status: 400 });
    }

    // Check if already submitted and not rejected
    const existing = await db.sellerVerification.findUnique({ where: { userId } });
    if (existing && existing.status === 'APPROVED') {
      return NextResponse.json({ error: 'Your account is already verified' }, { status: 400 });
    }
    if (existing && existing.status === 'PENDING') {
      return NextResponse.json({ error: 'Your verification is already pending review' }, { status: 400 });
    }

    const verification = await db.sellerVerification.upsert({
      where: { userId },
      update: {
        businessName, businessType, businessAddress, businessCity, businessCountry,
        nidNumber, phone, website: website || null, description: description || null,
        status: 'PENDING', reviewedBy: null, reviewedAt: null, rejectReason: null,
      },
      create: {
        userId, businessName, businessType, businessAddress, businessCity, businessCountry,
        nidNumber, phone, website: website || null, description: description || null,
      },
    });

    // Ensure sellerProfile exists in pending state & update role
    await db.sellerProfile.upsert({
      where: { userId },
      update: { companyName: businessName, description: description || '', website: website || null },
      create: { userId, companyName: businessName, description: description || '', website: website || null, approved: false },
    });
    await db.user.update({
      where: { id: userId },
      data: { role: 'SELLER' },
    }).catch(() => {});

    return NextResponse.json({ verification, message: 'Verification submitted successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to submit verification' }, { status: 500 });
  }
}
