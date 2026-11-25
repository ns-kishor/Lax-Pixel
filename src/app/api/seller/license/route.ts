import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/user-auth';

// GET: Fetch seller's license status, fee, and payment methods
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [userRec, profile, verification, licenses, feeSetting, allPaymentMethods] = await Promise.all([
      db.user.findUnique({ where: { id: auth.userId }, select: { role: true } }),
      db.sellerProfile.findUnique({ where: { userId: auth.userId } }),
      db.sellerVerification.findUnique({ where: { userId: auth.userId }, select: { status: true } }),
      db.sellerLicense.findMany({
        where: { userId: auth.userId },
        orderBy: { createdAt: 'desc' },
      }),
      db.siteSetting.findUnique({ where: { key: 'seller_license_fee' } }),
      db.paymentMethod.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const isApproved = Boolean(profile?.approved || userRec?.role === 'SELLER' || verification?.status === 'APPROVED');

    // Filter digital payment methods (no Cash on Delivery)
    const digitalMethods = allPaymentMethods.filter(
      (m) => !['cash_on_delivery', 'Cash on Delivery', 'COD'].includes(m.name)
    );

    const licenseFee = feeSetting?.value ? parseFloat(feeSetting.value) || 1000 : 1000;

    // Distinguish soft copy and hard copy records
    const softCopy = licenses.find((l) => l.type === 'SOFT_COPY') || null;
    const hardCopy = licenses.find((l) => l.type === 'HARD_COPY') || null;
    const latestLicense = licenses[0] || null;

    return NextResponse.json({
      approved: isApproved,
      licenses,
      softCopy,
      hardCopy,
      latestLicense,
      licenseFee,
      paymentMethods: digitalMethods,
    });
  } catch (error) {
    console.error('Fetch seller license error:', error);
    return NextResponse.json({ error: 'Failed to fetch license data' }, { status: 500 });
  }
}

// POST: Request a Soft Copy or Hard Copy license
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [profile, userRec, verification] = await Promise.all([
      db.sellerProfile.findUnique({ where: { userId: auth.userId } }),
      db.user.findUnique({ where: { id: auth.userId }, select: { role: true } }),
      db.sellerVerification.findUnique({ where: { userId: auth.userId }, select: { status: true } }),
    ]);

    const isApproved = Boolean(profile?.approved || userRec?.role === 'SELLER' || verification?.status === 'APPROVED');
    if (!isApproved) {
      return NextResponse.json(
        { error: 'You must be an admin-approved verified seller to request a business license.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const type = body.type === 'HARD_COPY' ? 'HARD_COPY' : 'SOFT_COPY';

    if (type === 'SOFT_COPY') {
      // Check if already has a pending or approved soft copy
      const existingSoft = await db.sellerLicense.findFirst({
        where: {
          userId: auth.userId,
          type: 'SOFT_COPY',
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });

      if (existingSoft) {
        if (existingSoft.status === 'PENDING') {
          return NextResponse.json(
            { error: 'আপনার সফট কপি লাইসেন্সের আবেদন বর্তমানে রিভিউতে পেন্ডিং রয়েছে।' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'আপনার সফট কপি লাইসেন্স ইতিমধ্যে অনুমোদিত হয়েছে।' },
          { status: 400 }
        );
      }

      const newLicense = await db.sellerLicense.create({
        data: {
          userId: auth.userId,
          type: 'SOFT_COPY',
          status: 'PENDING',
          feeAmount: 0,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'সফট কপি লাইসেন্সের রিকোয়েস্ট সফলভাবে এডমিনের কাছে পাঠানো হয়েছে।',
        license: newLicense,
      }, { status: 201 });
    }

    // Hard Copy Request
    const { paymentMethod, transactionId, senderNumber } = body;
    if (!paymentMethod || !transactionId || !senderNumber) {
      return NextResponse.json(
        { error: 'পেমেন্ট মেথড, ট্রানজেকশন আইডি এবং যে নাম্বার থেকে টাকা পাঠিয়েছেন তা দেওয়া আবশ্যক।' },
        { status: 400 }
      );
    }

    // Check if already has an ongoing pending hard copy
    const existingPendingHard = await db.sellerLicense.findFirst({
      where: {
        userId: auth.userId,
        type: 'HARD_COPY',
        status: 'PENDING',
      },
    });

    if (existingPendingHard) {
      return NextResponse.json(
        { error: 'আপনার হার্ড কপি লাইসেন্সের একটি অর্ডার ইতিমধ্যে পেন্ডিং রয়েছে।' },
        { status: 400 }
      );
    }

    // Fetch authoritative fee setting
    const feeSetting = await db.siteSetting.findUnique({ where: { key: 'seller_license_fee' } });
    const feeAmount = feeSetting?.value ? parseFloat(feeSetting.value) || 1000 : 1000;

    const newLicense = await db.sellerLicense.create({
      data: {
        userId: auth.userId,
        type: 'HARD_COPY',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        feeAmount,
        paymentMethod: String(paymentMethod).trim(),
        transactionId: String(transactionId).trim(),
        senderNumber: String(senderNumber).trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'হার্ড কপি লাইসেন্সের আবেদন ও পেমেন্ট প্রুফ সফলভাবে এডমিনের কাছে সাবমিট করা হয়েছে।',
      license: newLicense,
    }, { status: 201 });
  } catch (error) {
    console.error('Request license error:', error);
    return NextResponse.json({ error: 'লাইসেন্স আবেদন প্রক্রিয়াকরণে ব্যর্থ হয়েছে: ' + String(error) }, { status: 500 });
  }
}
