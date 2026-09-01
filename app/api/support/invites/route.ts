import { z } from "zod";
import { NextResponse } from "next/server";
import { getSupportSessionFromRequest, isSupportEmail } from "@/lib/support-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { createDemoInvite, createInvite, listDemoInvites, listInviteCodes, revokeDemoInvite, revokeInvite } from "@/lib/repository";

const schema = z.object({ maxUses: z.number().int().min(1).max(1000).default(1), expiresInDays: z.number().int().min(1).max(365).default(7) });

async function authorize(request: Request) {
  const session = await getSupportSessionFromRequest(request);
  if (!session) return { response: NextResponse.json({ error: "请先登录客服工作台" }, { status: 401 }) };
  if (!isSupportEmail(session.email)) return { response: NextResponse.json({ error: "当前账号没有客服工作台权限" }, { status: 403 }) };
  return { session };
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json({ storage: isDatabaseConfigured() ? "postgresql" : "memory-demo", items: isDatabaseConfigured() ? await listInviteCodes() : listDemoInvites() });
  } catch {
    return NextResponse.json({ error: "无法读取邀请码，请先执行 db/schema.sql" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "邀请码参数不正确" }, { status: 400 });
  try {
    const item = isDatabaseConfigured() ? await createInvite(parsed.data.maxUses, parsed.data.expiresInDays) : createDemoInvite(parsed.data.maxUses, parsed.data.expiresInDays);
    return NextResponse.json({ item, storage: isDatabaseConfigured() ? "postgresql" : "memory-demo" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "邀请码创建失败，请确认数据库表已初始化" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  const payload = await request.json().catch(() => null) as { code?: unknown } | null;
  const code = typeof payload?.code === "string" ? payload.code.trim() : "";
  if (!code) return NextResponse.json({ error: "邀请码不能为空" }, { status: 400 });
  const revoked = isDatabaseConfigured() ? await revokeInvite(code) : revokeDemoInvite(code);
  return revoked ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "邀请码不存在或已经撤销" }, { status: 404 });
}
