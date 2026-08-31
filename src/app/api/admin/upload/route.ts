import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, sessions } from '../auth/route';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

void sessions;

// POST: Upload file
export async function POST(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided. Use field name "file".' }, { status: 400 });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `File type ${file.type} is not allowed. Use image files only.` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filePath = join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/${uniqueName}`, filename: uniqueName });
  } catch (error) {
    console.error('Admin upload error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
