import { z } from "zod";
import { apiError, requireUser } from "@/lib/access";
import { changeWatchlist, listWatchlist } from "@/lib/workspace";
const schema = z.object({ code: z.string().regex(/^\d{6}\.(SH|SZ|BJ)$/), saved: z.boolean() });
export async function GET(request: Request) {
  try { const user = await requireUser(request); return Response.json({ codes: await listWatchlist(user.id) }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "股票代码格式不正确" }, { status: 400 });
    await changeWatchlist(user.id, parsed.data.code, parsed.data.saved);
    return Response.json({ saved: parsed.data.saved });
  } catch (error) { return apiError(error); }
}
