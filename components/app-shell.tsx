"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import StockSearch from "@/components/stock-search";
import LogoutButton from "@/components/logout-button";

const navItems = [
  { href: "/", label: "市场驾驶舱", icon: "◈" },
  { href: "/watchlist", label: "AI 自选", icon: "☆" },
  { href: "/portfolio", label: "模拟持仓", icon: "▣" },
  { href: "/analysis", label: "研究报告", icon: "⌁" },
  { href: "/screener", label: "市场筛选", icon: "⌗" },
  { href: "/admin", label: "控制中心", icon: "⚙" }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">沐</span>
          <span>
            <strong>沐尘</strong>
            <small>MUCHEN AI</small>
          </span>
        </Link>

        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="主导航">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link className={`nav-item ${active ? "active" : ""}`} href={item.href} key={item.href}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {active && <span className="active-dot" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="trial-card">
            <span className="eyebrow">TRIAL ACCESS</span>
            <strong>研究权限 · 7 天</strong>
            <p>连接数据后，开始你的第一份 AI 研究。</p>
            <Link href="/login" className="small-button">获取邀请</Link>
          </div>
          <div className="user-chip">
            <span className="avatar">M</span>
            <span><strong>研究员</strong><small>演示工作区</small></span>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>沐尘实验室</span><i>/</i><strong>{pathname === "/" ? "市场驾驶舱" : "研究工作区"}</strong></div>
          <div className="top-actions">
            <StockSearch />
            <span className="status-pill"><span className="status-dot" />演示模式</span>
            <Link href="/login" className="login-link">登录 / 邀请</Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
