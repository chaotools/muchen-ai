import Link from "next/link";
import AppShell from "@/components/app-shell";
import OrderPanel from "@/components/order-panel";
import { pageUser } from "@/lib/page-user";
import { getPaperAccount, initialCashCents } from "@/lib/workspace";
import { getProviderInfo, getQuotesForCodes } from "@/lib/market";
import { isDatabaseConfigured } from "@/lib/db";
const money = (cents: number) => (cents / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function PortfolioPage() {
  const user = await pageUser();
  const account = await getPaperAccount(user.id);
  const quotes = await getQuotesForCodes(account.positions.map((position) => position.code));
  const complete = quotes.every((quote) => quote.availability !== "missing");
  const marketValue = account.positions.reduce((sum, position) => sum + Math.round((quotes.find((quote) => quote.code === position.code)?.price ?? 0) * 100) * position.shares, 0);
  const equity = account.cashCents + marketValue;
  const provider = getProviderInfo();
  return <AppShell dataMode={provider.mode}><div className="page-wrap">
    <section className="hero-row"><div><span className="eyebrow">PAPER PORTFOLIO</span><h1>模拟持仓</h1><p className="hero-subtitle">初始虚拟资金 ¥100,000，交易会更新个人账户和成交记录。</p></div><span className="paper-badge">PAPER ONLY</span></section>
    <p className="muted">{isDatabaseConfigured() ? "账户和订单已持久化" : "本地演示存储，服务重启后清空"} · 行情按页面载入时的最新可用数据估值</p>
    <section className="portfolio-metrics"><div><span>估算总权益</span><strong>{complete ? `¥${money(equity)}` : "行情暂缺"}</strong></div><div><span>可用现金</span><strong>¥{money(account.cashCents)}</strong></div><div><span>累计盈亏（不含费用）</span><strong>{complete ? `¥${money(equity - initialCashCents)}` : "暂无法估值"}</strong></div><div><span>成交笔数</span><strong>{account.orders.length}</strong></div></section>
    <section className="portfolio-grid"><div className="market-card"><h2>当前持仓</h2>
      {!account.positions.length && <p className="muted">暂无持仓，提交模拟买入后会出现在这里。</p>}
      {account.positions.map((position) => { const quote = quotes.find((item) => item.code === position.code); return <div className="position-row" key={position.code}>
        <Link href={`/stocks/${position.code}`}><strong>{quote?.name ?? position.code}</strong><small>{position.shares} 股 · {position.code}</small></Link>
        <div><strong>{quote?.availability !== "missing" ? `¥${quote?.price.toFixed(2)}` : "行情暂缺"}</strong><small>{quote?.asOf ?? "演示样本"}</small></div>
        <div><strong>成本 ¥{money(position.costCents)}</strong><small>均价 ¥{money(position.costCents / position.shares)}</small></div>
      </div>; })}
    </div><OrderPanel code="600519.SH" name="贵州茅台" /></section>
    <section className="section-block market-card"><h2>成交流水</h2>{!account.orders.length && <p className="muted">尚无成交记录。</p>}
      {account.orders.map((order) => <div className="decision-line" key={order.id}><div><strong>{order.side === "BUY" ? "买入" : "卖出"} {order.code} · {order.shares} 股 · ¥{order.price.toFixed(2)}</strong><p>{order.source} · 报价时间 {order.asOf} · 金额 ¥{money(order.amountCents)}</p><small>{new Date(order.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</small></div></div>)}
    </section>
  </div></AppShell>;
}
