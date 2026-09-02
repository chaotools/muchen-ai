import { z } from "zod";
import { NextResponse } from "next/server";
import { createSupportSession, getSupportAccessKey, getSupportConfigurationError, isSupportEmail, supportCookieName } from "@/lib/support-auth";
import { sessionDurationSeconds } from "@/lib/auth";
import { clearSupportLoginFailures, getSupportLoginRetryAfterSeconds, recordSupportLoginFailure } from "@/lib/support-login-rate-limit";

const schema = z.object({ email: z.string().trim().email("请输入有效邮箱").max(160), accessKey: z.string().trim().min(4, "请输入客服访问密钥").max(120) });

export async function POST(request: Request) {
  const configurationError = getSupportConfigurationError();
  if (configurationError) return NextResponse.json({ error: "客服工作台尚未完成安全配置" }, { status: 503 });

  const retryAfterSeconds = getSupportLoginRetryAfterSeconds(request);
  if (retryAfterSeconds > 0) {
    return NextResponse.json({ error: "登录失败次数过多，请稍后再试" }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    recordSupportLoginFailure(request);
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "登录信息不完整" }, { status: 400 });
  }
  if (!isSupportEmail(parsed.data.email) || parsed.data.accessKey !== getSupportAccessKey()) {
    recordSupportLoginFailure(request);
    return NextResponse.json({ error: "客服登录凭据无效" }, { status: 401 });
  }

  clearSupportLoginFailures(request);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: supportCookieName, value: await createSupportSession(parsed.data.email.toLowerCase()), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionDurationSeconds });
  return response;
}
