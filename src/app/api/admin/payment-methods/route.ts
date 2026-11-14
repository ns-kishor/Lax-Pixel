import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 1000);
}

const SEED_METHODS = [
  { name: 'bKash', description: 'bKash Personal / Merchant Payment', icon: '/payment-methods/bkash.png', proofRequired: 'TRANSACTION_ID', instructions: 'Send money / payment to bKash number: 017XXXXXXXX (Personal/Merchant). Enter the Transaction ID (TrxID) and your bKash phone number below.', active: true, sortOrder: 1 },
  { name: 'Nagad', description: 'Nagad Personal / Merchant Payment', icon: '/payment-methods/nagad.png', proofRequired: 'TRANSACTION_ID', instructions: 'Send money to Nagad number: 018XXXXXXXX. Enter the Transaction ID (TrxID) and your Nagad phone number below.', active: true, sortOrder: 2 },
  { name: 'Rocket', description: 'DBBL Rocket Mobile Payment', icon: '/payment-methods/rocket.png', proofRequired: 'TRANSACTION_ID', instructions: 'Send money to Rocket number: 019XXXXXXXX. Enter the Transaction ID (TrxID) and your Rocket phone number below.', active: true, sortOrder: 3 },
  { name: 'Upay', description: 'UCB Upay Mobile Payment', icon: '/payment-methods/upay.png', proofRequired: 'TRANSACTION_ID', instructions: 'Send money to Upay number: 016XXXXXXXX. Enter the Transaction ID (TrxID) and your Upay phone number below.', active: true, sortOrder: 4 },
  { name: 'mCash', description: 'Islami Bank mCash Payment', icon: '/payment-methods/mcash.webp', proofRequired: 'TRANSACTION_ID', instructions: 'Send money to mCash number: 01XXXXXXXXX. Enter the Transaction ID (TrxID) and your mCash phone number below.', active: true, sortOrder: 5 },
  { name: 'GPay', description: 'Grameenphone GPay Payment', icon: '/payment-methods/gpay.png', proofRequired: 'TRANSACTION_ID', instructions: 'Send payment via GPay. Enter the Transaction ID (TrxID) and your registered phone number below.', active: true, sortOrder: 6 },
  { name: 'Cellfin', description: 'Islami Bank Cellfin Payment', icon: '/payment-methods/cellfin.jpg', proofRequired: 'TRANSACTION_ID', instructions: 'Transfer funds via Cellfin wallet. Enter the Transaction ID / Reference and your sender phone number below.', active: true, sortOrder: 7 },
  { name: 'Mukto-Pay', description: 'Mukto-Pay Digital Payment', icon: '/payment-methods/muktopay.webp', proofRequired: 'TRANSACTION_ID', instructions: 'Pay via Mukto-Pay. Enter the Transaction ID and your sender phone number below.', active: true, sortOrder: 8 },
  { name: 'Nexus-Pay', description: 'Dutch-Bangla Bank NexusPay', icon: '/payment-methods/nexuspay.png', proofRequired: 'TRANSACTION_ID', instructions: 'Send money / payment via NexusPay. Enter the Reference / Transaction ID and your sender number below.', active: true, sortOrder: 9 },
  { name: 'Pathao-Pay', description: 'Pathao Pay Digital Payment', icon: '/payment-methods/pathaopay.png', proofRequired: 'TRANSACTION_ID', instructions: 'Send money via Pathao Pay. Enter the Transaction ID and your sender phone number below.', active: true, sortOrder: 10 },
  { name: 'cash_on_delivery', description: 'Cash on Delivery (ক্যাশ অন ডেলিভারি)', icon: '/payment-methods/cash_on_delivery.jpg', proofRequired: null, instructions: 'Pay cash when you receive the order at your doorstep. No advance payment required.', active: true, sortOrder: 11 },
];

// GET: List payment methods
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeParam = searchParams.get('active');

    const where: Record<string, unknown> = {};
    if (activeParam !== null && activeParam !== '') {
      where.active = activeParam === 'true';
    }

    const methods = await db.paymentMethod.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ methods });
  } catch (error) {
    console.error('Admin list payment methods error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Create payment method OR seed
export async function POST(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isSeed = searchParams.get('seed') === 'true';

    if (isSeed) {
      const existing = await db.paymentMethod.findMany({ select: { name: true } });
      const existingNames = new Set(existing.map((m) => m.name));
      const toCreate = SEED_METHODS.filter((m) => !existingNames.has(m.name));

      if (toCreate.length === 0) {
        return NextResponse.json({ message: 'All seed payment methods already exist.', created: 0 });
      }

      const result = await db.paymentMethod.createMany({ data: toCreate });
      return NextResponse.json({ message: `Seeded ${result.count} payment methods.`, created: result.count });
    }

    const body = await req.json();
    const name = sanitizeInput(body.name);
    if (!name) {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }

    const method = await db.paymentMethod.create({
      data: {
        name,
        description: body.description !== undefined ? sanitizeInput(body.description) : null,
        icon: body.icon !== undefined ? sanitizeInput(body.icon) : null,
        proofRequired: body.proofRequired !== undefined ? sanitizeInput(body.proofRequired) : null,
        instructions: body.instructions !== undefined ? sanitizeInput(body.instructions) : null,
        active: body.active !== undefined ? Boolean(body.active) : true,
        sortOrder: body.sortOrder !== undefined ? parseInt(body.sortOrder, 10) || 0 : 0,
      },
    });

    return NextResponse.json(method, { status: 201 });
  } catch (error) {
    console.error('Admin create payment method error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update payment method
export async function PATCH(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Payment method ID is required (query param).' }, { status: 400 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = sanitizeInput(body.name);
    if (body.description !== undefined) data.description = sanitizeInput(body.description) || null;
    if (body.icon !== undefined) data.icon = sanitizeInput(body.icon) || null;
    if (body.proofRequired !== undefined) data.proofRequired = sanitizeInput(body.proofRequired) || null;
    if (body.instructions !== undefined) data.instructions = sanitizeInput(body.instructions) || null;
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder, 10) || 0;

    const method = await db.paymentMethod.update({
      where: { id },
      data,
    });

    return NextResponse.json(method);
  } catch (error) {
    console.error('Admin update payment method error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete payment method
export async function DELETE(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = sanitizeInput(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Payment method ID is required (query param).' }, { status: 400 });
    }

    await db.paymentMethod.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete payment method error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
