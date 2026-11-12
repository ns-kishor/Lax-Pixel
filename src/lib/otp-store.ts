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

// In-memory fallback
const memoryOtpMap = new Map<string, { code: string; payload: PendingRegistrationPayload; expiresAt: number }>();

export async function saveOtp(email: string, code: string, payload: PendingRegistrationPayload): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const payloadStr = JSON.stringify(payload);
  const id = crypto.randomUUID();

  // Save to memory
  memoryOtpMap.set(normalizedEmail, {
    code,
    payload,
    expiresAt: expiresAt.getTime(),
  });

  // Save to PostgreSQL table `email_otps`
  try {
    await db.$executeRawUnsafe(
      `DELETE FROM email_otps WHERE LOWER(email) = LOWER($1)`,
      normalizedEmail
    );
    await db.$executeRawUnsafe(
      `INSERT INTO email_otps (id, email, code, payload, expires_at) VALUES ($1, $2, $3, $4, $5)`,
      id,
      normalizedEmail,
      code,
      payloadStr,
      expiresAt
    );
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

  // 1. Try DB lookup
  try {
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM email_otps WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1`,
      normalizedEmail
    );

    if (rows && rows.length > 0) {
      const row = rows[0];
      const expiresAt = new Date(row.expires_at).getTime();

      if (Date.now() > expiresAt) {
        await db.$executeRawUnsafe(`DELETE FROM email_otps WHERE LOWER(email) = LOWER($1)`, normalizedEmail);
        memoryOtpMap.delete(normalizedEmail);
        return { valid: false, error: 'Verification code has expired. Please request a new one.' };
      }

      if (row.code !== inputCode) {
        return { valid: false, error: 'Invalid 6-digit code. Please check and try again.' };
      }

      // Valid! Delete from DB and memory
      await db.$executeRawUnsafe(`DELETE FROM email_otps WHERE LOWER(email) = LOWER($1)`, normalizedEmail);
      memoryOtpMap.delete(normalizedEmail);

      const parsedPayload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      return { valid: true, payload: parsedPayload };
    }
  } catch (err) {
    console.warn('[OTP-DB-WARN] DB query failed, checking memory store:', err);
  }

  // 2. Fallback to memory store
  const mem = memoryOtpMap.get(normalizedEmail);
  if (!mem) {
    return { valid: false, error: 'No verification code found for this email. Please sign up again.' };
  }

  if (Date.now() > mem.expiresAt) {
    memoryOtpMap.delete(normalizedEmail);
    return { valid: false, error: 'Verification code has expired. Please request a new one.' };
  }

  if (mem.code !== inputCode) {
    return { valid: false, error: 'Invalid 6-digit code. Please check and try again.' };
  }

  memoryOtpMap.delete(normalizedEmail);
  return { valid: true, payload: mem.payload };
}

