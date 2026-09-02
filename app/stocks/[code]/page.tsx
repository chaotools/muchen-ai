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
  const up = stock.changePercent >= 0;
  return (
    <AppShell dataMode={provider?.mode}>
      <div className="page-wrap">
        <div className="detail-back"><Link href="/">← 返回市场驾驶舱</Link><span>数据时间 · {stock.news[0]?.time ?? "最新交易日"}</span></div>
        <section className="stock-hero"><div><span className="eyebrow">A-SHARE · {stock.industry}</span><div className="stock-title"><h1>{stock.name}</h1><span>{stock.code}</span><span className="market-badge">{stock.market}</span></div><p className="hero-subtitle">{stock.industry} · 证券资料、行情与研究证据</p></div><div className="stock-actions"><WatchlistButton code={stock.code} initial={stock.code === "600519.SH"} /><ResearchButton code={stock.code} /></div></section>

        <section className="detail-price-row"><div className="price-block"><span>最新价</span><strong>¥{stock.price.toFixed(2)}</strong><div className={up ? "positive" : "negative"}>{up ? "▲" : "▼"} {stock.change.toFixed(2)}（{up ? "+" : ""}{stock.changePercent.toFixed(2)}%）</div></div><div className="detail-stat"><span>总市值</span><strong>{stock.marketCap}</strong></div><div className="detail-stat"><span>市盈率</span><strong>{stock.pe}</strong></div><div className="detail-stat"><span>市净率</span><strong>{stock.pb}</strong></div><div className="detail-stat"><span>ROE</span><strong>{stock.roe}</strong></div></section>

        <section className="detail-grid"><div className="market-card chart-card"><div className="card-title-row"><div><span className="eyebrow">PRICE ACTION</span><h2>行情结构</h2></div></div><StockChart code={stock.code} price={stock.price} high52={stock.high52} low52={stock.low52} history={stock.history} /></div>
          <div className="market-card ai-insight-card"><div className="card-title-row"><div><span className="eyebrow">AI OBSERVATION</span><h2>研究摘要</h2></div><span className="ai-badge">沐尘 AI</span></div><p className="insight-text">{stock.thesis}</p><div className="risk-box"><span className="report-label negative-text">风险边界</span>{stock.risks.map((risk) => <p key={risk}>— {risk}</p>)}</div><Link href={`/analysis?code=${stock.code}`} className="text-link">打开完整研究报告 →</Link></div></section>

        <section className="detail-grid lower-detail"><div className="market-card news-card"><div className="card-title-row"><div><span className="eyebrow">EVIDENCE FEED</span><h2>相关信息</h2></div><span className="muted">来源 · 时间戳</span></div>{stock.news.map((item) => <div className="news-row" key={item.time + item.title}><span className="news-time">{item.time}</span><span className={`news-dot ${item.tone}`} /><div><small>{item.source}</small><p>{item.title}</p></div></div>)}</div><div className="market-card factor-card"><div className="card-title-row"><div><span className="eyebrow">KEY FACTORS</span><h2>指标快照</h2></div></div><div className="factor-list"><div><span>趋势强度</span><strong className="positive">78</strong><i><b style={{ width: "78%" }} /></i></div><div><span>波动风险</span><strong className="warning">46</strong><i><b className="bar-warning" style={{ width: "46%" }} /></i></div><div><span>估值压力</span><strong>52</strong><i><b className="bar-neutral" style={{ width: "52%" }} /></i></div><div><span>信息热度</span><strong className="positive">71</strong><i><b style={{ width: "71%" }} /></i></div></div></div></section>
        <footer className="page-footer">AI 研究仅基于当前可见数据生成，需结合自身判断。沐尘不提供荐股或真实交易服务。</footer>
      </div>
    </AppShell>
  );
}
