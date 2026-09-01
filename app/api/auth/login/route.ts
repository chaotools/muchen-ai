import { z } from "zod";
import { createSession, getInviteCode, sessionCookieName, sessionDurationSeconds } from "@/lib/auth";
import { NextResponse } from "next/server";

const loginSchema = z.object({
  email: z.string().trim().email("请输入有效邮箱").max(160),
  inviteCode: z.string().trim().min(4, "请输入客服邀请码").max(80)
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "登录信息不完整" }, { status: 400 });
  if (parsed.data.inviteCode !== getInviteCode()) return NextResponse.json({ error: "邀请码无效，请联系沐尘客服获取邀请" }, { status: 401 });

  const response = NextResponse.json({ ok: true, user: { email: parsed.data.email.toLowerCase() } });
  response.cookies.set({ name: sessionCookieName, value: await createSession(parsed.data.email.toLowerCase()), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionDurationSeconds });
  return response;
}
