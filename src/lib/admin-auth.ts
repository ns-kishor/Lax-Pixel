import crypto from 'crypto';
import { db } from './db';

import bcrypt from 'bcryptjs';

// Master password — the definitive admin login credential
const ADMIN_MASTER_PASSWORD = process.env.ADMIN_MASTER_PASSWORD || 'admin123';

// In-memory session store
const sessions = new Map<string, { adminId: string; email: string; createdAt: number }>();
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

export { sessions, ADMIN_MASTER_PASSWORD };

/** Verify admin token, returns session data or null */
export function verifyAdminToken(token: string | null) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_DURATION) {
    sessions.delete(token);
    return null;
  }
  return session;
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

  // Create session
  const token = crypto.randomUUID();
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
