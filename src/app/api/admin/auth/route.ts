import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/lib/db';

// In-memory session store
const sessions = new Map<string, { adminId: string; email: string; createdAt: number }>();

const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

export { sessions };

// Helper: verify admin token, returns admin data or null
export function verifyAdmin(token: string | null) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_DURATION) {
    sessions.delete(token);
    return null;
  }
  return session;
}

// GET: Check admin account status (no auth needed)
export async function GET() {
  try {
    const admins = await db.admin.findMany({
      select: { id: true, email: true, name: true, role: true, lastLogin: true, password: true },
    });
    // Test bcrypt in this server process
    let bcryptTest = false;
    if (admins.length > 0) {
      bcryptTest = await compare('admin123', admins[0].password);
    }
    return NextResponse.json({
      adminCount: admins.length,
      admins: admins.map(a => ({
        id: a.id,
        email: a.email,
        name: a.name,
        role: a.role,
        hashLen: a.password.length,
      })),
      bcryptServerTest: bcryptTest,
      activeSessions: sessions.size,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Login
export async function POST(req: NextRequest) {
  const debug: Record<string, unknown> = { step: 'start' };

  try {
    debug.step = 'parsing body';
    let body: Record<string, unknown>;
    try {
      body = await req.json();
      debug.bodyEmail = body.email;
      debug.bodyPwType = typeof body.password;
      debug.bodyPwLen = (body.password as string)?.length;
    } catch (e) {
      debug.bodyError = String(e);
      return NextResponse.json({ error: 'Invalid request body.', debug }, { status: 400 });
    }

    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    debug.step = 'validation';
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.', debug }, { status: 400 });
    }

    debug.step = 'db_lookup';
    const admin = await db.admin.findUnique({ where: { email } });
    debug.dbFound = !!admin;
    debug.dbEmail = admin?.email;

    if (!admin) {
      debug.failReason = 'ADMIN_NOT_FOUND';
      return NextResponse.json({ error: 'Invalid credentials.', debug }, { status: 401 });
    }

    debug.step = 'bcrypt_compare';
    debug.hashLen = admin.password.length;
    const valid = await compare(password, admin.password);
    debug.bcryptResult = valid;

    if (!valid) {
      // Also test with trimmed password
      debug.bcryptTrimmedResult = await compare(password.trim(), admin.password);
      debug.failReason = 'PASSWORD_MISMATCH';
      return NextResponse.json({ error: 'Invalid credentials.', debug }, { status: 401 });
    }

    debug.step = 'creating_session';
    const token = crypto.randomUUID();
    sessions.set(token, {
      adminId: admin.id,
      email: admin.email,
      createdAt: Date.now(),
    });

    await db.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    debug.step = 'success';
    return NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error) {
    debug.step = 'exception';
    debug.exception = String(error);
    return NextResponse.json({ error: 'Internal server error.', debug }, { status: 500 });
  }
}

// PUT: Reset admin password to default
export async function PUT() {
  try {
    const DEFAULT_PASSWORD = 'admin123';
    const newHash = await hash(DEFAULT_PASSWORD, 12);

    const admin = await db.admin.findFirst();
    if (!admin) {
      // Create admin if none exists
      const created = await db.admin.create({
        data: {
          email: 'admin@laxpixel.com',
          password: newHash,
          name: 'Admin',
          role: 'SUPER_ADMIN',
        },
      });
      return NextResponse.json({ success: true, message: 'Admin account created with default password.', email: created.email });
    }

    await db.admin.update({
      where: { id: admin.id },
      data: { password: newHash },
    });

    // Verify the reset worked
    const verify = await db.admin.findUnique({ where: { id: admin.id } });
    const works = verify ? await compare(DEFAULT_PASSWORD, verify.password) : false;

    return NextResponse.json({
      success: true,
      message: 'Password reset to default.',
      email: admin.email,
      verified: works,
    });
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
