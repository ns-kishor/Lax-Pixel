import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/lib/db';

// In-memory session store
const sessions = new Map<string, { adminId: string; email: string; createdAt: number }>();

// Rate limit store: IP -> { count, firstAttempt }
const rateLimits = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_MAX = 5;
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

// POST: Login
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.', retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = sanitizeInput(body.email);
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length === 0) {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 400 });
    }

    const admin = await db.admin.findUnique({ where: { email } });
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, admin.password);
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
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
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
