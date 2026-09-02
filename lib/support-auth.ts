import { createSignedSession, sessionDurationSeconds, verifySignedSession, type SessionPayload } from "@/lib/auth";

export const supportCookieName = "muchen_support_session";
const minimumSecretLength = 32;

function getSupportSecret() {
  return process.env.MUCHEN_SUPPORT_SESSION_SECRET?.trim() ?? "";
}

export function getSupportAccessKey() {
  return process.env.MUCHEN_SUPPORT_ACCESS_KEY?.trim() ?? "";
}

function getSupportEmails() {
  return (process.env.MUCHEN_SUPPORT_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function getSupportConfigurationError() {
  if (getSupportEmails().length === 0) return "MUCHEN_SUPPORT_EMAILS 未配置";
  if (getSupportAccessKey().length < minimumSecretLength) return "MUCHEN_SUPPORT_ACCESS_KEY 必须至少 32 个字符";
  if (getSupportSecret().length < minimumSecretLength) return "MUCHEN_SUPPORT_SESSION_SECRET 必须至少 32 个字符";
  return null;
}

export function isSupportEmail(email: string) {
  return getSupportEmails().includes(email.toLowerCase());
}

export async function createSupportSession(email: string) {
  return createSignedSession(email, getSupportSecret(), sessionDurationSeconds);
}

export async function verifySupportSession(token: string | undefined): Promise<SessionPayload | null> {
  if (getSupportConfigurationError()) return null;
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
