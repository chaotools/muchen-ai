"use client";

import { useState } from "react";
import ResearchProgress from "@/components/research-progress";

type Report = {
  conclusion: string;
  confidence: string;
  positives: string[];
  risks: string[];
  asOf: string;
};

export default function ResearchButton({ code }: { code: string }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  async function runResearch() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
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
    <div className="research-action">
      <button className="primary-button" onClick={runResearch} disabled={loading}>
        {loading ? "正在整理证据…" : report ? "重新生成 AI 研判" : "生成 AI 研判"}
        <span>↗</span>
      </button>
      {error && <p className="form-error">{error}</p>}
      {loading && <div className="inline-progress"><ResearchProgress compact /></div>}
      {report && (
        <div className="inline-report">
          <div className="report-head"><span className="eyebrow">MUCHEN RESEARCH NOTE</span><span className="confidence">置信度 {report.confidence}</span></div>
          <p className="report-conclusion">{report.conclusion}</p>
          <div className="report-columns">
            <div><span className="report-label positive-text">支持因素</span>{report.positives.map((item) => <p key={item}>＋ {item}</p>)}</div>
            <div><span className="report-label negative-text">风险边界</span>{report.risks.map((item) => <p key={item}>－ {item}</p>)}</div>
          </div>
          <small className="muted">数据时间：{report.asOf} · 当前为演示数据，接入 iFinD MCP 后替换为真实证据。</small>
        </div>
      )}
    </div>
  );
}
