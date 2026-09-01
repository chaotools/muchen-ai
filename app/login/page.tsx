"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [notice, setNotice] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("演示环境暂不校验账号。接入认证服务后，这里会使用邀请码开通 7 天研究权限。");
  }
  return <main className="auth-page"><div className="auth-decoration"><span className="auth-grid-line one" /><span className="auth-grid-line two" /><div className="auth-orbit">沐</div><p>MAKE SIGNALS<br /><strong>TRACEABLE</strong></p></div><section className="auth-card"><Link href="/" className="auth-brand"><span className="brand-mark">沐</span><span><strong>沐尘</strong><small>MUCHEN AI</small></span></Link><span className="eyebrow">RESEARCH ACCESS</span><h1>进入你的研究工作区</h1><p className="auth-subtitle">使用客服邀请码，开启 7 天 AI 投研模拟体验。</p><form onSubmit={submit}><label>邮箱或用户名<input placeholder="you@example.com" type="text" /></label><label>密码<input placeholder="请输入密码" type="password" /></label><div className="form-options"><label className="checkbox"><input type="checkbox" />记住本次登录</label><button type="button" className="plain-button">忘记密码</button></div><button className="primary-button full" type="submit">登录沐尘 <span>↗</span></button></form>{notice && <p className="auth-notice">{notice}</p>}<div className="auth-divider"><span>还没有权限？</span></div><button className="secondary-button full">联系客服获取邀请码</button><small className="auth-foot">本产品为学习与模拟演示工具，不构成投资建议。</small></section></main>;
}
