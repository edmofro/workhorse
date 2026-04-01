import { type ReactNode } from 'react'
import { cn } from '../lib/cn'

interface IconButtonProps {
  children: ReactNode
  title: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
}

export function IconButton({
  children,
  title,
  onClick,
  disabled,
  active,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'relative p-2 rounded-[var(--radius-md)] transition-colors duration-100',
        disabled && 'text-[var(--text-faint)] cursor-default',
        !disabled && active && 'text-[var(--text-secondary)] bg-[var(--bg-hover)] cursor-pointer',
        !disabled && !active && 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer',
      )}
    >
      {children}
    </button>
  )
}
