import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ADMIN = {
  email: 'admin@laxpixel.com',
  password: 'admin123',
  name: 'Admin',
  role: 'SUPER_ADMIN',
};

async function seed() {
  console.log('Seeding admin account...');

  const existing = await prisma.admin.findUnique({ where: { email: DEFAULT_ADMIN.email } });
  if (existing) {
    console.log('Admin account already exists:', existing.email);
    // Update password in case it was changed
    const hash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
    await prisma.admin.update({
      where: { email: DEFAULT_ADMIN.email },
      data: { password: hash },
    });
    console.log('Admin password reset to default.');
    return;
  }

  const hash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
  const admin = await prisma.admin.create({
    data: {
      email: DEFAULT_ADMIN.email,
      password: hash,
      name: DEFAULT_ADMIN.name,
      role: DEFAULT_ADMIN.role,
    },
  });
  console.log('Admin account created:', admin.email);
}

seed()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
