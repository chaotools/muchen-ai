"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WatchlistButton({ code, initial = false }: { code?: string; initial?: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    setReady(false);
    fetch("/api/watchlist", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("请登录后管理自选");
      const payload = await response.json();
      setSaved(payload.codes.includes(code));
      setReady(true);
    }).catch((error) => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [code]);
  async function toggle() {
    if (!code) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, saved: !saved }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setSaved(payload.saved);
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "保存失败"); }
    finally { setBusy(false); }
  }
  return <span><button aria-pressed={saved} className={`secondary-button ${saved ? "saved" : ""}`} disabled={!ready || busy || !code} onClick={toggle}>{busy ? "保存中…" : saved ? "★ 移出自选" : "☆ 加入自选"}</button>{error && <small className="form-error" role="alert">{error}</small>}</span>;
}
