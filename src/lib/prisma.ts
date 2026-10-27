import { PrismaClient } from '@prisma/client';

// This configuration prevents Prisma from creating a new connection pool for every
// new instance of PrismaClient in a serverless environment during development.
// In production, Next.js's serverless environment handles this differently.

// Omitted unless a query opts in with `omit: { field: false }`. Many queries
// return whole rows straight to client components, so these would otherwise
// be serialized to the browser: the Yagout key (encrypted, but still a
// secret) and the stored gateway request/response blobs.
const createPrismaClient = () =>
  new PrismaClient({
    omit: {
      hospital: { yagoutEncryptionKey: true },
      appointment: { paymentRequest: true, paymentRaw: true },
    },
  });

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = global as unknown as { prisma: AppPrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
