"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return <button className="logout-button" onClick={logout} disabled={loading}>{loading ? "退出中…" : "退出"}</button>;
}
