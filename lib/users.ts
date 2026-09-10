import { getDb } from "@/lib/db";
import { isAdminEmail } from "@/lib/auth";

export type User = { id: string; email: string; role: "MEMBER" | "ADMIN" };
const state = globalThis as typeof globalThis & { muchenUsers?: Map<string, User> };
const users = state.muchenUsers ??= new Map<string, User>();

// Only called after successful email-code verification.
export async function registerVerifiedUser(email: string): Promise<User> {
  const db = getDb();
  if (db) {
    const result = await db.query<User>(
      "INSERT INTO users(email, role) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET last_login_at = NOW(), role = CASE WHEN EXCLUDED.role = 'ADMIN' THEN 'ADMIN' ELSE users.role END RETURNING id, email, role",
      [email, isAdminEmail(email) ? "ADMIN" : "MEMBER"]
    );
    return result.rows[0];
  }
  if (process.env.NODE_ENV === "production") throw new Error("生产环境需要配置数据库");
  let user = [...users.values()].find((item) => item.email === email);
  if (!user) {
    user = { id: crypto.randomUUID(), email, role: isAdminEmail(email) ? "ADMIN" : "MEMBER" };
    users.set(user.id, user);
  }
  return user;
}

export async function findUser(id: string): Promise<User | null> {
  const db = getDb();
  if (db) return (await db.query<User>("SELECT id, email, role FROM users WHERE id = $1", [id])).rows[0] ?? null;
  return process.env.NODE_ENV === "production" ? null : users.get(id) ?? null;
}
