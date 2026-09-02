"use client";

import { useState } from "react";
import SupportInviteConsole from "@/components/support-invite-console";

export default function SupportPage() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/support/auth/logout", { method: "POST" });
    window.location.href = "/support/login";
  }

  return <main className="support-console-page"><aside className="support-sidebar"><div className="support-logo"><span>沐</span><div><strong>沐尘</strong><small>SUPPORT CONSOLE</small></div></div><div className="support-nav-label">客服工作台</div><div className="support-nav-item active"><span>▣</span>邀请码管理</div><div className="support-nav-item muted-item"><span>◌</span>用户服务记录</div><div className="support-nav-item muted-item"><span>◇</span>数据连接状态</div><div className="support-sidebar-foot"><span className="support-online-dot" />客服系统在线<button onClick={logout} disabled={loggingOut}>{loggingOut ? "退出中…" : "退出工作台"}</button></div></aside><section className="support-main"><header className="support-header"><div><span className="support-eyebrow">CUSTOMER SERVICE / INVITATIONS</span><h1>邀请码管理</h1><p>为用户创建、复制和撤销沐尘研究工作区的访问邀请码。</p></div><div className="support-agent"><span className="support-agent-avatar">S</span><span><strong>客服人员</strong><small>邀请管理员</small></span></div></header><div className="support-notice"><span>i</span><p>邀请码只负责开通用户侧 7 天研究会话。客服访问密钥与用户邀请码相互独立，生产环境请分别配置。</p></div><SupportInviteConsole /><footer className="support-footer">沐尘客服工作台 · 内部使用 · 不要在公开渠道展示客服访问密钥</footer></section></main>;
}
