import { cn } from '../lib/cn'

type AvatarVariant = 'human' | 'ai'
type AvatarSize = 'sm' | 'chat'

interface AvatarProps {
  /** 'human' shows the user's avatar or initial; 'ai' shows "W" with inset background */
  variant: AvatarVariant
  /** 'sm' is 22px, 'chat' is 26px */
  size?: AvatarSize
  /** The initial letter to display as fallback (only used for human variant) */
  initial?: string
  /** URL of the user's avatar image (only used for human variant) */
  avatarUrl?: string | null
  className?: string
}

export function Avatar({
  variant,
  size = 'sm',
  initial = 'U',
  avatarUrl,
  className,
}: AvatarProps) {
  const sizeValue = size === 'sm' ? '22px' : '26px'

  if (variant === 'human' && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={cn(
          'rounded-full shrink-0 object-cover',
          className,
        )}
        style={{
          width: sizeValue,
          height: sizeValue,
        }}
      />
    )
  }

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
