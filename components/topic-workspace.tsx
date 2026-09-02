"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Topic, TopicEvent, TopicTrend } from "@/lib/topics";

type TopicWorkspaceProps = { topics: Topic[] };
type TopicSort = "heat" | "changePercent" | "limitUpCount" | "continuationDays";
type TopicView = "overview" | "rotation" | "events";

const trendOptions: Array<TopicTrend | "全部"> = ["全部", "强化", "新启动", "分歧", "退潮"];
const sortOptions: Array<{ value: TopicSort; label: string }> = [
  { value: "heat", label: "综合热度" },
  { value: "changePercent", label: "当日涨幅" },
  { value: "limitUpCount", label: "涨停数量" },
  { value: "continuationDays", label: "持续天数" }
];

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function trendClass(trend: TopicTrend) {
  return `topic-trend topic-trend-${trend}`;
}

function TopicEvents({ events, compact = false }: { events: Array<TopicEvent & { topicId?: string; topicName?: string }>; compact?: boolean }) {
  return (
    <div className={`topic-events ${compact ? "topic-events-compact" : ""}`}>
      {events.map((event) => (
        <div className="topic-event-row" key={event.id}>
          <span className={`topic-event-dot topic-event-${event.tone}`} />
          <div className="topic-event-content">
            <div className="topic-event-meta"><span>{event.time}</span><em>{event.type}</em>{event.topicName && <strong>{event.topicName}</strong>}</div>
            <h3>{event.title}</h3>
            <p>{event.summary}</p>
          </div>
        </div>
      ))}
      {!events.length && <div className="topic-empty">当前筛选下暂无题材动态</div>}
    </div>
  );
}

function TopicDetailPanel({ topic, saved, onToggleSaved }: { topic: Topic; saved: boolean; onToggleSaved: () => void }) {
  return (
    <section className="topic-detail-card">
      <div className="topic-detail-head">
        <div>
          <span className="eyebrow">SELECTED TOPIC</span>
          <div className="topic-title-line"><h2>{topic.name}</h2><span className={trendClass(topic.trend)}>{topic.trend}</span></div>
          <p>{topic.description}</p>
        </div>
        <button type="button" className={`topic-save-button ${saved ? "saved" : ""}`} onClick={onToggleSaved}>{saved ? "已关注" : "关注题材"}</button>
      </div>
      <div className="topic-kpi-grid">
        <div><span>综合热度</span><strong className="topic-heat-value">{topic.heat}</strong></div>
        <div><span>当日涨幅</span><strong className={topic.changePercent >= 0 ? "positive" : "negative"}>{formatPercent(topic.changePercent)}</strong></div>
        <div><span>涨停数量</span><strong>{topic.limitUpCount}<small> 家</small></strong></div>
        <div><span>持续</span><strong>{topic.continuationDays}<small> 日</small></strong></div>
      </div>
      <div className="topic-strength-block">
        <div className="topic-subheading"><span>近 6 日题材强度</span><small>热度 / 涨幅</small></div>
        <div className="topic-history-bars">
          {topic.history.map((point) => (
            <div className="topic-history-column" key={point.date}>
              <div className="topic-history-bar-track"><b style={{ height: `${Math.max(16, point.heat)}%` }} /></div>
              <span>{point.date}</span>
              <small className={point.changePercent >= 0 ? "positive" : "negative"}>{formatPercent(point.changePercent)}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="topic-leader-block">
        <div className="topic-subheading"><span>当前领涨股</span><small>题材内贡献最高</small></div>
        <Link className="topic-leader-row" href={`/stocks/${topic.leader.code}`}>
          <span className="topic-leader-rank">01</span><span className="stock-cell"><strong>{topic.leader.name}</strong><small>{topic.leader.code} · {topic.leader.status}</small></span><strong className="positive">{formatPercent(topic.leader.changePercent)}</strong><span>→</span>
        </Link>
      </div>
      <div className="topic-card-footer"><span>更新于 {topicLatestLabel(topic)}</span><Link href={`/topics/${topic.id}`} className="text-link">查看完整详情 →</Link></div>
    </section>
  );
}

function topicLatestLabel(topic: Topic) {
  return topic.history[topic.history.length - 1]?.date ?? "今日";
}

export default function TopicWorkspace({ topics }: TopicWorkspaceProps) {
  const [view, setView] = useState<TopicView>("overview");
  const [sortBy, setSortBy] = useState<TopicSort>("heat");
  const [trend, setTrend] = useState<TopicTrend | "全部">("全部");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(topics[0]?.id ?? "");
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("muchen-topic-watchlist");
    if (stored) {
      try { setSavedIds(JSON.parse(stored) as string[]); } catch { setSavedIds([]); }
    }
  }, []);

  const overview = useMemo(() => ({
    activeCount: topics.filter((topic) => topic.heat >= 70).length,
    mainlineCount: topics.filter((topic) => topic.trend === "强化").length,
    newCount: topics.filter((topic) => topic.trend === "新启动").length,
    limitUpCount: topics.reduce((total, topic) => total + topic.limitUpCount, 0)
  }), [topics]);

  const visibleTopics = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return topics
      .filter((topic) => trend === "全部" || topic.trend === trend)
      .filter((topic) => !keyword || `${topic.name} ${topic.category} ${topic.description}`.toLowerCase().includes(keyword))
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }, [topics, query, sortBy, trend]);

  const selectedTopic = topics.find((topic) => topic.id === selectedId) ?? visibleTopics[0] ?? topics[0];
  const events = useMemo(() => topics.flatMap((topic) => topic.events.map((event) => ({ ...event, topicId: topic.id, topicName: topic.name }))).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)), [topics]);
  const selectedSaved = selectedTopic ? savedIds.includes(selectedTopic.id) : false;

  function toggleSaved(topicId: string) {
    const next = savedIds.includes(topicId) ? savedIds.filter((id) => id !== topicId) : [...savedIds, topicId];
    setSavedIds(next);
    window.localStorage.setItem("muchen-topic-watchlist", JSON.stringify(next));
  }

  return (
    <>
      <section className="hero-row topic-hero-row">
        <div><span className="eyebrow">TOPIC INTELLIGENCE · 01 SEP 2026</span><h1>题材研究</h1><p className="hero-subtitle">从市场热度、事件催化和股票联动，识别正在形成的题材主线。</p></div>
        <div className="hero-actions"><span className="data-note"><span className="status-dot" />演示数据 · 可替换 Provider</span></div>
      </section>

      <section className="topic-overview-grid">
        <div className="topic-overview-card"><span>活跃题材</span><strong>{overview.activeCount}</strong><small>热度 ≥ 70</small></div>
        <div className="topic-overview-card topic-overview-accent"><span>主线候选</span><strong>{overview.mainlineCount}</strong><small>强化状态</small></div>
        <div className="topic-overview-card"><span>新启动</span><strong>{overview.newCount}</strong><small>等待持续性确认</small></div>
        <div className="topic-overview-card"><span>题材涨停</span><strong>{overview.limitUpCount}</strong><small>今日样本合计</small></div>
      </section>

      <section className="topic-toolbar">
        <div className="topic-view-tabs">
          {([{ value: "overview", label: "题材总览" }, { value: "rotation", label: "题材轮动" }, { value: "events", label: "题材动态" }] as Array<{ value: TopicView; label: string }>).map((item) => <button type="button" className={view === item.value ? "selected" : ""} key={item.value} onClick={() => setView(item.value)}>{item.label}</button>)}
        </div>
        <div className="topic-filters">
          <input aria-label="搜索题材" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索题材或分类" />
          <select aria-label="题材状态" value={trend} onChange={(event) => setTrend(event.target.value as TopicTrend | "全部")}>{trendOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <select aria-label="题材排序" value={sortBy} onChange={(event) => setSortBy(event.target.value as TopicSort)}>{sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </div>
      </section>

      {view === "overview" && <div className="topic-dashboard-grid">
        <section className="topic-rank-card">
          <div className="topic-card-heading"><div><span className="eyebrow">TOPIC RANKING</span><h2>题材排行榜</h2></div><span className="live-tag">今日</span></div>
          <div className="topic-rank-list">
            <div className="topic-rank-head"><span>题材</span><span>热度</span><span>涨幅</span><span>领涨股</span></div>
            {visibleTopics.map((topic, index) => <button type="button" className={`topic-rank-row ${selectedTopic?.id === topic.id ? "selected" : ""}`} key={topic.id} onClick={() => setSelectedId(topic.id)}><span className="topic-rank-name"><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{topic.name}</strong><small>{topic.category} · {topic.continuationDays} 日</small></span></span><span className="topic-heat"><i style={{ width: `${topic.heat}%` }} /><strong>{topic.heat}</strong></span><span className={topic.changePercent >= 0 ? "positive" : "negative"}>{formatPercent(topic.changePercent)}</span><span className="topic-leader-name">{topic.leader.name}</span></button>)}
            {!visibleTopics.length && <div className="topic-empty">没有匹配的题材</div>}
          </div>
        </section>
        <section className="topic-event-card">
          <div className="topic-card-heading"><div><span className="eyebrow">SIGNAL STREAM</span><h2>题材动态</h2></div><button type="button" className="topic-plain-button" onClick={() => setView("events")}>全部动态 →</button></div>
          <TopicEvents events={events.slice(0, 5)} compact />
        </section>
        {selectedTopic && <TopicDetailPanel topic={selectedTopic} saved={selectedSaved} onToggleSaved={() => toggleSaved(selectedTopic.id)} />}
      </div>}

      {view === "rotation" && <section className="topic-rotation-card">
        <div className="topic-card-heading"><div><span className="eyebrow">TOPIC ROTATION</span><h2>题材轮动矩阵</h2></div><span className="muted">按热度与涨停数量观察强弱切换</span></div>
        <div className="topic-rotation-table"><div className="topic-rotation-row topic-rotation-head"><span>题材</span>{topics[0]?.history.map((point) => <span key={point.date}>{point.date}</span>)}</div>{visibleTopics.map((topic) => <div className="topic-rotation-row" key={topic.id}><strong>{topic.name}</strong>{topic.history.map((point) => <button type="button" key={point.date} onClick={() => { setSelectedId(topic.id); setView("overview"); }} className={point.heat >= 80 ? "hot" : point.heat >= 65 ? "warm" : "cool"}><b>{point.heat}</b><small>{point.limitUpCount}板</small></button>)}</div>)}</div>
      </section>}

      {view === "events" && <section className="topic-event-card topic-event-card-full"><div className="topic-card-heading"><div><span className="eyebrow">TOPIC EVENTS</span><h2>题材动态时间线</h2></div><span className="muted">新题材 / 新事件 / 公告 / 资金</span></div><TopicEvents events={events} /></section>}
    </>
  );
}
