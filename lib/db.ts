import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & { muchenPool?: Pool };

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!globalForDb.muchenPool) globalForDb.muchenPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return globalForDb.muchenPool;
}
