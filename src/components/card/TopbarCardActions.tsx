'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, MoreVertical } from 'lucide-react'
import { cn } from '../../lib/cn'
import { StatusIcon } from '../StatusIcon'
import { usePortalMenu, type PropertyOption } from '../PropertyDropdown'
import { updateCard } from '../../lib/actions/cards'
import { STATUS_OPTIONS, dbStatusToIconState } from '../../lib/status'

// ─── Icons from WH-058 ──────────────────────────────────────────────────────

function PriorityIcon({ priority }: { priority: string }) {
  const colour =
    priority === 'URGENT' || priority === 'HIGH'
      ? 'var(--accent)'
      : 'currentColor'
  const opMid = priority === 'LOW' ? 0.3 : 0.6
  const opBot = priority === 'LOW' || priority === 'MEDIUM' ? 0.3 : 1
  return (
    <svg
      width="11"
      height="9"
      viewBox="0 0 12 8"
      fill="none"
      className="shrink-0"
    >
      <rect x="0" y="0" width="12" height="1.5" rx="0.75" fill={colour} />
      <rect
        x="0"
        y="3.25"
        width="8"
        height="1.5"
        rx="0.75"
        fill={colour}
        opacity={opMid}
      />
      <rect
        x="0"
        y="6.5"
        width="5"
        height="1.5"
        rx="0.75"
        fill={colour}
        opacity={opBot}
      />
    </svg>
  )
}

function AssigneeIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 20c0-4 3.58-7 8-7s8 3 8 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MiniAvatar({ initial }: { initial: string }) {
  return (
    <span
      className="w-[14px] h-[14px] rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0"
      style={{ fontSize: '7px', fontWeight: 600 }}
    >
      {initial}
    </span>
  )
}

function TeamIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

// ─── Status chip (direct dropdown) ───────────────────────────────────────────

function StatusChip({
  cardId,
  initialStatus,
}: {
  cardId: string
  initialStatus: string
}) {
  const [status, setStatus] = useState(initialStatus)
  const [, startTransition] = useTransition()
  const { open, setOpen, toggle, triggerRef, menuRef, pos } = usePortalMenu({
    align: 'right',
  })

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  const statusOptions = useMemo<PropertyOption[]>(
    () =>
      STATUS_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.label,
        icon: <StatusIcon state={dbStatusToIconState(opt.value)} />,
      })),
    [],
  )

  const currentLabel =
    STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status

  function handleChange(val: string) {
    const prev = status
    setStatus(val)
    setOpen(false)
    startTransition(async () => {
      try {
        await updateCard(cardId, { status: val })
      } catch {
        setStatus(prev)
      }
    })
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-md)]',
          'text-[12px] font-medium text-[var(--text-secondary)]',
          'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
          open && 'bg-[var(--bg-hover)]',
        )}
      >
        <StatusIcon state={dbStatusToIconState(status)} />
        {currentLabel}
        <ChevronDown
          size={11}
          className={cn(
            'text-[var(--text-faint)] transition-transform duration-100',
            open && 'rotate-180',
          )}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, right: pos.right }}
            className="z-50 min-w-[180px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] py-1"
          >
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChange(opt.value)}
                className={cn(
                  'w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer flex items-center gap-2',
                  status === opt.value
                    ? 'text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-secondary)]',
                )}
              >
                {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                {opt.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

// ─── Properties popover ──────────────────────────────────────────────────────

const PRIORITY_OPTIONS: PropertyOption[] = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

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

function PropertiesPopover({ card, users, teams }: PropertiesPopoverProps) {
  const [priority, setPriority] = useState(card.priority)
  const [teamId, setTeamId] = useState(card.team.id)
  const [assigneeId, setAssigneeId] = useState(card.assignee?.id ?? '')
  const [, startTransition] = useTransition()

  // Which property sub-dropdown is open
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    setPriority(card.priority)
  }, [card.priority])
  useEffect(() => {
    setTeamId(card.team.id)
  }, [card.team.id])
  useEffect(() => {
    setAssigneeId(card.assignee?.id ?? '')
  }, [card.assignee?.id])

  const { open, setOpen, toggle, triggerRef, menuRef, pos } = usePortalMenu({
    align: 'right',
  })

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
            {/* Priority */}
            <div className="flex items-center px-3 py-1">
              <span className="w-[76px] text-[12px] font-medium text-[var(--text-muted)] shrink-0">
                Priority
              </span>
              {editing === 'priority' ? (
                <div className="flex-1 flex flex-col">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        const prev = priority
                        setPriority(opt.value)
                        setEditing(null)
                        handleUpdate('priority', opt.value, () =>
                          setPriority(prev),
                        )
                      }}
                      className={cn(
                        'text-left px-2 py-1 text-[12px] rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer flex items-center gap-2',
                        priority === opt.value
                          ? 'text-[var(--text-primary)] font-medium'
                          : 'text-[var(--text-secondary)]',
                      )}
                    >
                      <PriorityIcon priority={opt.value} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setEditing('priority')}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] px-2 py-0.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  <PriorityIcon priority={priority} />
                  {currentPriorityLabel}
                </button>
              )}
            </div>

            {/* Assignee */}
            <div className="flex items-center px-3 py-1">
              <span className="w-[76px] text-[12px] font-medium text-[var(--text-muted)] shrink-0">
                Assignee
              </span>
              {editing === 'assignee' ? (
                <div className="flex-1 flex flex-col">
                  {[
                    { id: '', displayName: 'Unassigned' },
                    ...users,
                  ].map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        const prev = assigneeId
                        setAssigneeId(u.id)
                        setEditing(null)
                        handleUpdate('assigneeId', u.id || null, () =>
                          setAssigneeId(prev),
                        )
                      }}
                      className={cn(
                        'text-left px-2 py-1 text-[12px] rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer flex items-center gap-2',
                        assigneeId === u.id
                          ? 'text-[var(--text-primary)] font-medium'
                          : 'text-[var(--text-secondary)]',
                      )}
                    >
                      {u.id ? (
                        <MiniAvatar
                          initial={u.displayName.charAt(0).toUpperCase()}
                        />
                      ) : (
                        <AssigneeIcon />
                      )}
                      {u.displayName}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setEditing('assignee')}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] px-2 py-0.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  {assigneeId ? (
                    <MiniAvatar
                      initial={currentAssigneeName.charAt(0).toUpperCase()}
                    />
                  ) : (
                    <AssigneeIcon />
                  )}
                  {currentAssigneeName}
                </button>
              )}
            </div>

            {/* Team */}
            <div className="flex items-center px-3 py-1">
              <span className="w-[76px] text-[12px] font-medium text-[var(--text-muted)] shrink-0">
                Team
              </span>
              {editing === 'team' ? (
                <div className="flex-1 flex flex-col">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        const prev = teamId
                        setTeamId(t.id)
                        setEditing(null)
                        handleUpdate('teamId', t.id, () => setTeamId(prev))
                      }}
                      className={cn(
                        'text-left px-2 py-1 text-[12px] rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer flex items-center gap-2',
                        teamId === t.id
                          ? 'text-[var(--text-primary)] font-medium'
                          : 'text-[var(--text-secondary)]',
                      )}
                    >
                      <TeamIcon />
                      {t.name}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setEditing('team')}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] px-2 py-0.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  <TeamIcon />
                  {currentTeamName}
                </button>
              )}
            </div>

            {/* Dependencies */}
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

// ─── Combined component ──────────────────────────────────────────────────────

interface TopbarCardActionsProps {
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
  portalTarget: HTMLDivElement | null
}

export function TopbarCardActions({
  card,
  users,
  teams,
  portalTarget,
}: TopbarCardActionsProps) {
  if (!portalTarget) return null

  return createPortal(
    <>
      <StatusChip cardId={card.id} initialStatus={card.status} />
      <PropertiesPopover card={card} users={users} teams={teams} />
    </>,
    portalTarget,
  )
}
