import { cn } from '../lib/cn'

type AvatarVariant = 'human' | 'ai'
type AvatarSize = 'sm' | 'chat'

interface AvatarProps {
  /** 'human' shows the initial letter with accent background; 'ai' shows "W" with inset background */
  variant: AvatarVariant
  /** 'sm' is 22px, 'chat' is 26px */
  size?: AvatarSize
  /** The initial letter to display (only used for human variant) */
  initial?: string
  className?: string
}

/**
 * Avatar component for human users and AI.
 * Human avatars display an initial letter on accent background.
 * AI avatars display "W" on the inset background.
 */
export function Avatar({
  variant,
  size = 'sm',
  initial = 'U',
  className,
}: AvatarProps) {
  const sizeValue = size === 'sm' ? '22px' : '26px'

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full',
        'text-[10px] font-semibold select-none shrink-0',
        variant === 'human' && 'bg-[var(--accent)] text-white',
        variant === 'ai' && 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
        className,
      )}
      style={{
        width: sizeValue,
        height: sizeValue,
      }}
    >
      {variant === 'ai' ? 'W' : initial.charAt(0).toUpperCase()}
    </div>
  )
}
