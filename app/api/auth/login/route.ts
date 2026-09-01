import { z } from "zod";
import { createSession, getInviteCode, sessionCookieName, sessionDurationSeconds } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { redeemInvite } from "@/lib/repository";
import { NextResponse } from "next/server";

const loginSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱").max(160),
  inviteCode: z.string().trim().min(4, "请输入客服邀请码").max(80)
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "登录信息不完整" }, { status: 400 });
  if (isDatabaseConfigured()) {
    try {
      const redemption = await redeemInvite(parsed.data.email.toLowerCase(), parsed.data.inviteCode);
      if (!redemption.ok) {
        const message = redemption.reason === "exhausted" ? "邀请码已达到使用次数" : redemption.reason === "expired" ? "邀请码已过期" : redemption.reason === "revoked" ? "邀请码已被撤销" : "邀请码无效，请联系沐尘客服获取邀请";
        return NextResponse.json({ error: message }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "认证服务暂时不可用，请稍后重试" }, { status: 503 });
    }
  } else if (parsed.data.inviteCode !== getInviteCode()) {
    return NextResponse.json({ error: "邀请码无效，请联系沐尘客服获取邀请" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user: { email: parsed.data.email.toLowerCase() } });
  response.cookies.set({ name: sessionCookieName, value: await createSession(parsed.data.email.toLowerCase()), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionDurationSeconds });
  return response;
}
