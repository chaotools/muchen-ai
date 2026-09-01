"use client";

import { useEffect, useState } from "react";

type Invite = { code: string; maxUses: number | null; usedCount: number | null; expiresAt: string | null; status: string };

export default function InviteManager() {
  const [items, setItems] = useState<Invite[]>([]);
  const [message, setMessage] = useState("正在读取邀请码…");
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/invites");
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error ?? "无法读取邀请码"); return; }
    setItems(payload.items ?? []);
    setMessage(payload.databaseConfigured ? "已连接数据库 · 邀请码可持久化" : "当前使用环境变量邀请码 · 配置数据库后可管理多组邀请码");
  }

  useEffect(() => { load().catch(() => setMessage("无法读取邀请码")); }, []);

  async function create() {
    setLoading(true);
    const response = await fetch("/api/admin/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxUses: 1, expiresInDays: 7 }) });
    const payload = await response.json();
    if (response.ok) { setItems((current) => [payload.item, ...current]); setMessage("新邀请码已创建"); } else setMessage(payload.error ?? "邀请码创建失败");
    setLoading(false);
  }

  return <div className="invite-manager"><div className="invite-list">{items.map((item) => <div className="invite-code" key={item.code}><span>{item.code}</span><small>{item.maxUses === null ? "环境变量" : `${item.usedCount}/${item.maxUses} 次 · ${item.status}`}</small></div>)}{items.length === 0 && <p className="muted">暂无邀请码</p>}</div><p className={message.includes("无法") || message.includes("失败") || message.includes("配置") ? "muted" : "positive"}>{message}</p><button className="primary-button" onClick={create} disabled={loading}>{loading ? "创建中…" : "生成新邀请码"}<span>＋</span></button></div>;
}
