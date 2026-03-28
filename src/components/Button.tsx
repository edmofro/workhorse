import { type ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'default' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

/**
 * Button component with primary and secondary variants.
 * Follows the Workhorse design guide exactly.
 */
export function Button({
  variant = 'primary',
  size = 'default',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Shared base styles
        'inline-flex items-center justify-center gap-[6px] cursor-pointer',
        'font-medium text-xs leading-none',
        'transition-colors duration-100',
        'rounded-[var(--radius-default)]',
        // Size variants
        size === 'default' && 'px-[14px] py-[7px]',
        size === 'sm' && 'px-[10px] py-[5px]',
        // Primary variant
        variant === 'primary' && [
          'bg-[var(--accent)] text-white border-none',
          'hover:bg-[var(--accent-hover)]',
        ],
        // Secondary variant
        variant === 'secondary' && [
          'bg-[var(--bg-surface)] text-[var(--text-secondary)]',
          'border border-[var(--border-default)]',
          'shadow-[var(--shadow-sm)]',
          'hover:bg-[var(--bg-hover)]',
        ],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
