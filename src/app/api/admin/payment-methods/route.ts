import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 1000);
}

const SEED_METHODS = [
  { name: 'bKash', description: 'Mobile financial service by bKash Limited', icon: '📱', proofRequired: 'TRANSACTION_ID', instructions: 'Send payment to bKash number: 017XXXXXXXX. Include your Order Number as the reference.', active: true, sortOrder: 1 },
  { name: 'Nagad', description: 'Mobile financial service by Dutch-Bangla Bank', icon: '📲', proofRequired: 'TRANSACTION_ID', instructions: 'Send payment to Nagad number: 018XXXXXXXX. Include your Order Number as the reference.', active: true, sortOrder: 2 },
  { name: 'Rocket', description: 'Mobile financial service by Dutch-Bangla Bank', icon: '🚀', proofRequired: 'TRANSACTION_ID', instructions: 'Send payment to Rocket number: 019XXXXXXXX. Include your Order Number as the reference.', active: true, sortOrder: 3 },
  { name: 'Upay', description: 'Mobile financial service by UCB', icon: '💳', proofRequired: 'TRANSACTION_ID', instructions: 'Send payment to Upay number: 016XXXXXXXX. Include your Order Number as the reference.', active: true, sortOrder: 4 },
  { name: 'Bank Transfer', description: 'Direct bank transfer to our account', icon: '🏦', proofRequired: 'BANK_RECEIPT', instructions: 'Transfer to: Bank Name: XXX, Account: XXXXXXXX, Branch: XXX. Upload the bank receipt as proof.', active: true, sortOrder: 5 },
  { name: 'Cash on Delivery', description: 'Pay when you receive your order', icon: '💵', proofRequired: null, instructions: 'Pay in cash when the delivery person arrives. Additional COD charge may apply.', active: true, sortOrder: 6 },
  { name: 'Debit/Credit Card', description: 'Pay with your debit or credit card', icon: '💳', proofRequired: null, instructions: 'Card payments are processed securely. Your card details are never stored.', active: true, sortOrder: 7 },
  { name: 'ATM Card', description: 'Pay with your ATM card', icon: '🏧', proofRequired: null, instructions: 'ATM card payments are processed at checkout through our secure payment gateway.', active: true, sortOrder: 8 },
  { name: 'Visa/MasterCard', description: 'Pay with Visa or MasterCard', icon: '🌐', proofRequired: null, instructions: 'Accepted worldwide. Your payment is protected by Visa/MasterCard security protocols.', active: true, sortOrder: 9 },
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
