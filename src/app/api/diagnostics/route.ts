import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { verifyAdminToken } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  // Protect diagnostic endpoint: only authorized admins may view system diagnostics
  const admin = verifyAdminToken(req.headers.get('x-admin-token'));
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // 1. Test database connection
  try {
    const userCount = await db.user.count();
    const adminCount = await db.admin.count();
    const productCount = await db.product.count();
    results.db = {
      status: 'ok',
      users: userCount,
      admins: adminCount,
      products: productCount,
    };
  } catch (e) {
    results.db = { status: 'error', message: String(e) };
  }

  // 2. Test bcrypt
  try {
    const testHash = await bcrypt.hash('test123', 10);
    const testCompare = await bcrypt.compare('test123', testHash);
    results.bcrypt = { status: 'ok', hashWorks: testCompare };
  } catch (e) {
    results.bcrypt = { status: 'error', message: String(e) };
  }

  // 3. Test admin account count
  try {
    const adminRecord = await db.admin.findFirst({ select: { id: true, email: true, role: true } });
    results.adminAccount = adminRecord
      ? { status: 'ok', email: adminRecord.email, role: adminRecord.role }
      : { status: 'no_admin_found' };
  } catch (e) {
    results.adminAccount = { status: 'error', message: String(e) };
  }

  return NextResponse.json(results);
}
