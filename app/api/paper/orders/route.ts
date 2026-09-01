import { z } from "zod";

const orderSchema = z.object({
  code: z.string().min(3).max(20),
  side: z.enum(["BUY", "SELL"]),
  shares: z.number().int().positive(),
  price: z.number().positive()
});

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "订单参数不正确" }, { status: 400 });
  if (parsed.data.shares < 100 || parsed.data.shares % 100 !== 0) return Response.json({ error: "A 股模拟订单必须是 100 股的整数倍" }, { status: 400 });
  return Response.json({ simulated: true, orderId: `PAPER-${Date.now()}`, status: "PENDING_CONFIRMATION", ...parsed.data });
}
