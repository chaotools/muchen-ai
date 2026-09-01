import Link from "next/link";
import AppShell from "@/components/app-shell";
import ResearchButton from "@/components/research-button";
import WatchlistButton from "@/components/watchlist-button";
import { getStockDetail } from "@/lib/market";

export default async function StockDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const stock = getStockDetail(code);
  const up = stock.changePercent >= 0;
  return (
    <AppShell>
      <div className="page-wrap">
        <div className="detail-back"><Link href="/">← 返回市场驾驶舱</Link><span>数据时间 · 09:48:12</span></div>
        <section className="stock-hero"><div><span className="eyebrow">A-SHARE · {stock.industry}</span><div className="stock-title"><h1>{stock.name}</h1><span>{stock.code}</span><span className="market-badge">{stock.market}</span></div><p className="hero-subtitle">{stock.industry} · 证券资料、行情与研究证据</p></div><div className="stock-actions"><WatchlistButton code={stock.code} initial={stock.code === "600519.SH"} /><ResearchButton code={stock.code} /></div></section>

        <section className="detail-price-row"><div className="price-block"><span>最新价</span><strong>¥{stock.price.toFixed(2)}</strong><div className={up ? "positive" : "negative"}>{up ? "▲" : "▼"} {stock.change.toFixed(2)}（{up ? "+" : ""}{stock.changePercent.toFixed(2)}%）</div></div><div className="detail-stat"><span>总市值</span><strong>{stock.marketCap}</strong></div><div className="detail-stat"><span>市盈率</span><strong>{stock.pe}</strong></div><div className="detail-stat"><span>市净率</span><strong>{stock.pb}</strong></div><div className="detail-stat"><span>ROE</span><strong>{stock.roe}</strong></div></section>

        <section className="detail-grid"><div className="market-card chart-card"><div className="card-title-row"><div><span className="eyebrow">PRICE ACTION</span><h2>行情结构</h2></div><div className="chart-tabs"><span className="active">分时</span><span>日K</span><span>周K</span></div></div><div className="chart-area"><div className="chart-y"><span>1,510</span><span>1,480</span><span>1,450</span><span>1,420</span></div><svg viewBox="0 0 760 240" role="img" aria-label="演示行情曲线"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#54e6c1" stopOpacity=".26" /><stop offset="1" stopColor="#54e6c1" stopOpacity="0" /></linearGradient></defs><path d="M0 205 C38 203 44 172 85 184 S130 165 168 178 S215 131 250 149 S290 126 330 136 S370 90 414 112 S455 110 488 89 S525 106 560 78 S605 92 640 65 S700 68 760 27 L760 240 L0 240 Z" fill="url(#chartFill)" /><path d="M0 205 C38 203 44 172 85 184 S130 165 168 178 S215 131 250 149 S290 126 330 136 S370 90 414 112 S455 110 488 89 S525 106 560 78 S605 92 640 65 S700 68 760 27" fill="none" stroke="#54e6c1" strokeWidth="3" /></svg><div className="chart-x"><span>09:30</span><span>10:00</span><span>10:30</span><span>11:00</span><span>11:30</span></div></div><div className="chart-legend"><span><i className="legend-line" />价格走势</span><span>52 周高 ¥{stock.high52.toFixed(2)}</span><span>52 周低 ¥{stock.low52.toFixed(2)}</span></div></div>
          <div className="market-card ai-insight-card"><div className="card-title-row"><div><span className="eyebrow">AI OBSERVATION</span><h2>研究摘要</h2></div><span className="ai-badge">沐尘 AI</span></div><p className="insight-text">{stock.thesis}</p><div className="risk-box"><span className="report-label negative-text">风险边界</span>{stock.risks.map((risk) => <p key={risk}>— {risk}</p>)}</div><Link href={`/analysis?code=${stock.code}`} className="text-link">打开完整研究报告 →</Link></div></section>

        <section className="detail-grid lower-detail"><div className="market-card news-card"><div className="card-title-row"><div><span className="eyebrow">EVIDENCE FEED</span><h2>相关信息</h2></div><span className="muted">来源 · 时间戳</span></div>{stock.news.map((item) => <div className="news-row" key={item.time + item.title}><span className="news-time">{item.time}</span><span className={`news-dot ${item.tone}`} /><div><small>{item.source}</small><p>{item.title}</p></div></div>)}</div><div className="market-card factor-card"><div className="card-title-row"><div><span className="eyebrow">KEY FACTORS</span><h2>指标快照</h2></div></div><div className="factor-list"><div><span>趋势强度</span><strong className="positive">78</strong><i><b style={{ width: "78%" }} /></i></div><div><span>波动风险</span><strong className="warning">46</strong><i><b className="bar-warning" style={{ width: "46%" }} /></i></div><div><span>估值压力</span><strong>52</strong><i><b className="bar-neutral" style={{ width: "52%" }} /></i></div><div><span>信息热度</span><strong className="positive">71</strong><i><b style={{ width: "71%" }} /></i></div></div></div></section>
        <footer className="page-footer">AI 研究仅基于当前可见数据生成，需结合自身判断。沐尘不提供荐股或真实交易服务。</footer>
      </div>
    </AppShell>
  );
}
