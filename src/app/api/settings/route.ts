import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const allSettings = await db.siteSetting.findMany({
      where: {
        key: {
          in: [
            'shipping_fee',
            'seller_verification_fee',
            'footer_description',
            'footer_copyright',
            'social_facebook',
            'social_instagram',
            'social_whatsapp',
          ],
        },
      },
    });

    const settingsObj: Record<string, string> = {
      shipping_fee: '150',
      seller_verification_fee: '500',
    };

    for (const s of allSettings) {
      settingsObj[s.key] = s.value;
    }

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Failed to get public settings:', error);
    return NextResponse.json({
      shipping_fee: '150',
      seller_verification_fee: '500',
    });
  }
}
