import AppShell from "@/components/app-shell";
import ScreenerTable from "@/components/screener-table";
import { getMarketSnapshot } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function ScreenerPage() {
  const { screenerUniverse, provider } = await getMarketSnapshot();
  return <AppShell dataMode={provider.mode}><div className="page-wrap"><section className="hero-row"><div><span className="eyebrow">MARKET SCREENER</span><h1>市场筛选</h1><p className="hero-subtitle">按行业与当日涨跌幅筛选有限样本；演示评分不用于真实数据判断。</p></div><span className="paper-badge">{provider.label}</span></section><ScreenerTable universe={screenerUniverse} /><div className="info-banner"><span>i</span><p>行情字段来自 {provider.label}。{provider.note}</p></div><footer className="page-footer">筛选结果仅用于研究和模拟，不构成投资建议。</footer></div></AppShell>;
}
