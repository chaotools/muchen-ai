export const sessionCookieName = "muchen_session";
export const sessionDurationSeconds = 60 * 60 * 24 * 7;

export type SessionPayload = { email: string; exp: number; userId?: string; version?: number };

function getSessionSecret() {
  if (process.env.MUCHEN_SESSION_SECRET && (process.env.NODE_ENV !== "production" || process.env.MUCHEN_SESSION_SECRET.length >= 32)) return process.env.MUCHEN_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("MUCHEN_SESSION_SECRET 未配置");
  return "muchen-local-session-secret-change-me";
}

export function getInviteCode() {
  if (process.env.MUCHEN_INVITE_CODE) return process.env.MUCHEN_INVITE_CODE;
  return process.env.NODE_ENV === "production" ? "" : "MC-7DAY-DEMO";
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

export async function createSignedSession(email: string, secret: string, durationSeconds = sessionDurationSeconds, userId?: string) {
  const payload: SessionPayload = { email, exp: Math.floor(Date.now() / 1000) + durationSeconds, ...(userId ? { userId, version: 2 } : {}) };
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
    return session?.version === 2 && typeof session.userId === "string" && session.userId ? session : null;
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
