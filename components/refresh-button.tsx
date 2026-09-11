"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className="icon-button" aria-label="刷新行情" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "…" : "↻"}</button>;
}
