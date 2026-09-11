import Link from "next/link";
import AppShell from "@/components/app-shell";
import ResearchButton from "@/components/research-button";
import StockChart from "@/components/stock-chart";
import WatchlistButton from "@/components/watchlist-button";
import { getStockDetailAsync } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function StockDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const stock = await getStockDetailAsync(code);
  const provider = stock.dataProvider;
  if (stock.availability === "missing") return <AppShell dataMode={provider?.mode}><div className="page-wrap"><h1>{code}</h1><p>行情暂不可用或标的不在当前样本内。请稍后重试。</p><WatchlistButton code={code} /><Link href="/screener" className="text-link">返回筛选器</Link></div></AppShell>;
  const up = stock.changePercent >= 0;
  return (
    <AppShell dataMode={provider?.mode}>
      <div className="page-wrap">
        <div className="detail-back"><Link href="/">← 返回市场驾驶舱</Link><span>数据时间 · {stock.asOf ?? "最新交易日"}</span></div>
        <section className="stock-hero"><div><span className="eyebrow">A-SHARE · {stock.industry}</span><div className="stock-title"><h1>{stock.name}</h1><span>{stock.code}</span><span className="market-badge">{stock.market}</span></div><p className="hero-subtitle">{stock.industry} · {provider?.note}</p></div><div className="stock-actions"><WatchlistButton code={stock.code} initial={stock.code === "600519.SH"} /><ResearchButton code={stock.code} /></div></section>

        <section className="detail-price-row"><div className="price-block"><span>{stock.priceLabel ?? "演示价格"}</span><strong>¥{stock.price.toFixed(2)}</strong><div className={up ? "positive" : "negative"}>{up ? "▲" : "▼"} {stock.change.toFixed(2)}（{up ? "+" : ""}{stock.changePercent.toFixed(2)}%）</div></div><div className="detail-stat"><span>总市值</span><strong>{stock.marketCap}</strong></div><div className="detail-stat"><span>市盈率</span><strong>{stock.pe}</strong></div><div className="detail-stat"><span>市净率</span><strong>{stock.pb}</strong></div><div className="detail-stat"><span>ROE</span><strong>{stock.roe}</strong></div></section>

        <section className="detail-grid"><div className="market-card chart-card"><div className="card-title-row"><div><span className="eyebrow">PRICE ACTION</span><h2>行情结构</h2></div></div><StockChart code={stock.code} price={stock.price} high52={stock.high52} low52={stock.low52} history={stock.history} /></div>
          <div className="market-card ai-insight-card"><div className="card-title-row"><div><span className="eyebrow">MARKET OBSERVATION</span><h2>研究摘要</h2></div><span className="ai-badge">模板观察</span></div><p className="insight-text">{stock.thesis}</p><div className="risk-box"><span className="report-label negative-text">风险边界</span>{stock.risks.map((risk) => <p key={risk}>— {risk}</p>)}</div><Link href={`/analysis?code=${stock.code}`} className="text-link">打开研究工作台 →</Link></div></section>

        <section className="detail-grid lower-detail"><div className="market-card news-card"><div className="card-title-row"><div><span className="eyebrow">EVIDENCE FEED</span><h2>相关信息</h2></div><span className="muted">来源 · 时间戳</span></div>{stock.news.map((item) => <div className="news-row" key={item.time + item.title}><span className="news-time">{item.time}</span><span className={`news-dot ${item.tone}`} /><div><small>{item.source}</small><p>{item.title}</p></div></div>)}</div><div className="market-card factor-card"><h2>指标状态</h2><p className="muted">趋势强度、波动风险、估值压力和信息热度尚未建立可验证模型，当前均未评估。</p></div></section>
        <footer className="page-footer">当前仅整理可见行情，不生成预测或投资评级。沐尘不提供荐股或真实交易服务。</footer>
      </div>
    </AppShell>
  );
}
