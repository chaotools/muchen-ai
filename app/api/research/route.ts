import { z } from "zod";
import { getStockDetailAsync } from "@/lib/market";
import { apiError, AppError, requireUser } from "@/lib/access";
import { listReports, saveReport, type ResearchNote } from "@/lib/workspace";

const schema = z.object({ code: z.string().regex(/^\d{6}\.(SH|SZ|BJ)$/), question: z.string().trim().max(240).optional() });
export async function GET(request: Request) {
  try { const user = await requireUser(request); return Response.json({ reports: await listReports(user.id) }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AppError("股票代码格式不正确");
    const stock = await getStockDetailAsync(parsed.data.code);
    if (stock.availability === "missing") throw new AppError("行情暂不可用，无法生成研究笔记", 503);
    const source = stock.dataProvider?.label ?? "演示数据";
    const asOf = stock.asOf ?? "演示样本（无真实交易时间）";
    const report: ResearchNote = {
      id: crypto.randomUUID(), code: stock.code, question: parsed.data.question ?? "",
      conclusion: stock.thesis, confidence: "未评估",
      positives: ["已保存当前可见行情快照；用户问题作为待验证假设保留"],
      risks: [...stock.risks, "本笔记由行情模板整理，未调用 AI 模型，不回答财务、公告或预测类问题"],
      dataStatus: source, asOf, generatedAt: new Date().toISOString(), method: "行情模板 · 未调用 AI",
      evidence: [
        { label: "价格", value: stock.price.toFixed(2), source, asOf },
        { label: "涨跌幅", value: stock.changePercent.toFixed(2) + "%", source, asOf }
      ]
    };
    await saveReport(user.id, report);
    return Response.json({ report, provider: stock.dataProvider });
  } catch (error) { return apiError(error); }
}
