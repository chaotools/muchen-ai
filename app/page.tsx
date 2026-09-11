import Link from "next/link";
import AppShell from "@/components/app-shell";
import RefreshButton from "@/components/refresh-button";
import { pageUser } from "@/lib/page-user";
import { listWatchlist } from "@/lib/workspace";
import { getQuotesForCodes } from "@/lib/market";
import { getMarketSnapshot } from "@/lib/market";
import { getTopicSnapshot } from "@/lib/free-data";

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await pageUser();
  const savedQuotes = await getQuotesForCodes(await listWatchlist(user.id));
  const [snapshot, topicSnapshot] = await Promise.all([
    getMarketSnapshot(),
    getTopicSnapshot()
  ]);
  const provider = snapshot.provider;
  const topics = topicSnapshot.topics;
  const { indexQuotes, latestNews } = snapshot;
  const watchlistQuotes = savedQuotes.filter((quote) => quote.availability !== "missing");
  const upCount = watchlistQuotes.filter((quote) => quote.changePercent > 0).length;
  const downCount = watchlistQuotes.filter((quote) => quote.changePercent < 0).length;
  const strongUpCount = watchlistQuotes.filter((quote) => quote.changePercent >= 9.5).length;
  const strongDownCount = watchlistQuotes.filter((quote) => quote.changePercent <= -9.5).length;
  const pulse = Math.round(50 + ((upCount - downCount) / Math.max(1, watchlistQuotes.length)) * 50);
  const pulseAverage = watchlistQuotes.reduce((sum, quote) => sum + quote.changePercent, 0) / Math.max(1, watchlistQuotes.length);
  return (
    <AppShell dataMode={provider.mode}>
      <div className="page-wrap">
        <section className="hero-row">
          <div>
            <span className="eyebrow">MARKET DATA · {latestNews[0]?.time ?? "最新交易日"}</span>
            <h1>市场驾驶舱</h1>
            <p className="hero-subtitle">把行情、证据和风险边界，整理成下一步可验证的研究动作。</p>
          </div>
          <div className="hero-actions"><span className="data-note"><span className="status-dot" />{provider.label} · {provider.note}</span><RefreshButton /></div>
        </section>

        <section className="index-grid">{indexQuotes.length === 0 && <p className="muted">行情暂不可用，请稍后刷新。</p>}
          {indexQuotes.map((quote) => <div className="index-card" key={quote.code}><div className="index-name"><span>{quote.market}</span>{quote.name}</div><strong>{quote.price.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</strong><div className={quote.change >= 0 ? "positive" : "negative"}>{quote.change >= 0 ? "▲" : "▼"} {quote.change.toFixed(2)} <span>{formatPercent(quote.changePercent)}</span></div><small>成交额 {quote.volume}</small></div>)}
        </section>

        <section className="dashboard-grid">
          <div className="market-card pulse-card">
            <div className="card-title-row"><div><span className="eyebrow">MARKET PULSE</span><h2>行情温度 · 自选样本</h2></div><span className="live-tag">{provider.mode === "free-data" ? "最新交易日样本" : "演示样本"}</span></div>
            <div className="pulse-content"><div className="pulse-ring"><span>{watchlistQuotes.length ? pulse : "—"}</span><small>{pulse >= 60 ? "偏积极" : pulse <= 40 ? "偏谨慎" : "中性"}</small></div><div className="pulse-bars"><div><span>上涨样本</span><strong>{upCount}</strong><i><b style={{ width: `${upCount / Math.max(1, watchlistQuotes.length) * 100}%` }} /></i></div><div><span>下跌样本</span><strong>{downCount}</strong><i><b className="bar-negative" style={{ width: `${downCount / Math.max(1, watchlistQuotes.length) * 100}%` }} /></i></div><div><span>大涨 / 大跌</span><strong>{strongUpCount} / {strongDownCount}</strong><i><b style={{ width: `${(strongUpCount + strongDownCount) / Math.max(1, watchlistQuotes.length) * 100}%` }} /></i></div></div></div>
            <div className="card-footer"><span>基于 {watchlistQuotes.length} 个自选行情样本</span><span className={pulseAverage >= 0 ? "positive" : "negative"}>{formatPercent(pulseAverage)}</span></div>
          </div>
          <div className="market-card summary-card">
            <div className="card-title-row"><div><span className="eyebrow">AI BRIEFING</span><h2>{provider.mode === "demo" ? "演示市场摘要" : "行情数据摘要"}</h2></div><Link href="/analysis" className="text-link">查看研究库 →</Link></div>
            <div className="briefing-lead"><span className="signal-orb">✦</span><p>{provider.mode === "demo" ? "此处为固定演示文案，仅用于展示摘要布局。" : provider.note}</p></div>
            <div className="briefing-list"><p>当前提供行情和有限题材样本。完整财务、公告原文和 AI 模型尚未接入，研究笔记使用模板整理。</p></div>
          </div>
        </section>

        <section className="section-block topic-home-preview"><div className="section-heading"><div><span className="eyebrow">TOPIC INTELLIGENCE</span><h2>题材样本观察</h2></div><Link href="/topics" className="secondary-button">进入题材研究 <span>→</span></Link></div><div className="topic-home-grid">{topics.length === 0 && <p className="muted">{topicSnapshot.note}</p>}{topics.slice(0, 4).map((topic, index) => <Link href={`/topics/${topic.id}`} className="topic-home-card" key={topic.id}><div className="topic-home-card-head"><span className={`topic-trend topic-trend-${topic.trend}`}>{topic.trend}</span><span className="topic-home-rank">NO.{String(index + 1).padStart(2, "0")}</span></div><strong className="topic-home-name">{topic.name}</strong><small>{topic.category} · {topic.continuationDays} 日持续</small><div className="topic-home-metrics"><b>{topic.heat}<small> 热度</small></b><span className={topic.changePercent >= 0 ? "positive" : "negative"}>{formatPercent(topic.changePercent)}</span><span>{topic.dataStatus === "free-data" ? `${topic.limitUpCount} 大涨样本` : `${topic.limitUpCount} 板`}</span></div><div className="topic-home-progress"><i><b style={{ width: `${topic.heat}%` }} /></i></div></Link>)}</div></section>

        <section className="section-block"><div className="section-heading"><div><span className="eyebrow">MY WATCHLIST</span><h2>自选股观察</h2></div><Link href="/watchlist" className="secondary-button">管理自选 <span>→</span></Link></div><div className="quote-table">{watchlistQuotes.length === 0 && <p className="muted">暂无可展示的自选行情，请添加标的或稍后刷新。</p>}<div className="quote-row quote-head"><span>标的</span><span>最新价</span><span>涨跌幅</span><span>AI 观察</span><span /></div>{watchlistQuotes.map((quote) => <Link className="quote-row" href={`/stocks/${quote.code}`} key={quote.code}><span className="stock-cell"><strong>{quote.name}</strong><small>{quote.code}</small></span><strong>¥{quote.price.toFixed(2)}</strong><span className={quote.changePercent >= 0 ? "positive" : "negative"}>{formatPercent(quote.changePercent)}</span><span className="signal-pill">{quote.signal}</span><span className="row-arrow">→</span></Link>)}</div></section>

        <section className="bottom-grid"><div className="market-card news-card"><div className="card-title-row"><div><span className="eyebrow">SIGNAL STREAM</span><h2>数据更新记录</h2></div><span className="muted">以数据时间为准</span></div>{latestNews.map((item) => <div className="news-row" key={item.time + item.title}><span className="news-time">{item.time}</span><span className={`news-dot ${item.tone}`} /><div><small>{item.source}</small><p>{item.title}</p></div></div>)}</div><div className="market-card cta-card"><span className="eyebrow">START WITH EVIDENCE</span><h2>把一个股票问题，变成一份可追溯的研究报告。</h2><p>保存当前行情、问题与风险说明，生成带来源和数据时间的模板笔记。</p><Link href="/stocks/688981.SH" className="primary-button">试用个股研判 <span>↗</span></Link></div></section>

        <footer className="page-footer">沐尘仅用于学习与模拟，不构成投资建议。行情数据可能存在延迟，模拟结果不代表真实投资收益。</footer>
      </div>
    </AppShell>
  );
}
