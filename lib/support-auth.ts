import { createSignedSession, getSessionEpoch, sessionDurationSeconds, verifySignedSession, type SessionPayload } from "@/lib/auth";

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
  if (getSupportSecret() === process.env.MUCHEN_SESSION_SECRET?.trim()) return "客服会话密钥不能与用户会话密钥相同";
  return null;
}

export function isSupportEmail(email: string) {
  return getSupportEmails().includes(email.toLowerCase());
}

export async function createSupportSession(email: string) {
  return createSignedSession(email, getSupportSecret(), sessionDurationSeconds, undefined, "support");
}

export async function verifySupportSession(token: string | undefined): Promise<SessionPayload | null> {
  if (getSupportConfigurationError()) return null;
  try {
    const payload = await verifySignedSession(token, getSupportSecret());
    // 每次校验都复核名单与 audience：移出名单后立即失效，
    // 且用户会话 token 绝不会被当作客服会话接受。
    if (!payload || payload.aud !== "support" || payload.epoch !== getSessionEpoch() || !isSupportEmail(payload.email)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSupportSessionFromRequest(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${supportCookieName}=`));
  return verifySupportSession(cookie?.slice(supportCookieName.length + 1));
}
