import Link from "next/link";
import AppShell from "@/components/app-shell";
import { indexQuotes, latestNews, watchlistQuotes, getProviderInfo } from "@/lib/market";
import { topicUniverse } from "@/lib/topics";

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function DashboardPage() {
  const provider = getProviderInfo();
  return (
    <AppShell>
      <div className="page-wrap">
        <section className="hero-row">
          <div>
            <span className="eyebrow">TUESDAY · 01 SEPTEMBER 2026</span>
            <h1>市场驾驶舱</h1>
            <p className="hero-subtitle">把行情、证据和风险边界，整理成下一步可验证的研究动作。</p>
          </div>
          <div className="hero-actions"><span className="data-note"><span className="status-dot" />{provider.label} · {provider.note}</span><button className="icon-button">↻</button></div>
        </section>

        <section className="index-grid">
          {indexQuotes.map((quote) => <div className="index-card" key={quote.code}><div className="index-name"><span>{quote.market}</span>{quote.name}</div><strong>{quote.price.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</strong><div className={quote.change >= 0 ? "positive" : "negative"}>{quote.change >= 0 ? "▲" : "▼"} {quote.change.toFixed(2)} <span>{formatPercent(quote.changePercent)}</span></div><small>成交额 {quote.volume}</small></div>)}
        </section>

        <section className="dashboard-grid">
          <div className="market-card pulse-card">
            <div className="card-title-row"><div><span className="eyebrow">MARKET PULSE</span><h2>市场温度</h2></div><span className="live-tag">盘中</span></div>
            <div className="pulse-content"><div className="pulse-ring"><span>68</span><small>偏积极</small></div><div className="pulse-bars"><div><span>上涨家数</span><strong>2,946</strong><i><b style={{ width: "72%" }} /></i></div><div><span>下跌家数</span><strong>1,587</strong><i><b className="bar-negative" style={{ width: "39%" }} /></i></div><div><span>涨停 / 跌停</span><strong>43 / 7</strong><i><b style={{ width: "55%" }} /></i></div></div></div>
            <div className="card-footer"><span>市场宽度较昨日改善</span><span className="positive">+6.4%</span></div>
          </div>
          <div className="market-card summary-card">
            <div className="card-title-row"><div><span className="eyebrow">AI BRIEFING</span><h2>今日市场摘要</h2></div><Link href="/analysis" className="text-link">查看研究库 →</Link></div>
            <div className="briefing-lead"><span className="signal-orb">✦</span><p>指数维持震荡偏强，成长方向的量价结构好于大盘，但高位题材的分歧正在增大。</p></div>
            <div className="briefing-list"><div><span className="briefing-index">01</span><span>关注半导体放量后的回踩确认，不把单日脉冲当成趋势。</span></div><div><span className="briefing-index">02</span><span>消费龙头出现趋势修复，估值与需求兑现仍需同步观察。</span></div><div><span className="briefing-index">03</span><span>模拟账户保持中性仓位，等待更清晰的风险收益比。</span></div></div>
          </div>
        </section>

        <section className="section-block topic-home-preview"><div className="section-heading"><div><span className="eyebrow">TOPIC INTELLIGENCE</span><h2>今日题材主线</h2></div><Link href="/topics" className="secondary-button">进入题材研究 <span>→</span></Link></div><div className="topic-home-grid">{topicUniverse.slice(0, 4).map((topic, index) => <Link href={`/topics/${topic.id}`} className="topic-home-card" key={topic.id}><div className="topic-home-card-head"><span className={`topic-trend topic-trend-${topic.trend}`}>{topic.trend}</span><span className="topic-home-rank">NO.{String(index + 1).padStart(2, "0")}</span></div><strong className="topic-home-name">{topic.name}</strong><small>{topic.category} · {topic.continuationDays} 日持续</small><div className="topic-home-metrics"><b>{topic.heat}<small> 热度</small></b><span className={topic.changePercent >= 0 ? "positive" : "negative"}>{formatPercent(topic.changePercent)}</span><span>{topic.limitUpCount} 板</span></div><div className="topic-home-progress"><i><b style={{ width: `${topic.heat}%` }} /></i></div></Link>)}</div></section>

        <section className="section-block"><div className="section-heading"><div><span className="eyebrow">MY WATCHLIST</span><h2>自选股观察</h2></div><Link href="/watchlist" className="secondary-button">管理自选 <span>→</span></Link></div><div className="quote-table"><div className="quote-row quote-head"><span>标的</span><span>最新价</span><span>涨跌幅</span><span>AI 观察</span><span /></div>{watchlistQuotes.map((quote) => <Link className="quote-row" href={`/stocks/${quote.code}`} key={quote.code}><span className="stock-cell"><strong>{quote.name}</strong><small>{quote.code}</small></span><strong>¥{quote.price.toFixed(2)}</strong><span className={quote.changePercent >= 0 ? "positive" : "negative"}>{formatPercent(quote.changePercent)}</span><span className="signal-pill">{quote.signal}</span><span className="row-arrow">→</span></Link>)}</div></section>

        <section className="bottom-grid"><div className="market-card news-card"><div className="card-title-row"><div><span className="eyebrow">SIGNAL STREAM</span><h2>市场信号流</h2></div><span className="muted">刚刚更新</span></div>{latestNews.map((item) => <div className="news-row" key={item.time + item.title}><span className="news-time">{item.time}</span><span className={`news-dot ${item.tone}`} /><div><small>{item.source}</small><p>{item.title}</p></div></div>)}</div><div className="market-card cta-card"><span className="eyebrow">START WITH EVIDENCE</span><h2>把一个股票问题，变成一份可追溯的研究报告。</h2><p>沐尘会把行情、财务、公告和风险信息组合起来，生成带时间戳的 AI 研究笔记。</p><Link href="/stocks/688981.SH" className="primary-button">试用个股研判 <span>↗</span></Link></div></section>

        <footer className="page-footer">沐尘仅用于学习与模拟演示，不构成投资建议。行情数据可能存在延迟，模拟结果不代表真实投资收益。</footer>
      </div>
    </AppShell>
  );
}
