import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL が設定されていません');
  }
  const adapter = new PrismaMssql(url);
  return new PrismaClient({ adapter });
}

function getPrisma(): PrismaClient {
  if (globalThis.__prisma) return globalThis.__prisma;
  const instance = createPrisma();
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = instance;
  }
  return instance;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    return Reflect.get(client, prop, receiver);
  },
});
