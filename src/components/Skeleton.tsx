import { cn } from '../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-[8px] bg-[var(--bg-inset)]', className)}
    />
  )
}
