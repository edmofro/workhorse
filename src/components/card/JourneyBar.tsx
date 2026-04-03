'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { ChevronDown, X, CalendarPlus } from 'lucide-react'
import { BUILT_IN_SKILLS } from '../../lib/skills/registry'
import type { JournalEntryData, ScheduledStepData, PillSuggestion } from '../../lib/hooks/useJockeyState'

interface JourneyBarProps {
  journalEntries: JournalEntryData[]
  scheduledSteps: ScheduledStepData[]
  suggestions: PillSuggestion[]
  activeStep: string | null
  onTriggerSkill: (skillId: string, label: string) => void
  onScheduleStep: (skillId: string, label: string) => void
  onUnscheduleStep: (stepId: string) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.toLocaleString('en-AU', { month: 'short' })
  return `${day} ${month}`
}

function skillLabel(skillId: string): string {
  return BUILT_IN_SKILLS[skillId]?.label ?? skillId
}

export function JourneyBar({
  journalEntries,
  scheduledSteps,
  suggestions,
  activeStep,
  onTriggerSkill,
  onScheduleStep,
  onUnscheduleStep,
}: JourneyBarProps) {
  const [expanded, setExpanded] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape or click outside
  useEffect(() => {
    if (!expanded) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setExpanded(false)
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    // Use mousedown instead of click — fires before the click event completes,
    // and avoids needing setTimeout to dodge the expand button's own click.
    window.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expanded])

  const isEmpty = journalEntries.length === 0 && !activeStep

  const completedCount = journalEntries.length
  const scheduledCount = scheduledSteps.length
  const suggestedCount = suggestions.length

  // Always render the container to prevent layout shift.
  // When empty, render a zero-height placeholder with the border.
  if (isEmpty) {
    return <div className="border-b border-[var(--border-subtle)]" />
  }

  return (
    <div className="relative">
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-2 px-4 py-2',
          'bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]',
          'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
          'text-[12px]',
        )}
      >
        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {/* Completed dots */}
          {Array.from({ length: completedCount }).map((_, i) => (
            <span key={`c-${i}`} className="text-[var(--green)] text-[10px]">✓</span>
          ))}
          {/* Active dot */}
          {activeStep && (
            <span className="text-[var(--accent)] text-[10px]">●</span>
          )}
          {/* Scheduled dots — solid outline */}
          {Array.from({ length: scheduledCount }).map((_, i) => (
            <span key={`s-${i}`} className="text-[var(--text-muted)] text-[10px]">○</span>
          ))}
          {/* Suggested dots — hollow/faint */}
          {Array.from({ length: suggestedCount }).map((_, i) => (
            <span key={`g-${i}`} className="text-[var(--text-faint)] text-[10px]">◌</span>
          ))}
        </div>

        {/* Current step label */}
        {activeStep && (
          <span className="text-[var(--text-secondary)] font-medium">
            {skillLabel(activeStep)}
          </span>
        )}

        <ChevronDown
          size={12}
          className={cn(
            'text-[var(--text-muted)] transition-transform duration-150',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {/* Expanded overlay */}
      {expanded && (
        <div
          ref={overlayRef}
          className={cn(
            'absolute top-full left-0 right-0 z-30',
            'bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]',
            'shadow-[var(--shadow-lg)]',
            'py-3 px-4',
          )}
        >
          <div className="max-w-[520px]">
            {/* Completed entries */}
            {journalEntries.length > 0 && (
              <div className="space-y-1 mb-3">
                {journalEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-baseline gap-2 py-1 text-[12px]"
                  >
                    <span className="text-[var(--green)] text-[10px] w-4 text-center shrink-0 relative top-[-1px]">✓</span>
                    <span className="text-[var(--text-secondary)]">{entry.summary}</span>
                    <span className="text-[var(--text-faint)] text-[11px] shrink-0">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Active step */}
            {activeStep && (
              <div className="flex items-baseline gap-2 py-1 text-[12px] mb-3">
                <span className="text-[var(--accent)] text-[10px] w-4 text-center shrink-0 relative top-[-1px]">●</span>
                <span className="text-[var(--text-primary)] font-medium">{skillLabel(activeStep)}</span>
                <span className="text-[var(--text-muted)] text-[11px] shrink-0">In progress</span>
              </div>
            )}

            {/* Scheduled section */}
            {scheduledSteps.length > 0 && (
              <div className="mb-3">
                <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">
                  Scheduled
                </div>
                <div className="space-y-1">
                  {scheduledSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 py-1 text-[12px] group"
                    >
                      <span className="text-[var(--text-muted)] text-[10px] w-4 text-center shrink-0">○</span>
                      <span className="text-[var(--text-secondary)]">{skillLabel(step.skillId)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onUnscheduleStep(step.id)
                        }}
                        className="p-1 rounded text-[var(--text-faint)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-muted)] transition-all duration-100 cursor-pointer"
                        title="Remove from schedule"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions section */}
            {suggestions.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">
                  Suggestions
                </div>
                <div className="space-y-1">
                  {suggestions.map((suggestion, i) => (
                    <div
                      key={`${suggestion.skillId}-${i}`}
                      className="flex items-center gap-2 py-1 text-[12px] group"
                    >
                      <span className="text-[var(--text-faint)] text-[10px] w-4 text-center shrink-0">◌</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onTriggerSkill(suggestion.skillId, suggestion.label)
                          setExpanded(false)
                        }}
                        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-100 cursor-pointer text-left"
                      >
                        {suggestion.label}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onScheduleStep(suggestion.skillId, suggestion.label)
                        }}
                        className="p-1 rounded text-[var(--text-faint)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-muted)] transition-all duration-100 cursor-pointer"
                        title="Schedule this step"
                      >
                        <CalendarPlus size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
