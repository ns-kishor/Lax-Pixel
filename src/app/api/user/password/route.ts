import { db } from '@/lib/db';
import { compare, hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Securely compare password with bcrypt
    const isMatch = await compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password before saving
    const hashedPassword = await hash(newPassword, 12);
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
