import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '../auth/route';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// SEC-FIND-12: Exclude SVG to eliminate Stored Cross-Site Scripting (XSS)
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];

// SEC-07: Verify file header magic bytes to reject disguised non-image files
function isValidImageMagicBytes(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
  // GIF: GIF8 (47 49 46 38)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true;
  // AVIF / HEIF
  const ftyp = buf.slice(4, 12).toString('ascii');
  if (ftyp.includes('ftyp')) return true;

  return false;
}

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
    if (!isValidImageMagicBytes(buffer)) {
      return NextResponse.json({ error: 'Invalid file signature: Content is not a recognized raster image.' }, { status: 400 });
    }
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
