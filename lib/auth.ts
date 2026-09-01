export const sessionCookieName = "muchen_session";
export const sessionDurationSeconds = 60 * 60 * 24 * 7;

type SessionPayload = { email: string; exp: number };

function getSessionSecret() {
  if (process.env.MUCHEN_SESSION_SECRET) return process.env.MUCHEN_SESSION_SECRET;
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

async function sign(value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(getSessionSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

export async function createSession(email: string) {
  const payload: SessionPayload = { email, exp: Math.floor(Date.now() / 1000) + sessionDurationSeconds };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature || signature !== await sign(encoded)) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as SessionPayload;
    if (!payload.email || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
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
  return admins.length > 0 ? admins.includes(email.toLowerCase()) : process.env.NODE_ENV !== "production";
}
