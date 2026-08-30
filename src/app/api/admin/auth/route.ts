import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tryAdminLogin, verifyAdminToken, hashPassword, sessions, ADMIN_MASTER_PASSWORD } from '@/lib/admin-auth';

export { sessions };

/** Verify admin token — re-exported for other routes */
export const verifyAdmin = verifyAdminToken;

// GET: Check admin account status
export async function GET() {
  try {
    const admins = await db.admin.findMany({
      select: { id: true, email: true, name: true, role: true, lastLogin: true },
    });
    return NextResponse.json({ adminCount: admins.length, admins, activeSessions: sessions.size });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Login
export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const result = await tryAdminLogin(email, password);
    if (!result) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Reset admin password to default
export async function PUT() {
  try {
    const newHash = hashPassword(ADMIN_MASTER_PASSWORD);
    const admin = await db.admin.findFirst();
    if (!admin) {
      const created = await db.admin.create({
        data: { email: 'admin@laxpixel.com', password: newHash, name: 'Admin', role: 'SUPER_ADMIN' },
      });
      return NextResponse.json({ success: true, message: 'Admin account created.', email: created.email });
    }
    await db.admin.update({ where: { id: admin.id }, data: { password: newHash } });
    return NextResponse.json({ success: true, message: 'Password reset successfully.', email: admin.email });
  } catch (error) {
    return NextResponse.json({ error: 'Reset failed: ' + String(error) }, { status: 500 });
  }
}

// DELETE: Logout
export async function DELETE() {
  const authHeader = headers().get('x-admin-token');
  if (authHeader) sessions.delete(authHeader);
  return NextResponse.json({ success: true });
}
