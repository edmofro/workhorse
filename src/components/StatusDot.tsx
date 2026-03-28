import { cn } from '../lib/cn'

type StatusDotState = 'not-started' | 'specifying' | 'complete'

interface StatusDotProps {
  state: StatusDotState
  className?: string
}

/**
 * Status dot indicator for feature/group progress.
 * 'not-started' renders as hollow, 'specifying' as amber filled, 'complete' as green filled.
 */
export function StatusDot({ state, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-full',
        state === 'not-started' &&
          'border-2 border-[var(--border-default)] bg-transparent',
        state === 'specifying' && 'bg-[var(--amber)]',
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
