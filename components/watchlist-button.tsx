"use client";

import { useEffect, useState } from "react";

export default function WatchlistButton({ code, initial = false }: { code?: string; initial?: boolean }) {
  const [saved, setSaved] = useState(initial);
  useEffect(() => {
    if (!code) return;
    const stored = window.localStorage.getItem(`muchen-watchlist:${code}`);
    if (stored !== null) setSaved(stored === "1");
  }, [code]);

  function toggle() {
    setSaved((value) => {
      const next = !value;
      if (code) window.localStorage.setItem(`muchen-watchlist:${code}`, next ? "1" : "0");
      return next;
    });
  }

  return (
    <button aria-pressed={saved} className={`secondary-button ${saved ? "saved" : ""}`} onClick={toggle}>
      <span>{saved ? "★" : "☆"}</span>{saved ? "已在自选" : "加入自选"}
    </button>
  );
}
