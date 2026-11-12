import { z } from "zod";
import { requestEmailCode } from "@/lib/email-login";
import { apiError } from "@/lib/access";
import { trustedClientIp } from "@/lib/runtime";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // 没有 Origin 的非浏览器请求交由 IP / 全局限流兜底。
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "跨站请求被拒绝" }, { status: 403 });
  const parsed = z.object({ email: z.string().trim().email().max(160) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请输入有效邮箱" }, { status: 400 });
  try {
    await requestEmailCode(parsed.data.email.toLowerCase(), trustedClientIp(request));
    return Response.json({ ok: true, message: "验证码已发送，10 分钟内有效" });
  } catch (error) { return apiError(error); }
}
