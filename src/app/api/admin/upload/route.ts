import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '../auth/route';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// SEC-FIND-12: Exclude SVG to eliminate Stored Cross-Site Scripting (XSS)
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];

export async function POST(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum allowed limit of 5MB.' }, { status: 400 });
    }

    const originalName = file.name || 'image.jpg';
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';

    if (!ALLOWED_EXTS.includes(ext) || (file.type && (!file.type.startsWith('image/') || file.type === 'image/svg+xml'))) {
      return NextResponse.json({ error: 'Only raster image files (JPG, PNG, WebP, AVIF, GIF) are allowed.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yywssvjzjhqvdvsvoipy.supabase.co';
    const supabaseUrl = rawSupabaseUrl.replace(/[\r\n\t\s]+/g, '').trim().replace(/\/+$/, '');
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/[\r\n\t\s]+/g, '').trim();

    // Attempt Supabase Storage upload
    if (supabaseUrl && serviceKey) {
      try {
        const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/products/${fileName}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': file.type || 'image/jpeg',
          },
          body: buffer,
        });

        if (uploadRes.ok) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/products/${fileName}`;
          return NextResponse.json({ url: publicUrl, success: true });
        }
      } catch (uploadErr) {
        console.error('Supabase storage upload error:', uploadErr);
      }
    }

    // SEC-FIND-13: Guard against database bloat; reject large base64 fallbacks (> 250KB)
    if (buffer.length > 250 * 1024) {
      return NextResponse.json(
        { error: 'Cloud storage is temporarily unavailable. High-resolution images cannot be uploaded right now.' },
        { status: 503 }
      );
    }

    // High-reliability Fallback: Data URL for small icons/thumbnails only
    const mime = file.type || 'image/jpeg';
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${base64}`;

    return NextResponse.json({ url: dataUrl, success: true });
  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: 'Upload failed: ' + String(error) }, { status: 500 });
  }
}
