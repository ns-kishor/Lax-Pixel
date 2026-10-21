import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '../auth/route';

// GET — list all verification requests
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const verifications = await db.sellerVerification.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      },
    });
    return NextResponse.json({ verifications });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PUT — approve or reject a verification
export async function PUT(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const { id, action, rejectReason } = await req.json();

    if (!id || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const verification = await db.sellerVerification.findUnique({ where: { id } });
    if (!verification) return NextResponse.json({ error: 'Verification not found' }, { status: 404 });

    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await db.sellerVerification.update({
      where: { id },
      data: {
        status,
        reviewedBy: admin.adminId,
        reviewedAt: new Date(),
        rejectReason: action === 'REJECT' ? (rejectReason || 'Verification rejected') : null,
      },
    });

    // If approved, also update sellerProfile.approved
    if (action === 'APPROVE') {
      await db.sellerProfile.update({
        where: { userId: verification.userId },
        data: { approved: true },
      });
    } else {
      // If rejected, ensure approved is false
      await db.sellerProfile.updateMany({
        where: { userId: verification.userId },
        data: { approved: false },
      });
    }

    return NextResponse.json({ success: true, status });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
