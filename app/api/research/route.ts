import { z } from "zod";
import { getStockDetail, getProviderInfo } from "@/lib/market";

const schema = z.object({ code: z.string().min(3).max(20), question: z.string().trim().max(240).optional() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "股票代码格式不正确" }, { status: 400 });
  const stock = getStockDetail(parsed.data.code);
  const provider = getProviderInfo();
  return Response.json({
    report: {
      conclusion: parsed.data.question ? `针对“${parsed.data.question}”，${stock.thesis}` : stock.thesis,
      confidence: stock.signal === "强势放量" ? "中等" : "中高",
      positives: ["价格与短期趋势结构可被继续验证", `${stock.industry}相关信息仍有研究价值`, "当前分析保留了明确的风险边界"],
      risks: stock.risks,
      asOf: new Date().toLocaleString("zh-CN", { hour12: false })
    },
    provider
  });
}
