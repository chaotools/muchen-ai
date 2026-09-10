import { z } from "zod";
import { apiError, AppError, requireUser } from "@/lib/access";
import { executePaperOrder, getPaperAccount } from "@/lib/workspace";
import { getExecutionQuote } from "@/lib/market";

const schema = z.object({
  code: z.string().regex(/^\d{6}\.(SH|SZ|BJ)$/), side: z.enum(["BUY", "SELL"]),
  shares: z.number().int().min(100).max(1_000_000).multipleOf(100), idempotencyKey: z.string().uuid()
});
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AppError("请输入有效股票代码、100 股整数倍的数量和订单编号");
    const { code, side, shares, idempotencyKey } = parsed.data;
    const id = user.id + ":" + idempotencyKey;
    // A completed retry must not depend on the quote provider still being online.
    const existing = (await getPaperAccount(user.id)).orders.find((order) => order.id === id);
    if (existing) {
      if (existing.code !== code || existing.side !== side || existing.shares !== shares) throw new AppError("同一订单编号不能用于不同订单", 409);
      return Response.json({ simulated: true, order: existing });
    }
    const quote = await getExecutionQuote(code);
    const order = await executePaperOrder(user.id, { id, code, side, shares, price: quote.price, amountCents: 0, asOf: quote.asOf, source: quote.source, createdAt: new Date().toISOString() });
    return Response.json({ simulated: true, order });
  } catch (error) { return apiError(error); }
}
