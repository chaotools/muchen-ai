import Link from "next/link";
import AppShell from "@/components/app-shell";
import { getMarketSnapshot } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const { watchlistQuotes, provider } = await getMarketSnapshot();
  return <AppShell dataMode={provider.mode}><div className="page-wrap"><section className="hero-row"><div><span className="eyebrow">AI WATCHLIST</span><h1>AI 自选</h1><p className="hero-subtitle">把想研究的标的放在一起，等待证据变得清晰。</p></div><button className="primary-button">＋ 添加标的</button></section><div className="watchlist-toolbar"><span>{watchlistQuotes.length} 个标的</span><span className="muted">刷新频率 · {provider.label}</span><span className="filter-chip active">全部</span><span className="filter-chip">趋势修复</span><span className="filter-chip">等待确认</span></div><div className="watch-grid">{watchlistQuotes.map((quote, index) => <Link className="watch-card" href={`/stocks/${quote.code}`} key={quote.code}><div className="watch-card-head"><div><strong>{quote.name}</strong><small>{quote.code}</small></div><span className="watch-star">★</span></div><div className="watch-price"><strong>¥{quote.price.toFixed(2)}</strong><span className={quote.changePercent >= 0 ? "positive" : "negative"}>{quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%</span></div><div className="mini-chart"><svg viewBox="0 0 260 52"><path d={index % 2 === 0 ? "M0 42 C22 42 28 36 48 38 S76 22 95 28 S120 19 142 22 S169 9 185 17 S216 5 260 7" : "M0 12 C22 8 40 25 62 19 S87 30 110 25 S135 40 156 30 S187 40 212 34 S242 44 260 40"} fill="none" stroke={quote.changePercent >= 0 ? "#54e6c1" : "#fa7381"} strokeWidth="2.5" /></svg></div><div className="watch-card-foot"><span className="signal-pill">{quote.signal}</span><span>查看详情 →</span></div></Link>)}</div><div className="info-banner"><span>i</span><p>{provider.note}。题材和行情数据可能有延迟，不构成投资建议。</p></div></div></AppShell>;
}
