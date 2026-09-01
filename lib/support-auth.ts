import { createSignedSession, sessionDurationSeconds, verifySignedSession, type SessionPayload } from "@/lib/auth";

export const supportCookieName = "muchen_support_session";

function getSupportSecret() {
  if (process.env.MUCHEN_SUPPORT_SESSION_SECRET) return process.env.MUCHEN_SUPPORT_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("MUCHEN_SUPPORT_SESSION_SECRET 未配置");
  return "muchen-local-support-session-secret-change-me";
}

export function getSupportAccessKey() {
  if (process.env.MUCHEN_SUPPORT_ACCESS_KEY) return process.env.MUCHEN_SUPPORT_ACCESS_KEY;
  return process.env.NODE_ENV === "production" ? "" : "MUCHEN-SUPPORT-DEMO";
}

export function isSupportEmail(email: string) {
  const emails = (process.env.MUCHEN_SUPPORT_EMAILS ?? process.env.MUCHEN_ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return emails.length > 0 ? emails.includes(email.toLowerCase()) : process.env.NODE_ENV !== "production";
}

export async function createSupportSession(email: string) {
  return createSignedSession(email, getSupportSecret(), sessionDurationSeconds);
}

export async function verifySupportSession(token: string | undefined): Promise<SessionPayload | null> {
  try {
    return await verifySignedSession(token, getSupportSecret());
  } catch {
    return null;
  }
}

export async function getSupportSessionFromRequest(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${supportCookieName}=`));
  return verifySupportSession(cookie?.slice(supportCookieName.length + 1));
}
