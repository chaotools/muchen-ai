import Link from "next/link";
import AppShell from "@/components/app-shell";
import WatchlistButton from "@/components/watchlist-button";
import { getQuotesForCodes, getProviderInfo } from "@/lib/market";
import { listWatchlist } from "@/lib/workspace";
import { pageUser } from "@/lib/page-user";
import { isDatabaseConfigured } from "@/lib/db";

export default async function WatchlistPage() {
  const user = await pageUser();
  const codes = await listWatchlist(user.id);
  const quotes = await getQuotesForCodes(codes);
  const provider = getProviderInfo();
  return <AppShell dataMode={provider.mode}><div className="page-wrap">
    <section className="hero-row"><div><span className="eyebrow">MY WATCHLIST</span><h1>我的自选</h1><p className="hero-subtitle">添加或移除标的，保存你的研究范围。</p></div><Link className="primary-button" href="/screener">＋ 查找标的</Link></section>
    <p className="muted">{codes.length} 个标的 · {isDatabaseConfigured() ? "已保存到个人账户" : "本地演示存储，服务重启后清空"}</p>
    {!codes.length && <div className="info-banner">自选列表为空。在个股详情页点击“加入自选”。</div>}
    <div className="watch-grid">{quotes.map((quote) => <article className="watch-card" key={quote.code}>
      <Link href={`/stocks/${quote.code}`}><div className="watch-card-head"><div><strong>{quote.name}</strong><small>{quote.code}</small></div></div>
        <div className="watch-price"><strong>{quote.availability === "missing" ? "行情暂缺" : `¥${quote.price.toFixed(2)}`}</strong>
        {quote.availability !== "missing" && <span className={quote.changePercent >= 0 ? "positive" : "negative"}>{quote.changePercent.toFixed(2)}%</span>}</div>
        <p className="muted">{quote.asOf ?? "演示样本"} · {quote.signal ?? "未评估"}</p>
      </Link><WatchlistButton code={quote.code} initial />
    </article>)}</div>
  </div></AppShell>;
}
