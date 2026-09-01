import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const methods = await db.paymentMethod.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ methods });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
  }
}
