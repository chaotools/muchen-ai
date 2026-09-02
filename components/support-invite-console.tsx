"use client";

import { useEffect, useMemo, useState } from "react";

type Invite = { code: string; maxUses: number; usedCount: number; expiresAt: string | null; createdAt: string; status: string };

function formatDate(value: string | null) {
  if (!value) return "不过期";
  return new Date(value).toLocaleDateString("zh-CN");
}

export default function SupportInviteConsole() {
  const [items, setItems] = useState<Invite[]>([]);
  const [storage, setStorage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [message, setMessage] = useState("正在读取邀请码…");
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await fetch("/api/support/invites");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "无法读取邀请码");
    setItems(payload.items ?? []);
    setStorage(payload.storage ?? "");
    setMessage(payload.storage === "postgresql" ? "已连接 PostgreSQL，数据会持久化" : "演示存储，仅当前服务进程有效");
  }

  useEffect(() => { load().catch((error) => setMessage(error instanceof Error ? error.message : "无法读取邀请码")); }, []);

  const filtered = useMemo(() => items.filter((item) => (statusFilter === "全部" || item.status === statusFilter) && item.code.toLowerCase().includes(search.trim().toLowerCase())), [items, search, statusFilter]);

  async function create() {
    setLoading(true);
    const response = await fetch("/api/support/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxUses: Number(maxUses), expiresInDays: Number(expiresInDays) }) });
    const payload = await response.json();
    if (response.ok) { setItems((current) => [payload.item, ...current]); setStorage(payload.storage); setMessage("新邀请码已创建，可以复制发给用户"); } else setMessage(payload.error ?? "邀请码创建失败");
    setLoading(false);
  }

  async function revoke(code: string) {
    if (!window.confirm(`确认撤销邀请码 ${code} 吗？`)) return;
    const response = await fetch("/api/support/invites", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const payload = await response.json();
    if (response.ok) { setItems((current) => current.map((item) => item.code === code ? { ...item, status: "已撤销" } : item)); setMessage("邀请码已撤销"); } else setMessage(payload.error ?? "撤销失败");
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(code);
    setMessage(`已复制 ${code}`);
  }

  return <section className="support-invite-console"><div className="support-console-stats"><div><span>当前邀请码</span><strong>{items.length}</strong><small>{storage === "postgresql" ? "数据库持久化" : "演示存储"}</small></div><div><span>有效邀请码</span><strong className="support-cyan">{items.filter((item) => item.status === "有效").length}</strong><small>可继续发放</small></div><div><span>今日发放</span><strong>{items.filter((item) => item.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length}</strong><small>按创建时间统计</small></div></div><div className="support-invite-actions"><div><span className="support-label">生成新邀请码</span><div className="support-input-row"><label>使用次数<input type="number" min="1" max="1000" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} /></label><label>有效天数<input type="number" min="1" max="365" value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value)} /></label><button className="support-primary compact" onClick={create} disabled={loading}>{loading ? "生成中…" : "生成邀请码"}<span>＋</span></button></div></div><p className="support-message">{message}</p></div><div className="support-list-toolbar"><input placeholder="搜索邀请码" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="support-filter-tabs">{["全部", "有效", "已用尽", "已过期", "已撤销"].map((status) => <button className={statusFilter === status ? "selected" : ""} key={status} onClick={() => setStatusFilter(status)}>{status}</button>)}</div></div><div className="support-invite-table"><div className="support-invite-row support-invite-head"><span>邀请码</span><span>使用情况</span><span>有效期</span><span>状态</span><span>操作</span></div>{filtered.map((item) => <div className="support-invite-row" key={item.code}><strong>{item.code}</strong><span>{item.maxUses === 0 ? "环境变量" : `${item.usedCount} / ${item.maxUses} 次`}</span><span>{formatDate(item.expiresAt)}</span><span className={`support-status status-${item.status}`}>{item.status}</span><span className="support-row-actions"><button onClick={() => copy(item.code)}>复制</button>{item.status === "有效" && item.maxUses !== 0 && <button className="danger-link" onClick={() => revoke(item.code)}>撤销</button>}</span></div>)}{filtered.length === 0 && <div className="support-empty">没有符合条件的邀请码</div>}</div></section>;
}
