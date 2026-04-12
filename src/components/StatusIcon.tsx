import { cn } from '../lib/cn'

export type StatusIconState = 'not-started' | 'specifying' | 'implementing' | 'complete' | 'cancelled'

interface StatusIconProps {
  state: StatusIconState
  size?: number
  className?: string
}

export function StatusIcon({ state, size = 14, className }: StatusIconProps) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      className={cn('inline-block shrink-0', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={state}
    >
      {state === 'not-started' && (
        <circle cx="7" cy="7" r="6" stroke="var(--border-default)" strokeWidth="1.5" strokeDasharray="3 2.5" />
      )}
      {state === 'specifying' && (
        <>
          <circle cx="7" cy="7" r="6" stroke="var(--border-default)" strokeWidth="1.5" />
          <path d="M7 1 A6 6 0 0 1 13 7" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {state === 'implementing' && (
        <>
          <circle cx="7" cy="7" r="6" stroke="var(--border-default)" strokeWidth="1.5" />
          <path d="M7 1 A6 6 0 1 1 1 7" stroke="var(--blue, #2563eb)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {state === 'complete' && (
        <>
          <circle cx="7" cy="7" r="6" fill="var(--green)" />
          <path d="M4.5 7.2 L6.2 8.8 L9.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {state === 'cancelled' && (
        <>
          <circle cx="7" cy="7" r="6" stroke="var(--text-muted)" strokeWidth="1.5" />
          <path d="M5 5 L9 9 M9 5 L5 9" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
