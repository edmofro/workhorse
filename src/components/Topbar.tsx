import { type ReactNode } from 'react'

interface TopbarProps {
  children: ReactNode
}

export function Topbar({ children }: TopbarProps) {
  return (
    <header
      className="flex items-center gap-4 px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0"
      style={{ height: '52px' }}
    >
      {children}
    </header>
  )
}

export function TopbarTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[16px] font-semibold tracking-[-0.02em] leading-[1.3]">
      {children}
    </h1>
  )
}

export function TopbarCardTitle({
  title,
  identifier,
}: {
  title: string
  identifier: string
}) {
  return (
    <div className="flex items-baseline">
      <span className="text-[15px] font-semibold tracking-[-0.01em] leading-[1.3]">
        {title}
      </span>
      <span className="text-xs text-[var(--text-muted)] font-mono font-medium ml-[6px]">
        {identifier}
      </span>
    </div>
  )
}

export function TopbarRight({ children }: { children: ReactNode }) {
  return (
    <div className="ml-auto flex items-center gap-2">{children}</div>
  )
}
