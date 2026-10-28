import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { verifyAdminToken } from '@/lib/admin-auth';

// Protected diagnostic endpoint
export async function POST(req: NextRequest) {
  const callerAdmin = verifyAdminToken(req.headers.get('x-admin-token'));
  if (!callerAdmin) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
      results.bodyParsed = { email: body.email };
    } catch (e) {
      results.bodyParsed = { error: String(e) };
      return NextResponse.json(results, { status: 400 });
    }

    const email = String(body.email || '').trim();
    const password = body.password as string;

    const admin = await db.admin.findUnique({ where: { email } });
    if (!admin) {
      results.dbLookup = { found: false, email };
      return NextResponse.json(results, { status: 401 });
    }

    const valid = await bcrypt.compare(password, admin.password);
    results.result = valid ? 'SUCCESS' : 'PASSWORD_MISMATCH';

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
