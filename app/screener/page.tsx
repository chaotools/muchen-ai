import AppShell from "@/components/app-shell";
import ScreenerTable from "@/components/screener-table";
import { screenerUniverse } from "@/lib/market";

export default function ScreenerPage() {
  return <AppShell><div className="page-wrap"><section className="hero-row"><div><span className="eyebrow">MARKET SCREENER</span><h1>市场筛选</h1><p className="hero-subtitle">用行业、动能和 AI 评分，把宽泛的行情缩小成一组可研究的候选。</p></div><span className="paper-badge">演示规则</span></section><ScreenerTable universe={screenerUniverse} /><div className="info-banner"><span>i</span><p>筛选规则目前基于演示字段。接入真实数据后，可以把财务质量、估值分位、公告事件和行业景气度接入同一套筛选器。</p></div><footer className="page-footer">筛选结果仅用于研究和模拟，不构成投资建议。</footer></div></AppShell>;
}
