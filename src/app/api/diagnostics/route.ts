import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function GET() {
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

  // 3. Test admin credentials
  try {
    const admin = await db.admin.findFirst();
    if (admin) {
      const valid = await bcrypt.compare('admin123', admin.password);
      results.adminAccount = {
        status: 'ok',
        email: admin.email,
        passwordValid: valid,
      };
    } else {
      results.adminAccount = { status: 'no_admin_found' };
    }
  } catch (e) {
    results.adminAccount = { status: 'error', message: String(e) };
  }

  // 4. Test user credentials (first user)
  try {
    const firstUser = await db.user.findFirst();
    if (firstUser) {
      results.firstUser = {
        status: 'ok',
        email: firstUser.email,
        name: firstUser.name,
        role: firstUser.role,
        passwordHashLength: firstUser.password.length,
      };
    } else {
      results.firstUser = { status: 'no_users' };
    }
  } catch (e) {
    results.firstUser = { status: 'error', message: String(e) };
  }

  // 5. Test full bcrypt round-trip (hash then compare in same process)
  try {
    const pw = 'roundtrip_test';
    const hash = await bcrypt.hash(pw, 12);
    const match = await bcrypt.compare(pw, hash);
    results.roundtrip = { status: match ? 'ok' : 'fail', matched: match };
  } catch (e) {
    results.roundtrip = { status: 'error', message: String(e) };
  }

  return NextResponse.json(results);
}
