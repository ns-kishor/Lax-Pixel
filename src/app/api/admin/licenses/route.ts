import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';

// Helper to generate a random 7-digit alphanumeric / numeric verification code
function generate7DigitCode(): string {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}

// GET: List all license orders for admin
export async function GET(req: NextRequest) {
  try {
    const adminToken = req.headers.get('x-admin-token');
    const admin = verifyAdminToken(adminToken);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const [licenses, feeSetting] = await Promise.all([
      db.sellerLicense.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              sellerProfile: {
                select: {
                  companyName: true,
                  sellerCode: true,
                  approved: true,
                },
              },
            },
          },
        },
      }),
      db.siteSetting.findUnique({ where: { key: 'seller_license_fee' } }),
    ]);

    const licenseFee = feeSetting?.value ? parseFloat(feeSetting.value) || 1000 : 1000;

    return NextResponse.json({
      licenses,
      licenseFee,
    });
  } catch (error) {
    console.error('Admin list licenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
  }
}

// PUT: Approve with License Link, Reject, or Update Fee
export async function PUT(req: NextRequest) {
  try {
    const adminToken = req.headers.get('x-admin-token');
    const admin = verifyAdminToken(adminToken);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, licenseId, licenseUrl, rejectReason, feeAmount } = body;

    // Action 1: Update Hard Copy Fee
    if (action === 'UPDATE_FEE') {
      const numFee = parseFloat(String(feeAmount));
      if (isNaN(numFee) || numFee < 0) {
        return NextResponse.json({ error: 'সঠিক টাকার পরিমাণ দিন।' }, { status: 400 });
      }

      await db.siteSetting.upsert({
        where: { key: 'seller_license_fee' },
        update: { value: String(Math.round(numFee)) },
        create: { key: 'seller_license_fee', value: String(Math.round(numFee)) },
      });

      return NextResponse.json({
        success: true,
        message: 'হার্ড কপি লাইসেন্স ফি সফলভাবে আপডেট হয়েছে।',
        feeAmount: Math.round(numFee),
      });
    }

    if (!licenseId) {
      return NextResponse.json({ error: 'License ID is required.' }, { status: 400 });
    }

    const license = await db.sellerLicense.findUnique({ where: { id: licenseId } });
    if (!license) {
      return NextResponse.json({ error: 'License order not found.' }, { status: 404 });
    }

    // Action 2: Approve
    if (action === 'APPROVE') {
      const cleanUrl = String(licenseUrl || '').trim();
      if (!cleanUrl) {
        return NextResponse.json({ error: 'লাইসেন্স এর লিংক প্রদান করা আবশ্যক।' }, { status: 400 });
      }

      // Generate 7-digit verification code for Hard Copy if not already assigned
      const verificationCode = license.type === 'HARD_COPY'
        ? (license.verificationCode || generate7DigitCode())
        : null;

      const updated = await db.sellerLicense.update({
        where: { id: licenseId },
        data: {
          status: 'APPROVED',
          licenseUrl: cleanUrl,
          paymentStatus: license.type === 'HARD_COPY' ? 'VERIFIED' : license.paymentStatus,
          verificationCode,
          reviewedAt: new Date(),
          reviewedBy: admin.adminId,
          rejectReason: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              sellerProfile: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: `লাইসেন্স সফলভাবে অনুমোদিত হয়েছে এবং লিংক বিক্রেতার কাছে পাঠানো হয়েছে।${
          license.type === 'HARD_COPY' ? ` (৭ সংখ্যার কোড: ${verificationCode})` : ''
        }`,
        license: updated,
      });
    }

    // Action 3: Reject
    if (action === 'REJECT') {
      const updated = await db.sellerLicense.update({
        where: { id: licenseId },
        data: {
          status: 'REJECTED',
          paymentStatus: 'REJECTED',
          rejectReason: String(rejectReason || 'আবেদনটি বাতিল করা হয়েছে।'),
          reviewedAt: new Date(),
          reviewedBy: admin.adminId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'লাইসেন্স আবেদন বাতিল করা হয়েছে।',
        license: updated,
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Admin update license error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + String(error) }, { status: 500 });
  }
}
