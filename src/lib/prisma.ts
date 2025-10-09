import { PrismaClient } from '@prisma/client';

// This configuration prevents Prisma from creating a new connection pool for every
// new instance of PrismaClient in a serverless environment during development.
// In production, Next.js's serverless environment handles this differently.

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
