import { getDb } from "@/lib/db";

export type InviteRecord = {
  code: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  status: "有效" | "已用尽" | "已过期" | "已撤销";
};

export type RedeemResult = { ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" | "revoked" | "exhausted" | "database-not-configured" };

function inviteStatus(invite: { used_count: number; max_uses: number; expires_at: Date | null; revoked_at: Date | null }): InviteRecord["status"] {
  if (invite.revoked_at) return "已撤销";
  if (invite.expires_at && invite.expires_at.getTime() <= Date.now()) return "已过期";
  if (invite.used_count >= invite.max_uses) return "已用尽";
  return "有效";
}

export async function redeemInvite(email: string, code: string): Promise<RedeemResult> {
  const db = getDb();
  if (!db) return { ok: false, reason: "database-not-configured" };
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const inviteResult = await client.query<{ code: string; max_uses: number; used_count: number; expires_at: Date | null; revoked_at: Date | null }>("SELECT code, max_uses, used_count, expires_at, revoked_at FROM invite_codes WHERE code = $1 FOR UPDATE", [code]);
    const invite = inviteResult.rows[0];
    if (!invite) { await client.query("ROLLBACK"); return { ok: false, reason: "invalid" }; }
    if (invite.revoked_at) { await client.query("ROLLBACK"); return { ok: false, reason: "revoked" }; }
    if (invite.expires_at && invite.expires_at.getTime() <= Date.now()) { await client.query("ROLLBACK"); return { ok: false, reason: "expired" }; }

    const userResult = await client.query<{ id: string }>("INSERT INTO users(email) VALUES ($1) ON CONFLICT (email) DO UPDATE SET last_login_at = NOW() RETURNING id", [email]);
    const userId = userResult.rows[0].id;
    const existing = await client.query("SELECT 1 FROM invite_redemptions WHERE invite_code = $1 AND user_id = $2", [code, userId]);
    if (existing.rowCount === 0) {
      if (invite.used_count >= invite.max_uses) { await client.query("ROLLBACK"); return { ok: false, reason: "exhausted" }; }
      await client.query("INSERT INTO invite_redemptions(invite_code, user_id) VALUES ($1, $2)", [code, userId]);
      await client.query("UPDATE invite_codes SET used_count = used_count + 1 WHERE code = $1", [code]);
    }
    await client.query("COMMIT");
    return { ok: true, userId };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function listInviteCodes(): Promise<InviteRecord[]> {
  const db = getDb();
  if (!db) return [];
  const result = await db.query<{ code: string; max_uses: number; used_count: number; expires_at: Date | null; revoked_at: Date | null; created_at: Date }>("SELECT code, max_uses, used_count, expires_at, revoked_at, created_at FROM invite_codes ORDER BY created_at DESC");
  return result.rows.map((invite) => ({ code: invite.code, maxUses: invite.max_uses, usedCount: invite.used_count, expiresAt: invite.expires_at?.toISOString() ?? null, revokedAt: invite.revoked_at?.toISOString() ?? null, createdAt: invite.created_at.toISOString(), status: inviteStatus(invite) }));
}

export async function createInvite(maxUses = 1, expiresInDays = 7) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL 未配置，无法持久化邀请码");
  const code = `MC-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const result = await db.query<{ code: string; max_uses: number; used_count: number; expires_at: Date | null; revoked_at: Date | null; created_at: Date }>("INSERT INTO invite_codes(code, max_uses, expires_at) VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 day')) RETURNING code, max_uses, used_count, expires_at, revoked_at, created_at", [code, maxUses, expiresInDays]);
  const invite = result.rows[0];
  return { code: invite.code, maxUses: invite.max_uses, usedCount: invite.used_count, expiresAt: invite.expires_at?.toISOString() ?? null, revokedAt: invite.revoked_at?.toISOString() ?? null, createdAt: invite.created_at.toISOString(), status: inviteStatus(invite) } satisfies InviteRecord;
}
