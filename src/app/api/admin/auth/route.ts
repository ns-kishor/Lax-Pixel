import { NextRequest, NextResponse } from 'next/server';
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

// Master password — the definitive admin login credential.
// Stored as env var so it can be changed without code changes.
const ADMIN_MASTER_PASSWORD = process.env.ADMIN_MASTER_PASSWORD || 'admin123';

// PBKDF2-based hashing (Node.js built-in crypto — no external deps)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2_sha512$10000$${salt}$${hash}`;
}

function verifyPbkdf2(password: string, storedHash: string): boolean {
  if (!storedHash.startsWith('pbkdf2_sha512$')) return false;
  const parts = storedHash.split('$');
  const salt = parts[2];
  const expectedHash = parts[3];
  const actualHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return actualHash === expectedHash;
}

// GET: Check admin account status
export async function GET() {
  try {
    const admins = await db.admin.findMany({
      select: { id: true, email: true, name: true, role: true, lastLogin: true },
    });
    return NextResponse.json({
      adminCount: admins.length,
      admins,
      activeSessions: sessions.size,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Login
export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Find admin by email
    const admin = await db.admin.findUnique({ where: { email } });
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // Verify password: try PBKDF2 hash comparison first, then master password fallback
    let valid = verifyPbkdf2(password, admin.password);
    if (!valid && password === ADMIN_MASTER_PASSWORD) {
      valid = true;
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // Create session
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

    return NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error) {
    console.error('[ADMIN-LOGIN] Exception:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Reset admin password to default (using PBKDF2)
export async function PUT() {
  try {
    const newHash = hashPassword(ADMIN_MASTER_PASSWORD);

    const admin = await db.admin.findFirst();
    if (!admin) {
      const created = await db.admin.create({
        data: {
          email: 'admin@laxpixel.com',
          password: newHash,
          name: 'Admin',
          role: 'SUPER_ADMIN',
        },
      });
      return NextResponse.json({ success: true, message: 'Admin account created.', email: created.email });
    }

    await db.admin.update({
      where: { id: admin.id },
      data: { password: newHash },
    });

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
