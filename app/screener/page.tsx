import AppShell from "@/components/app-shell";
import ScreenerTable from "@/components/screener-table";
import { getMarketSnapshot } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function ScreenerPage() {
  const { screenerUniverse, provider } = await getMarketSnapshot();
  return <AppShell dataMode={provider.mode}><div className="page-wrap"><section className="hero-row"><div><span className="eyebrow">MARKET SCREENER</span><h1>市场筛选</h1><p className="hero-subtitle">用行业、动能和 AI 评分，把宽泛的行情缩小成一组可研究的候选。</p></div><span className="paper-badge">{provider.label}</span></section><ScreenerTable universe={screenerUniverse} /><div className="info-banner"><span>i</span><p>行情字段来自 {provider.label}。{provider.note}</p></div><footer className="page-footer">筛选结果仅用于研究和模拟，不构成投资建议。</footer></div></AppShell>;
}
