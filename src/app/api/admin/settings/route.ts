import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

// GET: Return all settings as a single object
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const allSettings = await db.siteSetting.findMany();

    const settingsObj: Record<string, string> = {};
    for (const s of allSettings) {
      settingsObj[s.key] = s.value;
    }

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error('Admin get settings error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Upsert multiple settings
export async function PUT(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const settings = body.settings;

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json({ error: 'settings object is required.' }, { status: 400 });
    }

    const entries = Object.entries(settings) as [string, unknown][];

    await db.$transaction(
      entries.map(([key, value]) =>
        db.siteSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    return NextResponse.json({ success: true, updated: entries.length });
  } catch (error) {
    console.error('Admin update settings error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
