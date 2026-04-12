'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X, CalendarPlus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { StatusDot } from '../StatusDot'
import { PropertyDropdown, usePortalMenu, type PropertyOption } from '../PropertyDropdown'
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

// ─── Card Properties ─────────────────────────────────────────────────────────

interface CardPropertiesProps {
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
}

function CardProperties({ card, users, teams }: CardPropertiesProps) {
  const [status, setStatus] = useState(card.status)
  const [priority, setPriority] = useState(card.priority)
  const [teamId, setTeamId] = useState(card.team.id)
  const [assigneeId, setAssigneeId] = useState(card.assignee?.id ?? '')
  const [, startTransition] = useTransition()

  useEffect(() => { setStatus(card.status) }, [card.status])
  useEffect(() => { setPriority(card.priority) }, [card.priority])
  useEffect(() => { setTeamId(card.team.id) }, [card.team.id])
  useEffect(() => { setAssigneeId(card.assignee?.id ?? '') }, [card.assignee?.id])

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

  function handleUpdate(field: string, value: unknown, rollback: () => void) {
    startTransition(async () => {
      try {
        await updateCard(card.id, { [field]: value })
      } catch {
        rollback()
      }
    })
  }

  return (
    <div className="flex items-center gap-0 flex-1 min-w-0">
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
          const prev = status
          setStatus(val)
          handleUpdate('status', val, () => setStatus(prev))
        }}
      />

      <PropertyDropdown
        trigger={currentPriorityLabel}
        options={PRIORITY_OPTIONS}
        value={priority}
        onChange={(val) => {
          const prev = priority
          setPriority(val)
          handleUpdate('priority', val, () => setPriority(prev))
        }}
      />

      <PropertyDropdown
        trigger={currentTeamName}
        options={teamOptions}
        value={teamId}
        onChange={(val) => {
          const prev = teamId
          setTeamId(val)
          handleUpdate('teamId', val, () => setTeamId(prev))
        }}
      />

      <PropertyDropdown
        trigger={currentAssigneeName}
        options={assigneeOptions}
        value={assigneeId}
        onChange={(val) => {
          const prev = assigneeId
          setAssigneeId(val)
          handleUpdate('assigneeId', val || null, () => setAssigneeId(prev))
        }}
      />

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
  )
}

// ─── Journey Section ─────────────────────────────────────────────────────────

interface JourneySectionProps {
  journalEntries: JournalEntryData[]
  scheduledSteps: ScheduledStepData[]
  suggestions: PillSuggestion[]
  activeStep: string | null
  onTriggerSkill: (skillId: string, label: string) => void
  onScheduleStep: (skillId: string, label: string) => void
  onUnscheduleStep: (stepId: string) => void
}

function JourneySection({
  journalEntries,
  scheduledSteps,
  suggestions,
  activeStep,
  onTriggerSkill,
  onScheduleStep,
  onUnscheduleStep,
}: JourneySectionProps) {
  const { open, setOpen, toggle, triggerRef, menuRef, pos } = usePortalMenu({ align: 'right' })

  return (
    <>
      <div className="w-px h-4 bg-[var(--border-default)] mx-1 shrink-0" />

      <button
        ref={triggerRef}
        onClick={toggle}
        className={cn(
          'inline-flex items-center gap-2 px-2 py-1 rounded-[var(--radius-md)]',
          'text-[12px] font-medium',
          'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer shrink-0',
          activeStep ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
          open && 'bg-[var(--bg-hover)]',
        )}
      >
        <div className="flex items-center gap-1">
          {journalEntries.map((_, i) => (
            <span
              key={`done-${i}`}
              className="w-2 h-2 rounded-full bg-[var(--green)] shrink-0"
            />
          ))}
          {activeStep && (
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
          )}
          {scheduledSteps.map((_, i) => (
            <span
              key={`sched-${i}`}
              className="w-2 h-2 rounded-full border border-[var(--border-default)] shrink-0"
            />
          ))}
          {suggestions.map((_, i) => (
            <span
              key={`sug-${i}`}
              className="w-2 h-2 rounded-full border border-dashed border-[var(--text-faint)] shrink-0"
            />
          ))}
        </div>

        {activeStep && (
          <span className="animate-pulse">{skillLabel(activeStep)}</span>
        )}

        <ChevronDown
          size={11}
          className={cn(
            'text-[var(--text-faint)] transition-transform duration-100',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
          className="z-50 min-w-[240px] max-w-[320px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] py-2"
        >
          {journalEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 px-3 py-1 text-[12px] text-[var(--text-secondary)]"
            >
              <span className="w-4 flex justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
              </span>
              <span className="flex-1 truncate">{entry.summary}</span>
              <span className="text-[11px] text-[var(--text-faint)] shrink-0">{formatDate(entry.createdAt)}</span>
            </div>
          ))}

          {activeStep && (
            <div className="flex items-center gap-2 px-3 py-1 text-[12px] text-[var(--text-primary)] font-medium">
              <span className="w-4 flex justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              </span>
              <span className="flex-1">{skillLabel(activeStep)}</span>
              <span className="text-[11px] text-[var(--text-muted)] shrink-0">In progress</span>
            </div>
          )}

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
                    <span className="w-2 h-2 rounded-full border border-[var(--border-default)]" />
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
                    <span className="w-2 h-2 rounded-full border border-dashed border-[var(--text-faint)]" />
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onTriggerSkill(suggestion.skillId, suggestion.label)
                      setOpen(false)
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
  )
}

// ─── Properties Bar ──────────────────────────────────────────────────────────

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
  const hasJourney = journalEntries.length > 0 || activeStep !== null

  return (
    <div className="flex items-center h-8 px-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <CardProperties card={card} users={users} teams={teams} />

      {hasJourney && (
        <JourneySection
          journalEntries={journalEntries}
          scheduledSteps={scheduledSteps}
          suggestions={suggestions}
          activeStep={activeStep}
          onTriggerSkill={onTriggerSkill}
          onScheduleStep={onScheduleStep}
          onUnscheduleStep={onUnscheduleStep}
        />
      )}
    </div>
  )
}
