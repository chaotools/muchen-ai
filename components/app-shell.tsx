"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import StockSearch from "@/components/stock-search";
import LogoutButton from "@/components/logout-button";

const navItems = [
  { href: "/", label: "市场驾驶舱", icon: "◈" },
  { href: "/topics", label: "题材研究", icon: "✦" },
  { href: "/watchlist", label: "我的自选", icon: "☆" },
  { href: "/portfolio", label: "模拟持仓", icon: "▣" },
  { href: "/analysis", label: "研究报告", icon: "⌁" },
  { href: "/screener", label: "市场筛选", icon: "⌗" },
  { href: "/admin", label: "控制中心", icon: "⚙" }
];

export default function AppShell({ children, dataMode = "demo" }: { children: React.ReactNode; dataMode?: "demo" | "free-data" | "ifind-mcp" }) {
  const pathname = usePathname();
  const dataLabel = dataMode === "free-data" ? "本地免费数据" : dataMode === "ifind-mcp" ? "iFinD MCP" : "演示模式";
  const workspaceLabel = dataMode === "demo" ? "演示工作区" : "真实数据工作区";
  const sectionTitle = pathname === "/"
    ? "市场驾驶舱"
    : pathname.startsWith("/topics")
      ? "题材研究"
      : "研究工作区";

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
            <strong>邮箱验证登录</strong>
            <p>从一个问题开始，保存可追溯的研究笔记。</p>
            <Link href="/analysis" className="small-button">打开研究库</Link>
          </div>
          <div className="user-chip">
            <span className="avatar">M</span>
            <span><strong>研究员</strong><small>{workspaceLabel}</small></span>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>沐尘实验室</span><i>/</i><strong>{sectionTitle}</strong></div>
          <div className="top-actions">
            <StockSearch />
            <span className="status-pill"><span className="status-dot" />{dataLabel}</span>
            <Link href="/watchlist" className="login-link">我的自选</Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
