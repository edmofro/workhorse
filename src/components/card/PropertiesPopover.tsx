'use client'

import { useState, useEffect, useTransition, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import { cn } from '../../lib/cn'
import { usePortalMenu } from '../PropertyDropdown'
import { updateCard } from '../../lib/actions/cards'
import {
  PriorityIcon,
  AssigneeIcon,
  MiniAvatar,
  TeamIcon,
} from './PropertyIcons'

// ─── PropertyRow ─────────────────────────────────────────────────────────────

interface PropertyRowOption {
  value: string
  label: string
  icon: ReactNode
}

interface PropertyRowProps {
  label: string
  value: string
  options: PropertyRowOption[]
  isEditing: boolean
  onStartEditing: () => void
  onSelect: (value: string) => void
  /** Icon + label shown when collapsed */
  renderValue: ReactNode
}

function PropertyRow({
  label,
  value,
  options,
  isEditing,
  onStartEditing,
  onSelect,
  renderValue,
}: PropertyRowProps) {
  return (
    <div className="flex items-center px-3 py-1">
      <span className="w-[76px] text-[12px] font-medium text-[var(--text-muted)] shrink-0">
        {label}
      </span>
      {isEditing ? (
        <div className="flex-1 flex flex-col">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={cn(
                'text-left px-2 py-1 text-[12px] rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer flex items-center gap-2',
                value === opt.value
                  ? 'text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-secondary)]',
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={onStartEditing}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] px-2 py-0.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
        >
          {renderValue}
        </button>
      )}
    </div>
  )
}

// ─── Options ─────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

// ─── PropertiesPopover ───────────────────────────────────────────────────────

interface PropertiesPopoverProps {
  card: {
    id: string
    priority: string
    team: { id: string; name: string }
    assignee: { id: string; displayName: string } | null
    dependsOn: { identifier: string; title: string }[]
  }
  users: { id: string; displayName: string }[]
  teams: { id: string; name: string }[]
}

export function PropertiesPopover({
  card,
  users,
  teams,
}: PropertiesPopoverProps) {
  const [priority, setPriority] = useState(card.priority)
  const [teamId, setTeamId] = useState(card.team.id)
  const [assigneeId, setAssigneeId] = useState(card.assignee?.id ?? '')
  const [, startTransition] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)

  const { open, toggle, triggerRef, menuRef, pos } = usePortalMenu({
    align: 'right',
  })

  useEffect(() => {
    setPriority(card.priority)
  }, [card.priority])
  useEffect(() => {
    setTeamId(card.team.id)
  }, [card.team.id])
  useEffect(() => {
    setAssigneeId(card.assignee?.id ?? '')
  }, [card.assignee?.id])
  useEffect(() => {
    if (!open) setEditing(null)
  }, [open])

  const currentPriorityLabel =
    PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? priority
  const currentTeamName =
    teams.find((t) => t.id === teamId)?.name ?? card.team.name
  const currentAssigneeName =
    users.find((u) => u.id === assigneeId)?.displayName ?? 'Unassigned'

  function handleUpdate(
    field: string,
    value: unknown,
    rollback: () => void,
  ) {
    startTransition(async () => {
      try {
        await updateCard(card.id, { [field]: value })
      } catch {
        rollback()
      }
    })
  }

  const priorityOptions: PropertyRowOption[] = PRIORITY_OPTIONS.map((o) => ({
    ...o,
    icon: <PriorityIcon priority={o.value} />,
  }))

  const assigneeOptions: PropertyRowOption[] = [
    { value: '', label: 'Unassigned', icon: <AssigneeIcon /> },
    ...users.map((u) => ({
      value: u.id,
      label: u.displayName,
      icon: <MiniAvatar initial={u.displayName.charAt(0).toUpperCase()} />,
    })),
  ]

  const teamOptions: PropertyRowOption[] = teams.map((t) => ({
    value: t.id,
    label: t.name,
    icon: <TeamIcon />,
  }))

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        className={cn(
          'inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)]',
          'text-[var(--text-muted)]',
          'hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
          open && 'bg-[var(--bg-hover)] text-[var(--text-primary)]',
        )}
        title="Card properties"
      >
        <MoreVertical size={15} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, right: pos.right }}
            className="z-50 w-[260px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] py-2"
          >
            <PropertyRow
              label="Priority"
              value={priority}
              options={priorityOptions}
              isEditing={editing === 'priority'}
              onStartEditing={() => setEditing('priority')}
              onSelect={(val) => {
                const prev = priority
                setPriority(val)
                setEditing(null)
                handleUpdate('priority', val, () => setPriority(prev))
              }}
              renderValue={
                <>
                  <PriorityIcon priority={priority} />
                  {currentPriorityLabel}
                </>
              }
            />
            <PropertyRow
              label="Assignee"
              value={assigneeId}
              options={assigneeOptions}
              isEditing={editing === 'assignee'}
              onStartEditing={() => setEditing('assignee')}
              onSelect={(val) => {
                const prev = assigneeId
                setAssigneeId(val)
                setEditing(null)
                handleUpdate('assigneeId', val || null, () =>
                  setAssigneeId(prev),
                )
              }}
              renderValue={
                <>
                  {assigneeId ? (
                    <MiniAvatar
                      initial={currentAssigneeName.charAt(0).toUpperCase()}
                    />
                  ) : (
                    <AssigneeIcon />
                  )}
                  {currentAssigneeName}
                </>
              }
            />
            <PropertyRow
              label="Team"
              value={teamId}
              options={teamOptions}
              isEditing={editing === 'team'}
              onStartEditing={() => setEditing('team')}
              onSelect={(val) => {
                const prev = teamId
                setTeamId(val)
                setEditing(null)
                handleUpdate('teamId', val, () => setTeamId(prev))
              }}
              renderValue={
                <>
                  <TeamIcon />
                  {currentTeamName}
                </>
              }
            />

            {card.dependsOn.length > 0 && (
              <>
                <div className="h-px bg-[var(--border-subtle)] my-2" />
                <div className="px-3 py-1">
                  <span className="text-[12px] font-medium text-[var(--text-muted)]">
                    Depends on
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {card.dependsOn.map((dep) => (
                      <span
                        key={dep.identifier}
                        className="inline-flex items-center px-2 py-0.5 bg-[var(--bg-inset)] rounded-[var(--radius-sm)] text-[11px] font-medium font-mono text-[var(--text-muted)]"
                        title={dep.title}
                      >
                        {dep.identifier}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
