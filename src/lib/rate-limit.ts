import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

interface ClientRecord {
  timestamps: number[];
}

export class RateLimiter {
  private records = new Map<string, ClientRecord>();
  private windowMs: number;
  private max: number;
  private message: string;

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs;
    this.max = config.max;
    this.message = config.message || 'Too many requests. Please try again later.';
  }

  public check(identifier: string): { success: boolean; remaining: number; resetMs: number; message: string } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Garbage collect stale records when map grows
    if (this.records.size > 5000) {
      for (const [key, val] of this.records.entries()) {
        const filtered = val.timestamps.filter((t) => t > windowStart);
        if (filtered.length === 0) {
          this.records.delete(key);
        } else {
          val.timestamps = filtered;
        }
      }
    }

    const record = this.records.get(identifier) || { timestamps: [] };
    const validTimestamps = record.timestamps.filter((t) => t > windowStart);

    if (validTimestamps.length >= this.max) {
      const oldestInWindow = validTimestamps[0] || now;
      const resetMs = Math.max(0, oldestInWindow + this.windowMs - now);
      return {
        success: false,
        remaining: 0,
        resetMs,
        message: this.message,
      };
    }

    validTimestamps.push(now);
    this.records.set(identifier, { timestamps: validTimestamps });

    return {
      success: true,
      remaining: this.max - validTimestamps.length,
      resetMs: this.windowMs,
      message: '',
    };
  }
}

/** Extract reliable client identifier (IP or forwarded) from NextRequest */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

// 1. Auth Login Limiter: Max 10 attempts per 15 minutes per IP
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

// 2. Admin Auth Limiter: Max 5 attempts per 15 minutes per IP
export const adminAuthLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many admin login attempts. Account temporarily locked for 15 minutes.',
});

// 3. OTP Resend Limiter: Max 4 resends per 15 minutes per IP/email
export const otpResendLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 4,
  message: 'Too many verification code requests. Please wait 15 minutes before requesting a new code.',
});

// 4. Coupon Validation Limiter: Max 20 attempts per 10 minutes per IP
export const couponValidateLimiter = new RateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many coupon validation attempts. Please try again in 10 minutes.',
});
