import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function resolveDbUrl(): string {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    const tmpDbPath = path.join('/tmp', 'custom.db');
    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), 'prisma', 'custom.db'),
        path.join(process.cwd(), 'db', 'custom.db'),
        path.resolve(process.cwd(), '..', 'db', 'custom.db'),
        path.join(__dirname, 'custom.db'),
        path.join(__dirname, '..', '..', '..', 'db', 'custom.db'),
        path.join(__dirname, '..', '..', 'prisma', 'custom.db'),
      ];

      for (const src of candidates) {
        if (fs.existsSync(/*turbopackIgnore: true*/ src)) {
          try {
            fs.copyFileSync(src, tmpDbPath);
            break;
          } catch (e) {
            console.error('[DB] Failed to copy db file to /tmp:', e);
          }
        }
      }
    }

    if (fs.existsSync(tmpDbPath)) {
      return `file:${tmpDbPath}`;
    }
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const localDb = path.join(process.cwd(), 'db', 'custom.db');
  return `file:${localDb}`;
}

const dbUrl = resolveDbUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
