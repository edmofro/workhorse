import { cn } from '../lib/cn'

export type StatusDotState = 'not-started' | 'specifying' | 'implementing' | 'complete' | 'cancelled'

/** Maps a raw DB card status string to a StatusDotState. Unknown values default to 'not-started'. */
export function statusToDotState(status: string): StatusDotState {
  switch (status) {
    case 'NOT_STARTED': return 'not-started'
    case 'SPECIFYING': return 'specifying'
    case 'IMPLEMENTING': return 'implementing'
    case 'COMPLETE': return 'complete'
    case 'CANCELLED': return 'cancelled'
    default: return 'not-started'
  }
}

interface StatusDotProps {
  state: StatusDotState
  className?: string
}

/**
 * Status dot indicator for card progress.
 * 'not-started' renders as hollow, 'specifying' as amber filled,
 * 'implementing' as blue filled, 'complete' as green filled,
 * 'cancelled' as muted filled.
 */
export function StatusDot({ state, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-full',
        state === 'not-started' &&
          'border border-[var(--border-default)] bg-transparent',
        state === 'specifying' && 'bg-[var(--amber)]',
        state === 'implementing' && 'bg-[var(--blue,#2563eb)]',
        state === 'complete' && 'bg-[var(--green)]',
        state === 'cancelled' && 'bg-[var(--text-muted)]',
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
