export default function ResearchProgress({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "research-progress compact" : "research-progress"} role="status" aria-live="polite">
    <strong>正在读取行情并保存笔记…</strong><p className="muted">数据暂缺时会显示错误，请勿重复提交。</p>
  </div>;
}
