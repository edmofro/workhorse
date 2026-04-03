'use client'

import { cn } from '../../lib/cn'

export interface ActionPill {
  label: string
  /** The message sent to the chat when clicked */
  message: string
  /** Skill identifier sent to the API alongside the message */
  skillId?: string
}

interface ActionPillsProps {
  pills: ActionPill[]
  onSelect: (pill: ActionPill) => void
  disabled?: boolean
}

export function ActionPills({ pills, onSelect, disabled }: ActionPillsProps) {
  if (pills.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <button
          key={pill.label}
          onClick={() => onSelect(pill)}
          disabled={disabled}
          className={cn(
            'px-3 py-[6px] rounded-[var(--radius-pill)] text-[12px] font-medium',
            'bg-[var(--bg-page)] border border-[var(--border-subtle)]',
            'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            'hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)]',
            'transition-colors duration-100 cursor-pointer',
            'disabled:opacity-40 disabled:cursor-default',
          )}
        >
          {pill.label}
        </button>
      ))}
    </div>
  )
}

