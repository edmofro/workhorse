import { cn } from '../lib/cn'

type TagVariant = 'core' | 'future' | 'custom'

interface TagProps {
  variant?: TagVariant
  /** Custom background colour (only used when variant is 'custom') */
  customBg?: string
  /** Custom text colour (only used when variant is 'custom') */
  customColor?: string
  children: React.ReactNode
  className?: string
}

/**
 * Tag component for labelling features and items.
 * 'core' uses amber tones, 'future' uses muted inset tones.
 */
export function Tag({
  variant = 'core',
  customBg,
  customColor,
  children,
  className,
}: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-[2px]',
        'text-[11px] font-medium leading-none',
        'rounded-[5px]',
        variant === 'core' && 'bg-[rgba(180,83,9,0.06)] text-[var(--amber)]',
        variant === 'future' && 'bg-[var(--bg-inset)] text-[var(--text-muted)]',
        className,
      )}
      style={
        variant === 'custom'
          ? { background: customBg, color: customColor }
          : undefined
      }
    >
      {children}
    </span>
  )
}
