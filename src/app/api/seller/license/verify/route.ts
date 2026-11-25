import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/user-auth';

// POST: Verify receipt of physical Hard Copy license using the 7-digit code
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthenticatedUser(req);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { licenseId, verificationCode } = body;

    const code = String(verificationCode || '').trim();
    if (!code) {
      return NextResponse.json({ error: '7-digit verification code is required.' }, { status: 400 });
    }

    // Lookup target license
    const license = licenseId
      ? await db.sellerLicense.findUnique({ where: { id: String(licenseId) } })
      : await db.sellerLicense.findFirst({
          where: {
            userId: auth.userId,
            type: 'HARD_COPY',
            status: 'APPROVED',
          },
          orderBy: { createdAt: 'desc' },
        });

    if (!license || license.userId !== auth.userId) {
      return NextResponse.json({ error: 'License record not found.' }, { status: 404 });
    }

    if (license.type !== 'HARD_COPY') {
      return NextResponse.json({ error: 'Only physical hard copy licenses can be verified.' }, { status: 400 });
    }

    if (license.status !== 'APPROVED') {
      return NextResponse.json({ error: 'This license has not been approved by admin yet.' }, { status: 400 });
    }

    if (license.isDeliveryVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'This hard copy license has already been verified.',
      });
    }

    // Match 7-digit verification code (case-insensitive)
    if (!license.verificationCode || license.verificationCode.trim().toUpperCase() !== code.toUpperCase()) {
      return NextResponse.json({
        error: 'Invalid verification code. Please check the 7-digit code provided on your physical certificate.',
      }, { status: 400 });
    }

    // Successfully verified!
    const updated = await db.sellerLicense.update({
      where: { id: license.id },
      data: {
        isDeliveryVerified: true,
        deliveryVerifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Congratulations! Your hard copy license has been verified successfully.',
      license: updated,
    });
  } catch (error) {
    console.error('Verify license delivery error:', error);
    return NextResponse.json({ error: 'Failed to complete verification: ' + String(error) }, { status: 500 });
  }
}
