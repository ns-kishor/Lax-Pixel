import crypto from 'crypto';
import { db } from './db';
import bcrypt from 'bcryptjs';

// Master password — the definitive admin login credential
const ADMIN_MASTER_PASSWORD = process.env.ADMIN_MASTER_PASSWORD || 'admin123';
const ADMIN_TOKEN_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_MASTER_PASSWORD || 'lax-pixel-admin-secret-2026';

// In-memory session store
const sessions = new Map<string, { adminId: string; email: string; createdAt: number }>();
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export { sessions, ADMIN_MASTER_PASSWORD };

/** Generate a signed admin token that remains valid across server reloads/restarts */
export function generateAdminToken(admin: { id: string; email: string }) {
  const payload = Buffer.from(JSON.stringify({ adminId: admin.id, email: admin.email, createdAt: Date.now() })).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('base64url');
  return `adm_${payload}.${signature}`;
}

/** Verify admin token, returns session data or null */
export function verifyAdminToken(token: string | null) {
  if (!token) return null;

  // 1. Check in-memory session (fast path)
  const session = sessions.get(token);
  if (session) {
    if (Date.now() - session.createdAt > SESSION_DURATION) {
      sessions.delete(token);
      return null;
    }
    return session;
  }

  // 2. Check signed persistent token (survives server restarts)
  if (token.startsWith('adm_') && token.includes('.')) {
    const raw = token.slice(4);
    const [payload, sig] = raw.split('.');
    if (payload && sig) {
      const expectedSig = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('base64url');
      if (expectedSig === sig) {
        try {
          const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
          if (Date.now() - data.createdAt <= SESSION_DURATION) {
            const verified = { adminId: data.adminId, email: data.email, createdAt: data.createdAt };
            // Cache back into memory session
            sessions.set(token, verified);
            return verified;
          }
        } catch {}
      }
    }
  }

  return null;
}

/** Verify a password against an admin's stored hash */
export function verifyAdminPassword(password: string, storedHash: string): boolean {
  // Try PBKDF2 hash comparison
  if (storedHash.startsWith('pbkdf2_sha512$')) {
    const parts = storedHash.split('$');
    const salt = parts[2];
    const expectedHash = parts[3];
    const actualHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    if (actualHash === expectedHash) return true;
  }
  // Try bcrypt hash comparison (used by seed.mjs)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    try {
      if (bcrypt.compareSync(password, storedHash)) return true;
    } catch {
      // fallback
    }
  }
  // Fallback: master password direct match
  if (password === ADMIN_MASTER_PASSWORD) return true;
  if (password === storedHash) return true;
  return false;
}

/** Attempt admin login. Returns { token, admin } on success, or null on failure. */
export async function tryAdminLogin(email: string, password: string): Promise<{ token: string; admin: { id: string; email: string; name: string; role: string } } | null> {
  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin) return null;

  if (!verifyAdminPassword(password, admin.password)) return null;

  // Create persistent cryptographically signed token
  const token = generateAdminToken({ id: admin.id, email: admin.email });
  sessions.set(token, { adminId: admin.id, email: admin.email, createdAt: Date.now() });

  await db.admin.update({ where: { id: admin.id }, data: { lastLogin: new Date() } });

  return {
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
  };
}

/** Hash a password using PBKDF2 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2_sha512$10000$${salt}$${hash}`;
}
