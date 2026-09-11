import { z } from "zod";
import { requestEmailCode } from "@/lib/email-login";
import { apiError } from "@/lib/access";

export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().trim().email().max(160) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "请输入有效邮箱" }, { status: 400 });
  try {
    await requestEmailCode(parsed.data.email.toLowerCase());
    return Response.json({ ok: true, message: "验证码已发送，10 分钟内有效" });
  } catch (error) { return apiError(error); }
}
