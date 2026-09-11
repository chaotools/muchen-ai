import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/access";

type Challenge = { digest: string; expires: number; attempts: number; sent: number; window: number; count: number };
const globalState = globalThis as typeof globalThis & { muchenEmailCodes?: Map<string, Challenge> };
const codes = globalState.muchenEmailCodes ??= new Map<string, Challenge>();
const ttl = 10 * 60_000;

function digest(email: string, code: string) {
  const secret = process.env.MUCHEN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new AppError("请配置至少 32 字符的会话密钥", 503);
  return createHmac("sha256", secret).update(email + ":" + code).digest("hex");
}

export async function requestEmailCode(email: string) {
  if (!process.env.RESEND_API_KEY || !process.env.MUCHEN_MAIL_FROM) throw new AppError("邮箱验证服务尚未配置，请联系管理员", 503);
  const db = getDb();
  if (!db && process.env.NODE_ENV === "production") throw new AppError("生产环境需要配置数据库", 503);
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const hash = digest(email, code);
  const now = Date.now();
  if (db) {
    const result = await db.query(
      `INSERT INTO email_login_codes(email, digest, expires_at, attempts, sent_at, window_at, sent_count)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0, NOW(), NOW(), 1)
       ON CONFLICT (email) DO UPDATE SET digest = EXCLUDED.digest, expires_at = EXCLUDED.expires_at,
         attempts = 0, sent_at = NOW(),
         window_at = CASE WHEN email_login_codes.window_at < NOW() - INTERVAL '1 hour' THEN NOW() ELSE email_login_codes.window_at END,
         sent_count = CASE WHEN email_login_codes.window_at < NOW() - INTERVAL '1 hour' THEN 1 ELSE email_login_codes.sent_count + 1 END
       WHERE email_login_codes.sent_at < NOW() - INTERVAL '60 seconds'
         AND (email_login_codes.sent_count < 6 OR email_login_codes.window_at < NOW() - INTERVAL '1 hour')
       RETURNING email`, [email, hash]);
    if (!result.rowCount) throw new AppError("发送过于频繁，请稍后再试（每小时最多 6 次）", 429);
  } else {
    for (const [key, item] of codes) if (now - item.window > 3_600_000) codes.delete(key);
    const old = codes.get(email);
    if (old && (now - old.sent < 60_000 || old.count >= 6)) throw new AppError("发送过于频繁，请稍后再试", 429);
    codes.set(email, { digest: hash, expires: now + ttl, attempts: 0, sent: now, window: old?.window ?? now, count: (old?.count ?? 0) + 1 });
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MUCHEN_MAIL_FROM, to: [email], subject: "沐尘登录验证码", text: `你的沐尘登录验证码是 ${code}，10 分钟内有效。请勿转发给他人。如果不是你本人操作，请忽略。` }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) throw new Error("mail delivery failed");
  } catch {
    if (db) await db.query("UPDATE email_login_codes SET expires_at = NOW() WHERE email = $1 AND digest = $2", [email, hash]);
    else if (codes.get(email)?.digest === hash) codes.get(email)!.expires = 0;
    throw new AppError("验证码发送失败，请稍后重试", 503);
  }
}

export async function consumeEmailCode(email: string, code: string): Promise<boolean> {
  const hash = digest(email, code);
  const db = getDb();
  if (db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ digest: string; expires_at: Date; attempts: number }>("SELECT digest, expires_at, attempts FROM email_login_codes WHERE email = $1 FOR UPDATE", [email]);
      const item = result.rows[0];
      const valid = Boolean(item && item.expires_at.getTime() > Date.now() && item.attempts < 5 && timingSafeEqual(Buffer.from(item.digest, "hex"), Buffer.from(hash, "hex")));
      await client.query("UPDATE email_login_codes SET attempts = attempts + 1, expires_at = CASE WHEN $2 THEN NOW() ELSE expires_at END WHERE email = $1", [email, valid]);
      await client.query("COMMIT");
      return valid;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  if (process.env.NODE_ENV === "production") return false;
  const item = codes.get(email);
  if (!item || item.expires <= Date.now() || item.attempts >= 5) return false;
  item.attempts++;
  const valid = timingSafeEqual(Buffer.from(item.digest, "hex"), Buffer.from(hash, "hex"));
  if (valid) item.expires = 0;
  return valid;
}
