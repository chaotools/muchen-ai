import { z } from "zod";
import { getSessionFromRequest, isAdminEmail } from "@/lib/auth";
import { getInviteCode } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { createInvite, listInviteCodes } from "@/lib/repository";
import { NextResponse } from "next/server";

const inviteSchema = z.object({ maxUses: z.number().int().min(1).max(1000).default(1), expiresInDays: z.number().int().min(1).max(365).default(7) });

async function authorize(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return { response: NextResponse.json({ error: "请先登录沐尘" }, { status: 401 }) };
  if (!isAdminEmail(session.email)) return { response: NextResponse.json({ error: "当前账号没有邀请码管理权限" }, { status: 403 }) };
  return { session };
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ databaseConfigured: false, items: [{ code: getInviteCode(), maxUses: null, usedCount: null, expiresAt: null, status: "环境变量邀请码" }] });
  try {
    return NextResponse.json({ databaseConfigured: true, items: await listInviteCodes() });
  } catch {
    return NextResponse.json({ error: "无法读取邀请码，请先执行 db/schema.sql" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "请先配置 DATABASE_URL，邀请码才能持久化" }, { status: 503 });
  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "邀请码参数不正确" }, { status: 400 });
  try {
    return NextResponse.json({ item: await createInvite(parsed.data.maxUses, parsed.data.expiresInDays) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "邀请码创建失败，请确认数据库表已初始化" }, { status: 503 });
  }
}
