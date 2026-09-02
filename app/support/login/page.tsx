"use client";

import { FormEvent, useState } from "react";

export default function SupportLoginPage() {
  const [email, setEmail] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/support/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, accessKey }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "登录失败");
      window.location.href = "/support";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return <main className="support-auth-page"><div className="support-auth-mark"><span>沐</span><small>MUCHEN SUPPORT</small></div><section className="support-auth-card"><span className="support-eyebrow">CUSTOMER SERVICE CONSOLE</span><h1>客服工作台</h1><p>管理试用邀请，为用户发放进入沐尘研究工作区的访问凭证。</p><form onSubmit={submit}><label>客服邮箱<input type="email" placeholder="support@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>客服访问密钥<input type="password" placeholder="请输入客服访问密钥" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} required /></label><button className="support-primary" type="submit" disabled={loading}>{loading ? "验证中…" : "进入客服工作台"}<span>→</span></button></form>{error && <p className="support-error">{error}</p>}<small className="support-auth-note">仅限沐尘客服人员使用 · 需要在服务器中配置独立邮箱白名单和访问密钥</small></section></main>;
}
