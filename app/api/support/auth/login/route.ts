import { z } from "zod";
import { NextResponse } from "next/server";
import { createSupportSession, getSupportAccessKey, isSupportEmail, supportCookieName } from "@/lib/support-auth";
import { sessionDurationSeconds } from "@/lib/auth";

const schema = z.object({ email: z.string().trim().email("请输入有效邮箱").max(160), accessKey: z.string().trim().min(4, "请输入客服访问密钥").max(120) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "登录信息不完整" }, { status: 400 });
  if (!isSupportEmail(parsed.data.email)) return NextResponse.json({ error: "当前邮箱没有客服工作台权限" }, { status: 403 });
  if (parsed.data.accessKey !== getSupportAccessKey()) return NextResponse.json({ error: "客服访问密钥无效" }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: supportCookieName, value: await createSupportSession(parsed.data.email.toLowerCase()), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionDurationSeconds });
  return response;
}
