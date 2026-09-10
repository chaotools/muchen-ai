"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="page-wrap"><h1>服务暂时不可用</h1><p>请稍后重试；如果持续出现，请检查数据服务和数据库配置。</p><button className="primary-button" onClick={reset}>重新加载</button></main>;
}
