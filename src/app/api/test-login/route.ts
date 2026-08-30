import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

// This endpoint simulates exactly what the admin login POST does,
// but returns diagnostic info at every step instead of success/error.
export async function POST(req: NextRequest) {
  const results: Record<string, unknown> = {};

  try {
    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
      results.bodyParsed = { email: body.email, passwordType: typeof body.password, passwordLength: (body.password as string)?.length };
    } catch (e) {
      results.bodyParsed = { error: String(e) };
      return NextResponse.json(results, { status: 400 });
    }

    const email = String(body.email || '').trim();
    const password = body.password as string;

    // Lookup
    try {
      const admin = await db.admin.findUnique({ where: { email } });
      if (!admin) {
        results.dbLookup = { found: false, email };
        return NextResponse.json(results, { status: 401 });
      }
      results.dbLookup = { found: true, id: admin.id, hashLength: admin.password.length };

      // Compare
      const valid = await bcrypt.compare(password, admin.password);
      results.bcryptCompare = { valid, inputPassword: password };

      if (!valid) {
        // Also try with trimmed password
        const validTrimmed = await bcrypt.compare(password.trim(), admin.password);
        results.bcryptCompareTrimmed = { valid: validTrimmed };
      }

      if (valid) {
        results.result = 'SUCCESS';
      } else {
        results.result = 'PASSWORD_MISMATCH';
      }
    } catch (e) {
      results.dbError = String(e);
    }
  } catch (e) {
    results.unexpectedError = String(e);
  }

  return NextResponse.json(results);
}
