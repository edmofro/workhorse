'use client'

import { useState, useEffect, useRef, useMemo, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X, CalendarPlus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { StatusDot } from '../StatusDot'
import { PropertyDropdown, type PropertyOption } from '../PropertyDropdown'
import { updateCard } from '../../lib/actions/cards'
import { STATUS_OPTIONS } from '../../lib/status'
import { BUILT_IN_SKILLS } from '../../lib/skills/registry'
import type { JournalEntryData, ScheduledStepData, PillSuggestion } from '../../lib/hooks/useJockeyState'

type StatusDotState = 'not-started' | 'specifying' | 'implementing' | 'complete' | 'cancelled'

function statusToDotState(status: string): StatusDotState {
  switch (status) {
    case 'NOT_STARTED': return 'not-started'
    case 'SPECIFYING': return 'specifying'
    case 'IMPLEMENTING': return 'implementing'
    case 'COMPLETE': return 'complete'
    case 'CANCELLED': return 'cancelled'
    default: return 'not-started'
  }
}

const PRIORITY_OPTIONS: PropertyOption[] = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.toLocaleString('en-AU', { month: 'short' })
  return `${day} ${month}`
}

function skillLabel(skillId: string): string {
  return BUILT_IN_SKILLS[skillId]?.label ?? skillId
}

interface PropertiesBarProps {
  card: {
    id: string
    status: string
    priority: string
    team: { id: string; name: string }
    assignee: { id: string; displayName: string } | null
    dependsOn: { identifier: string; title: string }[]
  }
  users: { id: string; displayName: string }[]
  teams: { id: string; name: string }[]
  journalEntries: JournalEntryData[]
  scheduledSteps: ScheduledStepData[]
  suggestions: PillSuggestion[]
  activeStep: string | null
  onTriggerSkill: (skillId: string, label: string) => void
  onScheduleStep: (skillId: string, label: string) => void
  onUnscheduleStep: (stepId: string) => void
}

export function PropertiesBar({
  card,
  users,
  teams,
  journalEntries,
  scheduledSteps,
  suggestions,
  activeStep,
  onTriggerSkill,
  onScheduleStep,
  onUnscheduleStep,
}: PropertiesBarProps) {
  const [status, setStatus] = useState(card.status)
  const [priority, setPriority] = useState(card.priority)
  const [teamId, setTeamId] = useState(card.team.id)
  const [assigneeId, setAssigneeId] = useState(card.assignee?.id ?? '')
  const [, startTransition] = useTransition()

  // Journey dropdown state
  const [journeyOpen, setJourneyOpen] = useState(false)
  const journeyTriggerRef = useRef<HTMLButtonElement>(null)
  const journeyMenuRef = useRef<HTMLDivElement>(null)
  const [journeyPos, setJourneyPos] = useState<{ top: number; right: number } | null>(null)

  const statusOptions = useMemo<PropertyOption[]>(() => (
    STATUS_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
      icon: <StatusDot state={statusToDotState(opt.value)} />,
    }))
  ), [])

  const teamOptions = useMemo<PropertyOption[]>(() => (
    teams.map((t) => ({ value: t.id, label: t.name }))
  ), [teams])

  const assigneeOptions = useMemo<PropertyOption[]>(() => ([
    { value: '', label: 'Unassigned' },
    ...users.map((u) => ({ value: u.id, label: u.displayName })),
  ]), [users])

  const currentStatusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  const currentPriorityLabel = PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? priority
  const currentTeamName = teams.find((t) => t.id === teamId)?.name ?? card.team.name
  const currentAssigneeName = users.find((u) => u.id === assigneeId)?.displayName ?? 'Unassigned'

  function handleUpdate(data: Record<string, unknown>) {
    startTransition(async () => {
      await updateCard(card.id, data)
    })
  }

  // Journey dropdown close on click-outside / Escape
  useEffect(() => {
    if (!journeyOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (
        journeyMenuRef.current && !journeyMenuRef.current.contains(e.target as Node) &&
        journeyTriggerRef.current && !journeyTriggerRef.current.contains(e.target as Node)
      ) {
        setJourneyOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setJourneyOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [journeyOpen])

  function toggleJourney() {
    if (journeyOpen) {
      setJourneyOpen(false)
      return
    }
    if (!journeyTriggerRef.current) return
    const rect = journeyTriggerRef.current.getBoundingClientRect()
    setJourneyPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setJourneyOpen(true)
  }

  const hasJourney = journalEntries.length > 0 || activeStep !== null

  return (
    <div className="flex items-center h-9 px-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      {/* Properties section */}
      <div className="flex items-center gap-0 flex-1 min-w-0">
        {/* Status */}
        <PropertyDropdown
          trigger={
            <>
              <StatusDot state={statusToDotState(status)} />
              {currentStatusLabel}
            </>
          }
          options={statusOptions}
          value={status}
          onChange={(val) => {
            setStatus(val)
            handleUpdate({ status: val })
          }}
        />

        {/* Priority */}
        <PropertyDropdown
          trigger={currentPriorityLabel}
          options={PRIORITY_OPTIONS}
          value={priority}
          onChange={(val) => {
            setPriority(val)
            handleUpdate({ priority: val })
          }}
        />

        {/* Team */}
        <PropertyDropdown
          trigger={currentTeamName}
          options={teamOptions}
          value={teamId}
          onChange={(val) => {
            setTeamId(val)
            handleUpdate({ teamId: val })
          }}
        />

        {/* Assignee */}
        <PropertyDropdown
          trigger={currentAssigneeName}
          options={assigneeOptions}
          value={assigneeId}
          onChange={(val) => {
            setAssigneeId(val)
            handleUpdate({ assigneeId: val || null })
          }}
        />

        {/* Dependencies — read-only */}
        {card.dependsOn.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1">
            {card.dependsOn.map((dep) => (
              <span
                key={dep.identifier}
                className="text-[11px] font-medium font-mono text-[var(--text-muted)]"
                title={dep.title}
              >
                {dep.identifier}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Journey section — only shown when there's activity */}
      {hasJourney && (
        <>
          {/* Divider */}
          <div className="w-px h-4 bg-[var(--border-default)] mx-1 shrink-0" />

          {/* Journey pill */}
          <button
            ref={journeyTriggerRef}
            onClick={toggleJourney}
            className={cn(
              'inline-flex items-center gap-2 px-2 py-1 rounded-[var(--radius-md)]',
              'text-[12px] font-medium',
              'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer shrink-0',
              activeStep ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
              journeyOpen && 'bg-[var(--bg-hover)]',
            )}
          >
            {/* Progress dots */}
            <div className="flex items-center gap-1">
              {journalEntries.map((_, i) => (
                <span
                  key={`done-${i}`}
                  className="w-[6px] h-[6px] rounded-full bg-[var(--green)] shrink-0"
                />
              ))}
              {activeStep && (
                <span className="w-[6px] h-[6px] rounded-full bg-[var(--accent)] shrink-0" />
              )}
              {scheduledSteps.map((_, i) => (
                <span
                  key={`sched-${i}`}
                  className="w-[6px] h-[6px] rounded-full border border-[var(--border-default)] shrink-0"
                />
              ))}
              {suggestions.map((_, i) => (
                <span
                  key={`sug-${i}`}
                  className="w-[6px] h-[6px] rounded-full border border-dashed border-[var(--text-faint)] shrink-0"
                />
              ))}
            </div>

            {/* Active step label */}
            {activeStep && (
              <span className="animate-pulse">{skillLabel(activeStep)}</span>
            )}

            {/* Chevron */}
            <ChevronDown
              size={11}
              className={cn(
                'text-[var(--text-faint)] transition-transform duration-100',
                journeyOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Journey dropdown */}
          {journeyOpen && journeyPos && createPortal(
            <div
              ref={journeyMenuRef}
              style={{ position: 'fixed', top: journeyPos.top, right: journeyPos.right }}
              className="z-50 min-w-[240px] max-w-[320px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] py-2"
            >
              {/* Completed entries */}
              {journalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 px-3 py-1 text-[12px] text-[var(--text-secondary)]"
                >
                  <span className="w-4 flex justify-center shrink-0">
                    <span className="w-[6px] h-[6px] rounded-full bg-[var(--green)]" />
                  </span>
                  <span className="flex-1 truncate">{entry.summary}</span>
                  <span className="text-[11px] text-[var(--text-faint)] shrink-0">{formatDate(entry.createdAt)}</span>
                </div>
              ))}

              {/* Active step */}
              {activeStep && (
                <div className="flex items-center gap-2 px-3 py-1 text-[12px] text-[var(--text-primary)] font-medium">
                  <span className="w-4 flex justify-center shrink-0">
                    <span className="w-[6px] h-[6px] rounded-full bg-[var(--accent)]" />
                  </span>
                  <span className="flex-1">{skillLabel(activeStep)}</span>
                  <span className="text-[11px] text-[var(--text-muted)] shrink-0">In progress</span>
                </div>
              )}

              {/* Scheduled */}
              {scheduledSteps.length > 0 && (
                <>
                  <div className="h-px bg-[var(--border-subtle)] my-2" />
                  <div className="px-3 pt-1 pb-[2px] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                    Scheduled
                  </div>
                  {scheduledSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 px-3 py-1 text-[12px] text-[var(--text-secondary)] group"
                    >
                      <span className="w-4 flex justify-center shrink-0">
                        <span className="w-[6px] h-[6px] rounded-full border border-[var(--border-default)]" />
                      </span>
                      <span className="flex-1">{skillLabel(step.skillId)}</span>
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
                </>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <>
                  <div className="h-px bg-[var(--border-subtle)] my-2" />
                  <div className="px-3 pt-1 pb-[2px] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                    Suggestions
                  </div>
                  {suggestions.map((suggestion, i) => (
                    <div
                      key={`${suggestion.skillId}-${i}`}
                      className="flex items-center gap-2 px-3 py-1 text-[12px] text-[var(--text-muted)] group"
                    >
                      <span className="w-4 flex justify-center shrink-0">
                        <span className="w-[6px] h-[6px] rounded-full border border-dashed border-[var(--text-faint)]" />
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onTriggerSkill(suggestion.skillId, suggestion.label)
                          setJourneyOpen(false)
                        }}
                        className="text-left hover:text-[var(--text-secondary)] transition-colors duration-100 cursor-pointer flex-1"
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
                </>
              )}
            </div>,
            document.body,
          )}
        </>
      )}
    </div>
  )
}
