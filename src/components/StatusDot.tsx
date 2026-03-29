import { cn } from '../lib/cn'

type StatusDotState = 'not-started' | 'specifying' | 'implementing' | 'complete'

interface StatusDotProps {
  state: StatusDotState
  className?: string
}

/**
 * Status dot indicator for card progress.
 * 'not-started' renders as hollow, 'specifying' as amber filled,
 * 'implementing' as blue filled, 'complete' as green filled.
 */
export function StatusDot({ state, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-full',
        state === 'not-started' &&
          'border-2 border-[var(--border-default)] bg-transparent',
        state === 'specifying' && 'bg-[var(--amber)]',
        state === 'implementing' && 'bg-[var(--blue,#3b82f6)]',
        state === 'complete' && 'bg-[var(--green)]',
        className,
      )}
      style={{
        width: '8px',
        height: '8px',
      }}
      role="status"
      aria-label={state}
    />
  )
}
