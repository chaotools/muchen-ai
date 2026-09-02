"use client";

import { useEffect, useState } from "react";

const stages = [
  { title: "读取基础数据", detail: "行情、估值与题材结构" },
  { title: "整理研究证据", detail: "归纳支持因素与风险边界" },
  { title: "生成研究笔记", detail: "组织为可验证的下一步" }
];

export default function ResearchProgress({ compact = false }: { compact?: boolean }) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveStage((current) => Math.min(current + 1, stages.length - 1)), 700);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={`research-progress ${compact ? "research-progress-compact" : ""}`} aria-live="polite" aria-label="正在生成研究笔记">
      <div className="research-progress-head"><span className="research-progress-orb">✦</span><span>正在整理研究证据</span></div>
      <div className="research-progress-steps">
        {stages.map((stage, index) => (
          <div className={`research-progress-step ${index < activeStage ? "done" : ""} ${index === activeStage ? "active" : ""}`} key={stage.title}>
            <span>{index < activeStage ? "✓" : String(index + 1)}</span>
            <div><strong>{stage.title}</strong><small>{stage.detail}</small></div>
          </div>
        ))}
      </div>
    </div>
  );
}
