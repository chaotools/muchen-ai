"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
export default function OrderPanel({ code, name, price }: { code: string; name: string; price?: number }) {
  const [symbol, setSymbol] = useState(code);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [shares, setShares] = useState("100");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const requestKey = useRef<string | null>(null);
  const router = useRouter();
  function reset() { requestKey.current = null; setMessage(""); }
  async function submitOrder() {
    if (loading) return;
    setLoading(true); setMessage("");
    requestKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/paper/orders", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: symbol.trim().toUpperCase(), side, shares: Number(shares), idempotencyKey: requestKey.current }) });
      const payload = await response.json();
      if (!response.ok) { if (response.status < 500) requestKey.current = null; throw new Error(payload.error); }
      setMessage(`已模拟成交 ${payload.order.shares} 股，参考价 ¥${payload.order.price.toFixed(2)} · ${payload.order.source} · ${payload.order.asOf}`);
      requestKey.current = null;
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "提交失败，可重试"); }
    finally { setLoading(false); }
  }
  return <div className="order-panel">
    <div className="order-tabs"><button disabled={loading} className={side === "BUY" ? "selected buy" : ""} onClick={() => { setSide("BUY"); reset(); }}>模拟买入</button><button disabled={loading} className={side === "SELL" ? "selected sell" : ""} onClick={() => { setSide("SELL"); reset(); }}>模拟卖出</button></div>
    <label>股票代码<input value={symbol} disabled={loading} onChange={(event) => { setSymbol(event.target.value); reset(); }} placeholder="600519.SH" /></label>
    <p className="muted">{symbol === code ? name : symbol} · {price ? `页面参考价 ¥${price.toFixed(2)}` : "提交时由服务端读取参考价"}</p>
    <label>数量（100 股整数倍）<input type="number" min="100" step="100" max="1000000" value={shares} disabled={loading} onChange={(event) => { setShares(event.target.value); reset(); }} /></label>
    <button className="order-button" onClick={submitOrder} disabled={loading}>{loading ? "提交中…" : "确认模拟成交"}</button>
    {message && <p className="order-message" role="status">{message}</p>}
    <small className="muted">简化模拟账本：按服务端参考价记账，未模拟交易时段、T+1、涨跌停限制、费用和滑点。</small>
  </div>;
}
