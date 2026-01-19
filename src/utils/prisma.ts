import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client to avoid creating multiple instances
let prismaGlobal: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (prismaGlobal) {
    return prismaGlobal;
  }

  const prismaInstance = new PrismaClient();

  // In production, keep the same instance
  // In development, reuse the same instance across hot reloads
  if (process.env.NODE_ENV !== 'production') {
    prismaGlobal = prismaInstance;
  }

  return prismaInstance;
}

export const prisma = getPrismaClient();
