"use client";

import { useState } from "react";

export default function OrderPanel({ code, name, price }: { code: string; name: string; price: number }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [shares, setShares] = useState("100");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitOrder() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/paper/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, side, shares: Number(shares), price })
      });
      const payload = await response.json();
      setMessage(response.ok ? `模拟${side === "BUY" ? "买入" : "卖出"}已创建 · ${payload.orderId}` : payload.error);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "模拟订单提交失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="order-panel">
      <div className="order-tabs"><button className={side === "BUY" ? "selected buy" : ""} onClick={() => setSide("BUY")}>模拟买入</button><button className={side === "SELL" ? "selected sell" : ""} onClick={() => setSide("SELL")}>模拟卖出</button></div>
      <div className="order-symbol"><strong>{name}</strong><span>{code}</span></div>
      <label>模拟价格<input value={price.toFixed(2)} readOnly /></label>
      <label>数量（100 股起）<input type="number" min="100" step="100" value={shares} onChange={(event) => setShares(event.target.value)} /></label>
      <div className="order-total"><span>预计金额</span><strong>¥{(Number(shares || 0) * price).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</strong></div>
      <button className={`order-button ${side === "SELL" ? "sell" : ""}`} onClick={submitOrder} disabled={loading}>{loading ? "提交中…" : "确认模拟"}</button>
      {message && <p className="order-message">{message}</p>}
      <small className="muted">仅用于虚拟资金演示，不连接券商。</small>
    </div>
  );
}
