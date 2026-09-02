"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Topic, TopicTrend } from "@/lib/topics";

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function trendClass(trend: TopicTrend) {
  return `topic-trend topic-trend-${trend}`;
}

export default function TopicDetailView({ topic }: { topic: Topic }) {
  const [saved, setSaved] = useState(false);
  const previousHeat = topic.history[topic.history.length - 2]?.heat ?? topic.heat;

  useEffect(() => {
    const stored = window.localStorage.getItem("muchen-topic-watchlist");
    if (stored) {
      try { setSaved((JSON.parse(stored) as string[]).includes(topic.id)); } catch { setSaved(false); }
    }
  }, [topic.id]);

  function toggleSaved() {
    const stored = window.localStorage.getItem("muchen-topic-watchlist");
    let ids: string[] = [];
    if (stored) {
      try { ids = JSON.parse(stored) as string[]; } catch { ids = []; }
    }
    const next = ids.includes(topic.id) ? ids.filter((id) => id !== topic.id) : [...ids, topic.id];
    window.localStorage.setItem("muchen-topic-watchlist", JSON.stringify(next));
    setSaved(next.includes(topic.id));
  }

  return (
    <>
      <div className="detail-back"><Link href="/topics">← 返回题材研究</Link><span>题材详情 / {topic.name}</span></div>
      <section className="topic-detail-hero">
        <div><span className="eyebrow">TOPIC DETAIL · {topic.category}</span><div className="topic-title-line"><h1>{topic.name}</h1><span className={trendClass(topic.trend)}>{topic.trend}</span></div><p>{topic.description}</p></div>
        <button type="button" className={`topic-save-button ${saved ? "saved" : ""}`} onClick={toggleSaved}>{saved ? "已关注题材" : "关注题材"}</button>
      </section>

      <section className="topic-detail-kpis">
        <div><span>综合热度</span><strong className="topic-heat-value">{topic.heat}</strong><small>较昨日 +{Math.max(0, topic.heat - previousHeat)} 点</small></div>
        <div><span>当日涨幅</span><strong className={topic.changePercent >= 0 ? "positive" : "negative"}>{formatPercent(topic.changePercent)}</strong><small>题材内 {topic.upCount} 涨 / {topic.downCount} 跌</small></div>
        <div><span>涨停数量</span><strong>{topic.limitUpCount}<small> 家</small></strong><small>近 30 日 {topic.limitUp30Count} 家</small></div>
        <div><span>领涨次数</span><strong>{topic.rankTimes}<small> 次</small></strong><small>近十日进入前列</small></div>
      </section>

      <div className="topic-detail-content-grid">
        <section className="market-card topic-chart-card"><div className="topic-card-heading"><div><span className="eyebrow">STRENGTH HISTORY</span><h2>题材强度走势</h2></div><span className="muted">近 6 个交易日</span></div><div className="topic-large-chart"><div className="topic-chart-grid-lines"><i /><i /><i /></div><div className="topic-chart-bars">{topic.history.map((point) => <div className="topic-chart-column" key={point.date}><div className="topic-chart-bar-wrap"><b style={{ height: `${point.heat}%` }} /></div><span>{point.date}</span><small className={point.changePercent >= 0 ? "positive" : "negative"}>{formatPercent(point.changePercent)}</small></div>)}</div></div><div className="topic-chart-legend"><span><i className="legend-heat" />综合热度</span><span><i className="legend-limit" />涨停数量：{topic.limitUpCount} 家</span><span>成交额 {topic.turnover}</span></div></section>
        <section className="market-card topic-summary-card"><div className="topic-card-heading"><div><span className="eyebrow">TOPIC PROFILE</span><h2>题材画像</h2></div></div><p className="topic-summary-text">{topic.description}</p><div className="topic-profile-list"><div><span>上涨宽度</span><strong>{Math.round(topic.upCount / (topic.upCount + topic.downCount + topic.flatCount) * 100)}%</strong><i><b style={{ width: `${Math.round(topic.upCount / (topic.upCount + topic.downCount + topic.flatCount) * 100)}%` }} /></i></div><div><span>持续性</span><strong>{topic.continuationDays} 日</strong><i><b style={{ width: `${Math.min(100, topic.continuationDays * 22)}%` }} /></i></div><div><span>涨停贡献</span><strong>{topic.limitUpCount} / {topic.limitUp30Count}</strong><i><b style={{ width: `${Math.min(100, topic.limitUpCount / Math.max(1, topic.limitUp30Count) * 100 * 3)}%` }} /></i></div></div><div className="topic-profile-note"><span className={topic.trend === "退潮" ? "topic-note-negative" : "topic-note-positive"}>●</span>{topic.trend === "强化" ? "题材宽度和涨停数量同步改善，当前处于强化观察阶段。" : topic.trend === "新启动" ? "题材刚出现扩散，重点观察领涨股能否带动更多成分股。" : topic.trend === "分歧" ? "高位品种出现分化，需观察题材宽度是否重新扩大。" : "题材热度和持续性下降，暂不把单日反弹视作趋势反转。"}</div></section>
      </div>

      <div className="topic-detail-content-grid topic-detail-bottom-grid">
        <section className="market-card topic-members-card"><div className="topic-card-heading"><div><span className="eyebrow">TOPIC MEMBERS</span><h2>成分股与领涨结构</h2></div><span className="muted">共 {topic.members.length} 个重点样本</span></div><div className="topic-members-table"><div className="topic-member-row topic-member-head"><span>排名 / 股票</span><span>状态</span><span>涨跌幅</span><span>成交额</span></div>{topic.members.map((stock) => <Link href={`/stocks/${stock.code}`} className="topic-member-row" key={stock.code}><span className="stock-cell"><strong><b className="topic-member-rank">{String(stock.rank).padStart(2, "0")}</b>{stock.name}</strong><small>{stock.code}</small></span><span className={`topic-stock-status topic-stock-${stock.status}`}>{stock.status}</span><span className={stock.changePercent >= 0 ? "positive" : "negative"}>{formatPercent(stock.changePercent)}</span><span>{stock.amount}</span></Link>)}</div></section>
        <section className="market-card topic-events-detail-card"><div className="topic-card-heading"><div><span className="eyebrow">EVENT TIMELINE</span><h2>催化与动态</h2></div><span className="muted">{topic.events.length} 条记录</span></div><div className="topic-detail-events">{topic.events.map((event) => <div className="topic-detail-event" key={event.id}><span className={`topic-event-dot topic-event-${event.tone}`} /><div><div className="topic-event-meta"><span>{event.date} {event.time}</span><em>{event.type}</em></div><strong>{event.title}</strong><p>{event.summary}</p></div></div>)}</div><div className="topic-source-note">数据状态：演示数据 · 后续接入真实数据源后保留来源与时间戳</div></section>
      </div>

      <section className="market-card topic-relations-card"><div className="topic-card-heading"><div><span className="eyebrow">TOPIC GRAPH</span><h2>关联题材</h2></div><span className="muted">从题材关系继续研究</span></div><div className="topic-relations-list">{topic.relations.map((relation) => <Link href={`/topics/${relation.id}`} key={relation.id}><span>{relation.kind}</span><strong>{relation.name}</strong><b>→</b></Link>)}</div></section>
      <footer className="page-footer">沐尘仅用于学习与模拟演示，题材热度是研究辅助信息，不构成投资建议。</footer>
    </>
  );
}
