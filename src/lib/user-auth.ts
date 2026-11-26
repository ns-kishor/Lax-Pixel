import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Secure cryptographic session secret (SEC-01: No static repo fallbacks)
function getUserSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret && secret.trim().length >= 16) {
    return crypto.createHash('sha256').update(`${secret}:user_session_auth`).digest('hex');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be configured in production.');
  }
  return crypto.createHash('sha256').update(`local_dev_user_${process.env.COMPUTERNAME || 'dev'}`).digest('hex');
}

const USER_TOKEN_SECRET = getUserSecret();
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
 * Cryptographically verifies signed user token from Authorization header,
 * x-user-token header, or lp-token cookie.
 * Insecure raw header fallback is removed to prevent identity spoofing (ISSUE-SEC-02).
 */
export function getAuthenticatedUser(req: NextRequest): { userId: string; email?: string; role?: string } | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('x-user-token') || req.cookies.get('lp-token')?.value;
  if (authHeader) {
    const verified = verifyUserToken(authHeader);
    if (verified) return verified;
  }

  return null;
}
