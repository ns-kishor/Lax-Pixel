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
      return NextResponse.json({ error: '৭ সংখ্যার ভেরিফিকেশন কোড দেওয়া আবশ্যক।' }, { status: 400 });
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
      return NextResponse.json({ error: 'লাইসেন্স রেকর্ড পাওয়া যায়নি।' }, { status: 404 });
    }

    if (license.type !== 'HARD_COPY') {
      return NextResponse.json({ error: 'শুধুমাত্র হার্ড কপি লাইসেন্স ভেরিফাই করা সম্ভব।' }, { status: 400 });
    }

    if (license.status !== 'APPROVED') {
      return NextResponse.json({ error: 'লাইসেন্সটি এখনো এডমিন দ্বারা অনুমোদিত হয়নি।' }, { status: 400 });
    }

    if (license.isDeliveryVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'এই হার্ড কপি লাইসেন্স ইতিমধ্যে ভেরিফাই করা হয়েছে।',
      });
    }

    // Match 7-digit verification code (case-insensitive)
    if (!license.verificationCode || license.verificationCode.trim().toUpperCase() !== code.toUpperCase()) {
      return NextResponse.json({
        error: 'ভেরিফিকেশন কোডটি সঠিক নয়। হার্ড কপির সাথে থাকা ৭ সংখ্যার কোডটি মিলিয়ে পুনরায় চেষ্টা করুন।',
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
      message: 'অভিনন্দন! আপনার হার্ড কপি লাইসেন্স সফলভাবে ভেরিফাই হয়েছে।',
      license: updated,
    });
  } catch (error) {
    console.error('Verify license delivery error:', error);
    return NextResponse.json({ error: 'ভেরিফিকেশন সম্পন্ন করা সম্ভব হয়নি: ' + String(error) }, { status: 500 });
  }
}
