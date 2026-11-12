import { z } from "zod";
import { createSession, sessionCookieName, sessionDurationSeconds } from "@/lib/auth";
import { redeemInvite, redeemDemoInvite } from "@/lib/repository";
import { isProductionLike } from "@/lib/runtime";
import { consumeEmailCode } from "@/lib/email-login";
import { registerVerifiedUser } from "@/lib/users";
import { apiError, AppError } from "@/lib/access";
import { NextResponse } from "next/server";

const schema = z.object({
  email: z.string().trim().email("请输入有效邮箱").max(160),
  inviteCode: z.string().trim().min(4).max(80),
  emailCode: z.string().regex(/^\d{6}$/, "请输入 6 位邮箱验证码")
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "登录信息不完整" }, { status: 400 });
  try {
    const email = parsed.data.email.toLowerCase();
    if (!await consumeEmailCode(email, parsed.data.emailCode)) throw new AppError("邮箱验证码无效、已使用或已过期", 401);
    // 生产形态（配置数据库或 NODE_ENV=production）一律走持久化分支；
    // 误配时 redeemInvite 会因缺少数据库返回失败，不会退回演示邀请码。
    const redemption = isProductionLike()
      ? await redeemInvite(email, parsed.data.inviteCode)
      : redeemDemoInvite(email, parsed.data.inviteCode);
    if (!redemption.ok) throw new AppError("邀请码无效、已过期、已撤销或已用尽", 401);
    const user = await registerVerifiedUser(email);
    const response = NextResponse.json({ ok: true, user: { email: user.email } });
    response.cookies.set({ name: sessionCookieName, value: await createSession(user.email, user.id), httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: sessionDurationSeconds });
    return response;
  } catch (error) { return apiError(error); }
}
