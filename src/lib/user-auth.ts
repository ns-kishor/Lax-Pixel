import crypto from 'crypto';
import { NextRequest } from 'next/server';

const USER_TOKEN_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_MASTER_PASSWORD || 'lax-pixel-user-secret-2026';
const TOKEN_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface UserTokenPayload {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
}

/**
 * Generate a persistent HMAC SHA-256 signed user token
 */
export function generateUserToken(user: { id: string; email: string; role?: string }): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role || 'BUYER',
      createdAt: Date.now(),
    })
  ).toString('base64url');

  const signature = crypto.createHmac('sha256', USER_TOKEN_SECRET).update(payload).digest('base64url');
  return `usr_${payload}.${signature}`;
}

/**
 * Verify signed user token, returns payload or null
 */
export function verifyUserToken(token: string | null): UserTokenPayload | null {
  if (!token) return null;
  let cleanToken = token.trim();
  if (cleanToken.startsWith('Bearer ')) {
    cleanToken = cleanToken.slice(7).trim();
  }

  if (!cleanToken.startsWith('usr_') || !cleanToken.includes('.')) {
    return null;
  }

  const raw = cleanToken.slice(4);
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', USER_TOKEN_SECRET).update(payload).digest('base64url');
  if (expectedSig !== sig) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as UserTokenPayload;
    if (Date.now() - data.createdAt > TOKEN_DURATION) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Extract authenticated user identity from request.
 * Supports Authorization header (Bearer usr_...), x-user-token,
 * with graceful fallback to valid x-user-id header for backwards compatibility.
 */
export function getAuthenticatedUser(req: NextRequest): { userId: string; email?: string; role?: string } | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('x-user-token');
  if (authHeader) {
    const verified = verifyUserToken(authHeader);
    if (verified) return verified;
  }

  const headerUserId = req.headers.get('x-user-id');
  if (headerUserId && headerUserId.trim().length >= 8) {
    return { userId: headerUserId.trim() };
  }

  return null;
}
