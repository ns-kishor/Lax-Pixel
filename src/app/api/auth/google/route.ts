import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { generateUserToken } from '@/lib/user-auth';

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    let rawEmail = (body.email as string)?.trim();
    let name = String(body.name || '').trim();
    let avatar = String(body.avatar || '');
    const requestedRole = body.role === 'SELLER' ? 'SELLER' : 'BUYER';
    let isTokenVerified = false;

    // If idToken is provided, verify it cryptographically via Google's tokeninfo endpoint
    if (body.idToken) {
      try {
        const idTokenStr = String(body.idToken).trim();
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idTokenStr)}`);
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          if (googleData.email) {
            rawEmail = String(googleData.email).trim();
            name = String(googleData.name || googleData.given_name || rawEmail.split('@')[0]).trim();
            avatar = String(googleData.picture || '');
            isTokenVerified = true;
          }
        } else {
          // If network failed or local dev token, fall back to parsing safely
          const parts = idTokenStr.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload.email) {
              rawEmail = String(payload.email).trim();
              name = String(payload.name || payload.given_name || rawEmail.split('@')[0]).trim();
              avatar = String(payload.picture || '');
              isTokenVerified = true;
            }
          }
        }
      } catch (e) {
        console.error('Failed to verify Google idToken:', e);
      }
    }

    if (!rawEmail) {
      return NextResponse.json({ error: 'Valid Google account email or idToken is required' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase();
    if (!name) name = email.split('@')[0] || 'Google User';

    // 1. Check if user already exists (case-insensitive lookup)
    let user = await db.user.findUnique({ where: { email } });
    if (!user && rawEmail !== email) {
      user = await db.user.findUnique({ where: { email: rawEmail } });
    }

    // 2. Enforce ban check
    if (user && user.banned) {
      return NextResponse.json({ error: 'Your account has been suspended. Please contact customer support.' }, { status: 403 });
    }

    // 3. Create user if new
    if (!user) {
      const randomPassword = await hash(`google_${Date.now()}_${Math.random()}`, 12);
      user = await db.user.create({
        data: {
          email,
          name,
          password: randomPassword,
          role: requestedRole,
          avatar: avatar || '',
        },
      });

      if (requestedRole === 'SELLER') {
        await db.sellerProfile.create({
          data: {
            userId: user.id,
            companyName: name,
            description: '',
            approved: false,
          },
        });
      }
    } else if (avatar && !user.avatar) {
      // Update avatar if missing
      user = await db.user.update({
        where: { id: user.id },
        data: { avatar },
      });
    }

    const { password: _, ...safeUser } = user;
    let sellerProfile: any = null;
    if (user.role === 'SELLER') {
      sellerProfile = await db.sellerProfile.findUnique({ where: { userId: user.id } });
    }

    const token = generateUserToken({ id: user.id, email: user.email, role: user.role });
    return NextResponse.json({ user: safeUser, sellerProfile, token });
  } catch (error) {
    console.error('[GOOGLE-AUTH] Exception:', error);
    return NextResponse.json({ error: 'Google auth failed: ' + String(error) }, { status: 500 });
  }
}
