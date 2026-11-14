import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET — fetch current seller's verification status, fee amount, and available payment methods
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
        feeAmount: true, paymentMethod: true, transactionId: true, senderNumber: true,
        createdAt: true, reviewedAt: true,
      },
    });

    const sellerProfile = await db.sellerProfile.findUnique({
      where: { userId },
      select: { approved: true },
    });

    const feeSetting = await db.siteSetting.findUnique({
      where: { key: 'seller_verification_fee' },
    });
    const feeAmount = feeSetting?.value ? parseFloat(feeSetting.value) || 500 : 500;

    const paymentMethods = await db.paymentMethod.findMany({
      where: {
        active: true,
        name: { notIn: ['cash_on_delivery', 'Cash on Delivery', 'COD'] },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      verification,
      approved: sellerProfile?.approved ?? false,
      feeAmount,
      paymentMethods,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch verification' }, { status: 500 });
  }
}

// POST — submit verification form with fee payment details
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const {
      businessName,
      businessType,
      businessAddress,
      businessCity,
      businessCountry,
      nidNumber,
      phone,
      website,
      description,
      paymentMethod,
      transactionId,
      senderNumber,
    } = body;

    if (!businessName || !businessType || !businessAddress || !businessCity || !businessCountry || !nidNumber || !phone) {
      return NextResponse.json({ error: 'All required business fields must be filled' }, { status: 400 });
    }

    if (!paymentMethod || !transactionId || !senderNumber) {
      return NextResponse.json({
        error: 'Please select a payment method and provide Transaction ID and Sender Number for verification fee',
      }, { status: 400 });
    }

    // Check if already submitted and not rejected
    const existing = await db.sellerVerification.findUnique({ where: { userId } });
    if (existing && existing.status === 'APPROVED') {
      return NextResponse.json({ error: 'Your account is already verified' }, { status: 400 });
    }
    if (existing && existing.status === 'PENDING') {
      return NextResponse.json({ error: 'Your verification is already pending review' }, { status: 400 });
    }

    const feeSetting = await db.siteSetting.findUnique({
      where: { key: 'seller_verification_fee' },
    });
    const currentFee = feeSetting?.value ? parseFloat(feeSetting.value) || 500 : 500;

    const verification = await db.sellerVerification.upsert({
      where: { userId },
      update: {
        businessName,
        businessType,
        businessAddress,
        businessCity,
        businessCountry,
        nidNumber,
        phone,
        website: website || null,
        description: description || null,
        feeAmount: currentFee,
        paymentMethod: String(paymentMethod).trim(),
        transactionId: String(transactionId).trim(),
        senderNumber: String(senderNumber).trim(),
        status: 'PENDING',
        reviewedBy: null,
        reviewedAt: null,
        rejectReason: null,
      },
      create: {
        userId,
        businessName,
        businessType,
        businessAddress,
        businessCity,
        businessCountry,
        nidNumber,
        phone,
        website: website || null,
        description: description || null,
        feeAmount: currentFee,
        paymentMethod: String(paymentMethod).trim(),
        transactionId: String(transactionId).trim(),
        senderNumber: String(senderNumber).trim(),
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
  } catch (err) {
    console.error('Submit verification error:', err);
    return NextResponse.json({ error: 'Failed to submit verification' }, { status: 500 });
  }
}
