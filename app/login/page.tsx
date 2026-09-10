"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  async function sendCode() {
    setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/email-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setNotice(payload.message);
    } catch (error) { setError(error instanceof Error ? error.message : "发送失败"); }
    finally { setSending(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, inviteCode, emailCode }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "登录失败");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";
    } catch (error) { setError(error instanceof Error ? error.message : "登录失败"); }
    finally { setLoading(false); }
  }
  return <main className="auth-page"><div className="auth-decoration"><div className="auth-orbit">沐</div><p>MAKE SIGNALS<br /><strong>TRACEABLE</strong></p></div>
    <section className="auth-card"><Link href="/" className="auth-brand"><span className="brand-mark">沐</span><strong>沐尘</strong></Link>
      <span className="eyebrow">INVITE-ONLY ACCESS</span><h1>进入你的研究工作区</h1><p className="auth-subtitle">使用客服邀请码与邮箱验证码登录。验证码 10 分钟内有效，每次登录后会话保留 7 天。</p>
      <form onSubmit={submit}>
        <label>邮箱<input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailCode(""); setNotice(""); }} required maxLength={160} /></label>
        <button className="secondary-button" type="button" disabled={sending || loading || !email.trim()} onClick={sendCode}>{sending ? "发送中…" : "发送邮箱验证码"}</button>
        <label>邮箱验证码<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={emailCode} onChange={(event) => setEmailCode(event.target.value)} required /></label>
        <label>客服邀请码<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required maxLength={80} /></label>
        <button className="primary-button full" type="submit" disabled={loading || sending}>{loading ? "验证中…" : "登录沐尘"}</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}
      <p className="invite-help">没有邀请码请联系客服。邮箱验证服务未配置时，请联系管理员完成邮件服务配置。</p>
    </section></main>;
}
