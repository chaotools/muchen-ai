"use client";

import { useState, type PointerEvent } from "react";

type ChartRange = "intraday" | "daily" | "weekly";

type StockChartProps = {
  code: string;
  price: number;
  high52: number;
  low52: number;
  history?: Array<{ date: string; close: number; changePercent: number }>;
};

type ChartSeries = { label: string; timestamps: string[]; changes: number[]; values?: number[]; simulated?: boolean };

const demoRanges: Record<ChartRange, ChartSeries> = {
  intraday: {
    label: "分时（模拟）",
    simulated: true,
    timestamps: ["09:30", "09:50", "10:10", "10:30", "10:50", "11:10", "11:30"],
    changes: [-0.62, -0.34, 0.18, -0.08, 0.44, 0.73, 1.12]
  },
  daily: {
    label: "日K",
    simulated: true,
    timestamps: ["08-24", "08-25", "08-26", "08-27", "08-28", "08-31", "09-01"],
    changes: [-3.84, -2.15, -2.91, -0.72, -1.36, 0.41, 1.12]
  },
  weekly: {
    label: "周K",
    simulated: true,
    timestamps: ["7月第1周", "7月第2周", "8月第1周", "8月第2周", "8月第3周", "8月第4周", "本周"],
    changes: [-8.92, -6.3, -4.18, -5.06, -1.98, -0.44, 1.12]
  }
};

function buildRealRanges(history: StockChartProps["history"]): Record<ChartRange, ChartSeries> | null {
  const valid = (history ?? []).filter((point) => Number.isFinite(point.close) && point.close > 0);
  if (valid.length < 2) return null;
  const daily = valid.slice(-7);
  const weekly: typeof valid = [];
  for (let index = Math.max(0, valid.length - 30); index < valid.length; index += 5) {
    weekly.push(valid[Math.min(index + 4, valid.length - 1)]);
  }
  const makeSeries = (label: string, points: typeof valid): ChartSeries => ({
    label,
    timestamps: points.map((point) => point.date),
    values: points.map((point) => point.close),
    changes: points.map((point, index) => index === 0 ? point.changePercent : (point.close / points[index - 1].close - 1) * 100)
  });
  return {
    intraday: demoRanges.intraday,
    daily: makeSeries("日K", daily),
    weekly: makeSeries("周K", weekly)
  };
}

function formatPrice(value: number) {
  return value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StockChart({ code, price, high52, low52, history }: StockChartProps) {
  const [range, setRange] = useState<ChartRange>("intraday");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const ranges = buildRealRanges(history) ?? demoRanges;
  const series = ranges[range];
  const points = series.values ?? series.changes.map((change) => price * (1 + change / 100));
  const rawMin = Math.min(...points);
  const rawMax = Math.max(...points);
  const padding = Math.max((rawMax - rawMin) * 0.2, price * 0.006);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const left = 10;
  const right = 750;
  const top = 16;
  const bottom = 208;
  const span = max - min;
  const xFor = (index: number) => left + (index / (points.length - 1)) * (right - left);
  const yFor = (value: number) => top + ((max - value) / span) * (bottom - top);
  const line = points.map((value, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(2)} ${yFor(value).toFixed(2)}`).join(" ");
  const area = `${line} L${xFor(points.length - 1).toFixed(2)} ${bottom} L${xFor(0).toFixed(2)} ${bottom} Z`;
  const selectedIndex = hoverIndex ?? points.length - 1;
  const selectedValue = points[selectedIndex];
  const selectedChange = series.changes[selectedIndex];

  function updateHover(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    setHoverIndex(Math.round(relativeX * (points.length - 1)));
  }

  return (
    <>
      <div className="chart-tabs" role="tablist" aria-label="行情周期">
        {(Object.keys(ranges) as ChartRange[]).map((key) => (
          <button type="button" role="tab" aria-selected={range === key} className={range === key ? "active" : ""} key={key} onClick={() => { setRange(key); setHoverIndex(null); }}>
            {ranges[key].label}
          </button>
        ))}
      </div>
      <div className="chart-area interactive-chart">
        <div className="interactive-chart-y" aria-hidden="true">
          {[max, max - span / 3, max - (span * 2) / 3, min].map((value) => <span key={value}>{formatPrice(value)}</span>)}
        </div>
        <div className="interactive-chart-canvas">
            <svg viewBox="0 0 760 240" className="chart-svg" role="img" aria-label={`${series.label}${series.simulated ? "" : "走势"}，可移动指针查看数值`} onPointerMove={updateHover} onPointerLeave={() => setHoverIndex(null)}>
            <defs><linearGradient id={`chart-fill-${code.replace(/\W/g, "")}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#54e6c1" stopOpacity=".28" /><stop offset="1" stopColor="#54e6c1" stopOpacity="0" /></linearGradient></defs>
            {[top, top + (bottom - top) / 3, top + ((bottom - top) * 2) / 3, bottom].map((y) => <line className="chart-grid-line" key={y} x1={left} x2={right} y1={y} y2={y} />)}
            <path d={area} fill={`url(#chart-fill-${code.replace(/\W/g, "")})`} />
            <path d={line} className="chart-line" />
            {hoverIndex !== null && <g className="chart-hover"><line x1={xFor(hoverIndex)} x2={xFor(hoverIndex)} y1={top} y2={bottom} /><circle cx={xFor(hoverIndex)} cy={yFor(points[hoverIndex])} r="5" /></g>}
          </svg>
          <div className="chart-tooltip" style={{ left: `${(xFor(selectedIndex) / 760) * 100}%` }}>
            <span>{series.timestamps[selectedIndex]}</span><strong>¥{formatPrice(selectedValue)}</strong><small className={selectedChange >= 0 ? "positive" : "negative"}>{selectedChange >= 0 ? "+" : ""}{selectedChange.toFixed(2)}%</small>
          </div>
        </div>
        <div className="chart-x">{series.timestamps.map((timestamp) => <span key={timestamp}>{timestamp}</span>)}</div>
      </div>
      <div className="chart-legend"><span><i className="legend-line" />{series.label}{series.simulated ? "" : "真实走势"}</span><span>52 周高 ¥{high52.toFixed(2)}</span><span>52 周低 ¥{low52.toFixed(2)}</span></div>
      <p className="sr-only" aria-live="polite">{series.label}，{series.timestamps[selectedIndex]}，价格 {formatPrice(selectedValue)}，变化 {selectedChange.toFixed(2)}%</p>
    </>
  );
}
