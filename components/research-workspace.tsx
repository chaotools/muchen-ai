"use client";

import { FormEvent, useState } from "react";
import type { Quote } from "@/lib/market";
import ResearchProgress from "@/components/research-progress";

type Report = {
  conclusion: string;
  confidence: string;
  positives: string[];
  risks: string[];
  asOf: string;
};

export default function ResearchWorkspace({ stocks, providerLabel = "演示数据" }: { stocks: Quote[]; providerLabel?: string }) {
  const [code, setCode] = useState(stocks[0]?.code ?? "688981.SH");
  const [question, setQuestion] = useState("结合近期行情和公告，未来一周最需要验证什么？");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, question })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "研究任务启动失败");
      setReport(payload.report);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "研究任务启动失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="research-workspace">
      <div className="workspace-intro">
        <span className="signal-orb">✦</span>
        <div>
          <span className="eyebrow">QUESTION-LED RESEARCH</span>
          <h2>从一个问题开始</h2>
          <p>选择标的，写下你真正想验证的假设，沐尘会把它整理成带风险边界的研究笔记。</p>
        </div>
      </div>
      <form className="research-form" onSubmit={submit}>
        <label>研究标的<select value={code} onChange={(event) => setCode(event.target.value)}>{stocks.map((stock) => <option value={stock.code} key={stock.code}>{stock.name} · {stock.code}</option>)}</select></label>
        <label>你想研究什么？<textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={240} rows={4} placeholder="例如：估值是否已经反映增长？近期有哪些风险需要验证？" /></label>
        <div className="research-form-foot">
          <span className="muted">{question.length} / 240 · {providerLabel}</span>
          <button className="primary-button" type="submit" disabled={loading || !question.trim()}>{loading ? "正在整理证据…" : report ? "重新生成研究" : "生成研究笔记"}<span>↗</span></button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
      {loading && <ResearchProgress />}
      {report && <div className="workspace-report">
        <div className="report-head"><span className="eyebrow">LATEST RESEARCH NOTE</span><span className="confidence">置信度 {report.confidence}</span></div>
        <p className="report-conclusion">{report.conclusion}</p>
        <div className="report-columns">
          <div><span className="report-label positive-text">支持因素</span>{report.positives.map((item) => <p key={item}>＋ {item}</p>)}</div>
          <div><span className="report-label negative-text">风险边界</span>{report.risks.map((item) => <p key={item}>－ {item}</p>)}</div>
        </div>
        <small className="muted">生成时间：{report.asOf} · 后续可关联行情、财务、公告原文。</small>
      </div>}
    </section>
  );
}
