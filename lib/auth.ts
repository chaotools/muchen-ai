export const sessionCookieName = "muchen_session";
export const sessionDurationSeconds = 60 * 60 * 24 * 7;

export type SessionAudience = "user" | "support";
export type SessionPayload = { email: string; exp: number; aud: SessionAudience; epoch: number; userId?: string; version?: number };

function getSessionSecret() {
  const secret = process.env.MUCHEN_SESSION_SECRET?.trim();
  // 不再回退到公开仓库里的硬编码常量：本地开发也必须显式配置会话密钥。
  if (!secret || secret.length < 32) throw new Error("MUCHEN_SESSION_SECRET 必须是至少 32 字符的随机密钥");
  return secret;
}

/** 轮换此环境变量即可让所有已签发会话立即失效，作为应急吊销手段。 */
export function getSessionEpoch() {
  const value = Number(process.env.MUCHEN_SESSION_EPOCH ?? 0);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function getInviteCode() {
  // 演示邀请码只能来自显式配置，避免生产误配时开放一个公开仓库里写死的入口。
  return process.env.MUCHEN_INVITE_CODE?.trim() ?? "";
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

/**
 * audience 用于区分用户会话与客服会话：即使两个密钥被误配成同一个值，
 * 用户 token 也不会被当作客服会话接受（反之亦然）。
 */
export async function createSignedSession(email: string, secret: string, durationSeconds = sessionDurationSeconds, userId?: string, audience: SessionAudience = "user") {
  const payload: SessionPayload = { email, exp: Math.floor(Date.now() / 1000) + durationSeconds, aud: audience, epoch: getSessionEpoch(), ...(userId ? { userId, version: 2 } : {}) };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await sign(encoded, secret)}`;
}

export async function verifySignedSession(token: string | undefined, secret: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra !== undefined) return null;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("HMAC", key, fromBase64Url(signature), new TextEncoder().encode(encoded))) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as SessionPayload;
    if (typeof payload.email !== "string" || typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(email: string, userId: string) {
  return createSignedSession(email, getSessionSecret(), sessionDurationSeconds, userId);
}

export async function verifySession(token: string | undefined) {
  try {
    const session = await verifySignedSession(token, getSessionSecret());
    return session?.version === 2 && session.aud === "user" && session.epoch === getSessionEpoch()
      && typeof session.userId === "string" && session.userId ? session : null;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`));
  return verifySession(cookie?.slice(sessionCookieName.length + 1));
}

export function isAdminEmail(email: string) {
  const admins = (process.env.MUCHEN_ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}
