"use client";

import { useState } from "react";

export default function ProviderCheck() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/provider", { method: "POST" });
      const payload = await response.json();
      setMessage(response.ok ? `连接正常 · 已发现 ${payload.toolCount} 个工具` : payload.error);
    } catch {
      setMessage("连接检查失败，请查看服务器日志");
    } finally {
      setLoading(false);
    }
  }

  return <div className="provider-check"><button className="secondary-button" onClick={check} disabled={loading}>{loading ? "检查中…" : "检查连接"}</button>{message && <small className={message.startsWith("连接正常") ? "positive" : "form-error"}>{message}</small>}</div>;
}
