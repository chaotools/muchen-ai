"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, inviteCode }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "登录失败");
      setNotice("登录成功，正在进入研究工作区…");
      window.location.href = "/";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><div className="auth-decoration"><span className="auth-grid-line one" /><span className="auth-grid-line two" /><div className="auth-orbit">沐</div><p>MAKE SIGNALS<br /><strong>TRACEABLE</strong></p></div><section className="auth-card"><Link href="/" className="auth-brand"><span className="brand-mark">沐</span><span><strong>沐尘</strong><small>MUCHEN AI</small></span></Link><span className="eyebrow">INVITE-ONLY ACCESS</span><h1>进入你的研究工作区</h1><p className="auth-subtitle">沐尘采用客服邀请制。输入客服提供的邀请码，开启 7 天 AI 投研模拟体验。</p><form onSubmit={submit}><label>邮箱<input placeholder="you@example.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>客服邀请码<input placeholder="请输入邀请码" type="text" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required /></label><button className="primary-button full" type="submit" disabled={loading}>{loading ? "验证中…" : "进入沐尘"}<span>↗</span></button></form>{error && <p className="form-error auth-error">{error}</p>}{notice && <p className="auth-notice">{notice}</p>}<div className="auth-divider"><span>需要访问权限？</span></div><p className="invite-help">请联系客服获取专属邀请码。{process.env.NODE_ENV !== "production" && <>本地演示邀请码：<code>MC-7DAY-DEMO</code></>}</p><small className="auth-foot">本产品为学习与模拟演示工具，不构成投资建议。</small></section></main>;
}
