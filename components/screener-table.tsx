"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ScreenerQuote } from "@/lib/market";

const scoreOptions = [0, 70, 80];

export default function ScreenerTable({ universe }: { universe: ScreenerQuote[] }) {
  const industries = ["全部", ...Array.from(new Set(universe.map((quote) => quote.industry)))];
  const [industry, setIndustry] = useState("全部");
  const [momentum, setMomentum] = useState("全部");
  const [minScore, setMinScore] = useState(0);

  const filtered = useMemo(() => universe.filter((quote) => {
    const industryMatch = industry === "全部" || quote.industry === industry;
    const momentumMatch = momentum === "全部" || quote.momentum === momentum;
    return industryMatch && momentumMatch && quote.score >= minScore;
  }), [industry, momentum, minScore, universe]);

  return (
    <>
      <div className="screener-toolbar">
        <div className="screener-filter-group"><span>行业</span>{industries.map((item) => <button className={industry === item ? "filter-chip active" : "filter-chip"} key={item} onClick={() => setIndustry(item)}>{item}</button>)}</div>
        <div className="screener-filter-group"><span>动能</span>{["全部", "强", "中", "弱"].map((item) => <button className={momentum === item ? "filter-chip active" : "filter-chip"} key={item} onClick={() => setMomentum(item)}>{item}</button>)}</div>
        <div className="screener-filter-group"><span>AI 评分</span>{scoreOptions.map((score) => <button className={minScore === score ? "filter-chip active" : "filter-chip"} key={score} onClick={() => setMinScore(score)}>{score === 0 ? "全部" : `${score}+`}</button>)}</div>
      </div>

      <section className="market-card screener-card">
        <div className="card-title-row"><div><span className="eyebrow">SCREENED UNIVERSE</span><h2>候选标的</h2></div><span className="muted">{filtered.length} / {universe.length} 个标的</span></div>
        <div className="screener-table-wrap">
          <div className="screener-row screener-head"><span>标的</span><span>最新价</span><span>涨跌幅</span><span>AI 评分</span><span>动能</span><span>估值</span><span>风险</span></div>
          {filtered.map((quote) => <Link className="screener-row" href={`/stocks/${quote.code}`} key={quote.code}><span className="stock-cell"><strong>{quote.name}</strong><small>{quote.code} · {quote.industry}</small></span><strong>¥{quote.price.toFixed(2)}</strong><span className={quote.changePercent >= 0 ? "positive" : "negative"}>{quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%</span><strong className={quote.score >= 80 ? "positive" : "score-normal"}>{quote.score}</strong><span className={`table-tag momentum-${quote.momentum}`}>{quote.momentum}</span><span className="table-tag">{quote.valuation}</span><span className={`table-tag risk-${quote.risk}`}>{quote.risk}</span></Link>)}
          {filtered.length === 0 && <div className="screener-empty">没有符合当前条件的标的，试试放宽筛选条件。</div>}
        </div>
      </section>
    </>
  );
}
