import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & { muchenPool?: Pool };

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/** 远程 PostgreSQL 未显式声明 sslmode 时强制 TLS，避免邮箱、邀请码与账本明文过网。
 *  本机 / CI 的 localhost 实例不强制，保持测试可用。 */
function buildSslOptions(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    const declared = url.searchParams.has("sslmode") || url.searchParams.has("ssl");
    if (!local && !declared) return { rejectUnauthorized: true };
  } catch { /* 交给 pg 自己解析连接串 */ }
  return undefined;
}

export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!globalForDb.muchenPool) {
    const ssl = buildSslOptions(process.env.DATABASE_URL);
    globalForDb.muchenPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 10_000,
      ...(ssl ? { ssl } : {})
    });
  }
  return globalForDb.muchenPool;
}
