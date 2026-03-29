'use client'

import { cn } from '../../lib/cn'

export interface ActionPill {
  label: string
  /** The message sent to the chat when clicked */
  message: string
  /** Mode identifier sent to the API alongside the message */
  mode?: string
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

/** Returns the appropriate pills based on card status and conversation state */
export function getPillsForContext(
  status: string,
  hasMessages: boolean,
  view: 'card' | 'chat' | 'artifact' | 'spec' | 'mockup',
): ActionPill[] {
  if (view === 'artifact' || view === 'spec') {
    return [
      { label: 'Review this spec', message: 'Review this spec', mode: 'review' },
      { label: 'Make changes', message: 'Make changes to the spec', mode: 'directed' },
    ]
  }

  if (view === 'mockup') {
    return []
  }

  if (status === 'NOT_STARTED') {
    return [
      { label: 'Interview me', message: 'Interview me on this card', mode: 'interview' },
      { label: 'Draft a spec', message: 'Draft a spec from the card description', mode: 'draft' },
    ]
  }

  if (status === 'SPECIFYING') {
    if (!hasMessages) {
      return [
        { label: 'Where were we up to?', message: 'Where were we up to? Summarise what we have so far and what remains.', mode: 'interview' },
        { label: 'Continue interview', message: 'Continue the spec interview', mode: 'interview' },
        { label: 'Review specs', message: 'Review the current specs', mode: 'review' },
      ]
    }
    return [
      { label: 'Interview me', message: 'Switch to interview mode — ask me probing questions', mode: 'interview' },
      { label: 'Review specs', message: 'Review the current specs for gaps and contradictions', mode: 'review' },
      { label: 'Make changes', message: 'Make specific changes to the specs', mode: 'directed' },
    ]
  }

  if (status === 'IMPLEMENTING') {
    if (!hasMessages) {
      return [
        { label: 'Start implementing', message: 'Start implementing from the specs', mode: 'implement' },
        { label: 'Design audit', message: 'Audit the implementation against the design system', mode: 'design_audit' },
        { label: 'Security audit', message: 'Audit the implementation for security concerns', mode: 'security_audit' },
      ]
    }
    return [
      { label: 'Design audit', message: 'Audit the implementation against the design system', mode: 'design_audit' },
      { label: 'Security audit', message: 'Audit the implementation for security concerns', mode: 'security_audit' },
    ]
  }

  return []
}
