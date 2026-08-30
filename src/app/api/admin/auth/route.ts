import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/lib/db';

// In-memory session store
const sessions = new Map<string, { adminId: string; email: string; createdAt: number }>();

// Rate limit store: IP -> { count, firstAttempt }
const rateLimits = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
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

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  let entry = rateLimits.get(ip);

  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    rateLimits.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW - (now - entry.firstAttempt)) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 255);
}

// GET: Diagnostic check (temporary, remove after debugging)
export async function GET() {
  try {
    const admins = await db.admin.findMany({
      select: { id: true, email: true, name: true, role: true, lastLogin: true, password: true },
    });
    return NextResponse.json({
      adminCount: admins.length,
      admins: admins.map(a => ({
        id: a.id,
        email: a.email,
        name: a.name,
        role: a.role,
        lastLogin: a.lastLogin,
        passwordHashLength: a.password.length,
        passwordHashPrefix: a.password.substring(0, 10),
      })),
      rateLimitEntries: rateLimits.size,
      sessionEntries: sessions.size,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: Login
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    console.error('[ADMIN-LOGIN] Attempt from IP:', ip);

    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      console.error('[ADMIN-LOGIN] Rate limited for IP:', ip, 'retryAfter:', rateCheck.retryAfter);
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.', retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = sanitizeInput(body.email);
    const password = body.password;

    console.error('[ADMIN-LOGIN] Email:', JSON.stringify(email), 'PwType:', typeof password, 'PwLen:', password?.length);

    if (!email || !password) {
      console.error('[ADMIN-LOGIN] Missing email or password');
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length === 0) {
      console.error('[ADMIN-LOGIN] Invalid password type/length');
      return NextResponse.json({ error: 'Invalid password.' }, { status: 400 });
    }

    const admin = await db.admin.findUnique({ where: { email } });
    console.error('[ADMIN-LOGIN] DB lookup result:', admin ? 'FOUND id=' + admin.id : 'NOT FOUND');

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, admin.password);
    console.error('[ADMIN-LOGIN] Bcrypt compare result:', valid);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

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

    console.error('[ADMIN-LOGIN] SUCCESS for:', admin.email);

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('[ADMIN-LOGIN] EXCEPTION:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Reset admin password to default (dev-only, no auth required)
export async function PUT() {
  try {
    const DEFAULT_PASSWORD = 'admin123';
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    const admin = await db.admin.findFirst();
    if (!admin) {
      return NextResponse.json({ error: 'No admin account found.' }, { status: 404 });
    }

    await db.admin.update({
      where: { id: admin.id },
      data: { password: hash },
    });

    // Also clear rate limits so the user can try again immediately
    rateLimits.clear();

    console.error('[ADMIN-LOGIN] Password reset for:', admin.email);
    return NextResponse.json({ success: true, message: 'Password reset to default.' });
  } catch (error) {
    console.error('[ADMIN-LOGIN] Reset error:', error);
    return NextResponse.json({ error: 'Reset failed.' }, { status: 500 });
  }
}

// DELETE: Logout
export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('x-admin-token');
    if (token) {
      sessions.delete(token);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
