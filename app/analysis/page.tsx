import AppShell from "@/components/app-shell";
import ResearchWorkspace from "@/components/research-workspace";
import { getMarketSnapshot, getStockDetailAsync } from "@/lib/market";
import { pageUser } from "@/lib/page-user";
import { listReports } from "@/lib/workspace";
import { isDatabaseConfigured } from "@/lib/db";

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await pageUser();
  const { code } = await searchParams;
  const [snapshot, reports] = await Promise.all([getMarketSnapshot(), listReports(user.id)]);
  const stocks = [...snapshot.screenerUniverse];
  if (code && /^\d{6}\.(SH|SZ|BJ)$/.test(code) && !stocks.some((stock) => stock.code === code)) {
    const stock = await getStockDetailAsync(code);
    if (stock.availability !== "missing") stocks.unshift({ ...stock, score: null, momentum: "中", valuation: "未评估", risk: "未评估" });
  }
  return <AppShell dataMode={snapshot.provider.mode}><div className="page-wrap">
    <section className="hero-row"><div><span className="eyebrow">RESEARCH LIBRARY</span><h1>研究笔记</h1><p className="hero-subtitle">保存问题、行情快照和风险。当前使用模板整理，尚未接入 AI 模型。</p></div></section>
    <p className="muted">{reports.length} 份最近笔记（最多展示 100 份） · {isDatabaseConfigured() ? "保存到个人账户" : "本地演示存储，服务重启后清空"}</p>
    <ResearchWorkspace stocks={stocks} providerLabel={snapshot.provider.label} initialCode={code} />
    <section className="section-block"><h2>最近研究</h2>{!reports.length && <p className="muted">尚无研究笔记。</p>}
    {reports.map((report) => <details className="market-card saved-report" key={report.id}><summary><strong>{report.code} · {report.question || "行情观察"}</strong><small className="muted"> · {new Date(report.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</small></summary>
      <p>{report.conclusion}</p><p className="muted">{report.method} · 数据时间 {report.asOf} · {report.dataStatus}</p>
      <ul>{report.evidence?.map((item) => <li key={item.label}>{item.label}：{item.value} · {item.source} · {item.asOf}</li>)}</ul>
      <ul>{report.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul>
    </details>)}</section>
  </div></AppShell>;
}
