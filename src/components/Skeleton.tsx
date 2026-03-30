export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[8px] bg-[var(--bg-inset)] ${className ?? ''}`}
    />
  )
}
