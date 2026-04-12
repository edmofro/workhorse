'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ChatMessage } from './ChatMessage'
import type { SessionMessage } from '../../lib/hooks/useAgentSession'

interface CollapsedTurnsProps {
  messages: SessionMessage[]
}

/**
 * Renders a group of interim assistant messages as a collapsed summary.
 * On click, expands to show the full interim messages.
 */
export function CollapsedTurns({ messages }: CollapsedTurnsProps) {
  const [expanded, setExpanded] = useState(false)

  if (messages.length === 0) return null

  const stepCount = messages.length
  const summary = stepCount === 1
    ? 'Worked through 1 step'
    : `Worked through ${stepCount} steps`

  return (
    <div className="my-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5',
          'text-[12px] font-[450] text-[var(--text-muted)]',
          'rounded-[var(--radius-default)]',
          'hover:bg-[var(--bg-hover)] transition-colors duration-100',
          'cursor-pointer select-none',
        )}
      >
        <ChevronRight
          size={12}
          className={cn(
            'transition-transform duration-100 shrink-0',
            expanded && 'rotate-90',
          )}
        />
        {summary}
      </button>
      {expanded && (
        <div className="mt-1 pl-4 border-l border-[var(--border-subtle)]">
          {messages.map((msg) => (
            <div key={msg.id} className="opacity-70">
              <ChatMessage
                role={msg.role}
                content={msg.content}
                userName={msg.userName}
                timestamp={msg.createdAt}
                attachments={msg.attachments}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
