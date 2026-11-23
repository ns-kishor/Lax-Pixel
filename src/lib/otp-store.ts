import { db } from './db';
import crypto from 'crypto';

export interface PendingRegistrationPayload {
  name: string;
  email: string;
  passwordHash: string;
  role: 'BUYER' | 'SELLER';
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  companyName?: string;
  companyDescription?: string;
}

interface MemoryOtpEntry {
  code: string;
  payload: PendingRegistrationPayload;
  expiresAt: number;
}

// In-memory fallback
const memoryOtpMap = new Map<string, MemoryOtpEntry>();
// SEC-FIND-06: Failed attempts tracking and 15-minute lockout
const failedAttemptsMap = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;

export async function saveOtp(email: string, code: string, payload: PendingRegistrationPayload): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const payloadStr = JSON.stringify(payload);
  const id = crypto.randomUUID();

  // Reset failed attempt count upon issuance of fresh OTP
  failedAttemptsMap.delete(normalizedEmail);

  // Save to memory
  memoryOtpMap.set(normalizedEmail, {
    code,
    payload,
    expiresAt: expiresAt.getTime(),
  });

  // SEC-FIND-15: Use parameterized tagged template literals instead of raw unsafe SQL
  try {
    await db.$executeRaw`DELETE FROM email_otps WHERE LOWER(email) = LOWER(${normalizedEmail})`;
    await db.$executeRaw`INSERT INTO email_otps (id, email, code, payload, expires_at) VALUES (${id}, ${normalizedEmail}, ${code}, ${payloadStr}, ${expiresAt})`;
  } catch (err) {
    console.warn('[OTP-DB-WARN] Could not persist to PostgreSQL table, memory fallback active:', err);
  }
}

export async function verifyAndConsumeOtp(
  email: string,
  code: string
): Promise<{ valid: boolean; error?: string; payload?: PendingRegistrationPayload }> {
  const normalizedEmail = email.toLowerCase().trim();
  const inputCode = code.trim();

  // SEC-FIND-06: Check if email is currently locked due to too many failed attempts
  const lockInfo = failedAttemptsMap.get(normalizedEmail);
  if (lockInfo && lockInfo.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((lockInfo.lockedUntil - Date.now()) / (60 * 1000));
    return {
      valid: false,
      error: `Too many failed attempts. Verification for this account is locked for ${minutesLeft} more minute(s).`,
    };
  }

  // 1. Try DB lookup using parameterized tagged template query
  let foundRecord: { code: string; payload: any; expires_at: Date | string } | null = null;
  try {
    const rows = await db.$queryRaw<any[]>`
      SELECT * FROM email_otps WHERE LOWER(email) = LOWER(${normalizedEmail}) ORDER BY created_at DESC LIMIT 1
    `;
    if (rows && rows.length > 0) {
      foundRecord = rows[0];
    }
  } catch (err) {
    console.warn('[OTP-DB-WARN] DB query failed, checking memory store:', err);
  }

  // 2. Check memory store if DB had no rows
  if (!foundRecord) {
    const mem = memoryOtpMap.get(normalizedEmail);
    if (mem) {
      foundRecord = {
        code: mem.code,
        payload: mem.payload,
        expires_at: new Date(mem.expiresAt),
      };
    }
  }

  if (!foundRecord) {
    return { valid: false, error: 'No verification code found for this email. Please sign up again.' };
  }

  const expiresAtMs = new Date(foundRecord.expires_at).getTime();
  if (Date.now() > expiresAtMs) {
    try {
      await db.$executeRaw`DELETE FROM email_otps WHERE LOWER(email) = LOWER(${normalizedEmail})`;
    } catch {}
    memoryOtpMap.delete(normalizedEmail);
    return { valid: false, error: 'Verification code has expired. Please request a new one.' };
  }

  // Check code match
  if (foundRecord.code !== inputCode) {
    const currentCount = (lockInfo?.count || 0) + 1;
    if (currentCount >= MAX_ATTEMPTS) {
      // Invalidate and delete OTP immediately
      try {
        await db.$executeRaw`DELETE FROM email_otps WHERE LOWER(email) = LOWER(${normalizedEmail})`;
      } catch {}
      memoryOtpMap.delete(normalizedEmail);
      failedAttemptsMap.set(normalizedEmail, {
        count: currentCount,
        lockedUntil: Date.now() + 15 * 60 * 1000, // 15-minute lockout
      });

      return {
        valid: false,
        error: 'Too many incorrect attempts (5/5). Your verification code has been invalidated for security. Please request a new code.',
      };
    }

    failedAttemptsMap.set(normalizedEmail, {
      count: currentCount,
      lockedUntil: 0,
    });
    const remaining = MAX_ATTEMPTS - currentCount;
    return {
      valid: false,
      error: `Invalid 6-digit code. ${remaining} attempt(s) remaining before this code is invalidated.`,
    };
  }

  // Successful verification! Clean up DB, memory, and lock state
  try {
    await db.$executeRaw`DELETE FROM email_otps WHERE LOWER(email) = LOWER(${normalizedEmail})`;
  } catch {}
  memoryOtpMap.delete(normalizedEmail);
  failedAttemptsMap.delete(normalizedEmail);

  const parsedPayload = typeof foundRecord.payload === 'string'
    ? JSON.parse(foundRecord.payload)
    : foundRecord.payload;

  return { valid: true, payload: parsedPayload };
}
