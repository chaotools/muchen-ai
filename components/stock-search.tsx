"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Quote } from "@/lib/market";

export default function StockSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Quote[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const keyword = query.trim();
    if (!keyword) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/market/search?q=${encodeURIComponent(keyword)}`, { signal: controller.signal });
        const payload = await response.json();
        setResults(payload.results ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="stock-search">
      <span className="search-icon">⌕</span>
      <input
        aria-label="搜索股票"
        placeholder="搜索股票 / 代码"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {query.trim() && open && (
        <div className="search-results">
          {loading && <div className="search-empty">正在搜索…</div>}
          {!loading && results.length === 0 && <div className="search-empty">没有找到匹配标的</div>}
          {!loading && results.map((quote) => (
            <Link href={`/stocks/${quote.code}`} className="search-result" key={quote.code} onClick={() => { setOpen(false); setQuery(quote.name); }}>
              <span><strong>{quote.name}</strong><small>{quote.code}</small></span>
              <span className={quote.changePercent >= 0 ? "positive" : "negative"}>{quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%</span>
            </Link>
          ))}
          <Link href="/screener" className="search-more" onClick={() => setOpen(false)}>打开市场筛选器 →</Link>
        </div>
      )}
    </div>
  );
}
