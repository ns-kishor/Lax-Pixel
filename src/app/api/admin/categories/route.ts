import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, sessions } from '../auth/route';

void sessions;

function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 255);
}

// GET: List all categories
export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Admin list categories error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Create category
export async function POST(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const name = sanitizeInput(body.name);
    const slug = sanitizeInput(body.slug);
    const description = body.description !== undefined ? sanitizeInput(body.description) : undefined;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 });
    }

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await db.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'A category with this slug already exists.' }, { status: 409 });
    }

    // Check name uniqueness
    const existingName = await db.category.findUnique({ where: { name } });
    if (existingName) {
      return NextResponse.json({ error: 'A category with this name already exists.' }, { status: 409 });
    }

    const category = await db.category.create({
      data: {
        name,
        slug,
        description: description || null,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Admin create category error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PATCH: Update category
export async function PATCH(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const id = sanitizeInput(body.id);
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = sanitizeInput(body.name);
      if (!name) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      }
      const existing = await db.category.findFirst({ where: { name, NOT: { id } } });
      if (existing) {
        return NextResponse.json({ error: 'A category with this name already exists.' }, { status: 409 });
      }
      data.name = name;
    }

    if (body.slug !== undefined) {
      const slug = sanitizeInput(body.slug);
      if (!slug) {
        return NextResponse.json({ error: 'Slug cannot be empty.' }, { status: 400 });
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return NextResponse.json(
          { error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' },
          { status: 400 }
        );
      }
      const existing = await db.category.findFirst({ where: { slug, NOT: { id } } });
      if (existing) {
        return NextResponse.json({ error: 'A category with this slug already exists.' }, { status: 409 });
      }
      data.slug = slug;
    }

    if (body.description !== undefined) {
      data.description = sanitizeInput(body.description) || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const category = await db.category.update({
      where: { id },
      data,
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Admin update category error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete category
export async function DELETE(req: NextRequest) {
  try {
    const admin = verifyAdmin(req.headers.get('x-admin-token'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const id = sanitizeInput(body.id);
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required.' }, { status: 400 });
    }

    const category = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing products. Reassign or delete them first.' },
        { status: 400 }
      );
    }

    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete category error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
