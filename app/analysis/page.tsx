import Link from "next/link";
import AppShell from "@/components/app-shell";
import ResearchWorkspace from "@/components/research-workspace";
import { watchlistQuotes } from "@/lib/market";

const reports = [
  { title: "中芯国际 · 放量突破后的确认条件", code: "688981.SH", date: "今天 09:42", status: "已完成", tone: "green", summary: "强势放量带来关注度提升，但建议等待回踩确认，不追逐单日脉冲。" },
  { title: "贵州茅台 · 趋势修复与估值边界", code: "600519.SH", date: "昨天 16:08", status: "已完成", tone: "blue", summary: "价格重新站回短期均线，基本面确定性较高，需求兑现是核心观察项。" },
  { title: "宁德时代 · 震荡中枢的风险复核", code: "300750.SZ", date: "昨天 10:21", status: "需更新", tone: "amber", summary: "产业趋势仍在，但短线尚未完成反转确认，等待关键支撑和量价配合。" }
];

export default function AnalysisPage() {
  return <AppShell><div className="page-wrap"><section className="hero-row"><div><span className="eyebrow">RESEARCH LIBRARY</span><h1>研究报告</h1><p className="hero-subtitle">每一份研判都保留证据、时间戳和风险边界。</p></div><Link href="/stocks/688981.SH" className="primary-button">新建个股研判 <span>↗</span></Link></section><div className="research-summary"><div><span className="eyebrow">THIS MONTH</span><strong>12</strong><span>份研究笔记</span></div><div><span className="eyebrow">EVIDENCE COVERAGE</span><strong>86%</strong><span>已关联数据证据</span></div><div><span className="eyebrow">OPEN QUESTIONS</span><strong>03</strong><span>待验证假设</span></div></div><ResearchWorkspace stocks={watchlistQuotes} /><section className="section-block"><div className="section-heading"><div><span className="eyebrow">RECENT NOTES</span><h2>最近研究</h2></div><span className="muted">按最近更新时间排序</span></div><div className="report-list">{reports.map((report) => <Link href={`/stocks/${report.code}`} className="report-row" key={report.code}><div className={`report-status ${report.tone}`}><span>✦</span>{report.status}</div><div className="report-main"><strong>{report.title}</strong><p>{report.summary}</p><small>{report.code} · {report.date}</small></div><span className="row-arrow">→</span></Link>)}</div></section></div></AppShell>;
}
