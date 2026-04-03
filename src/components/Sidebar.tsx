'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Settings,
  LogOut,
  FileText,
  Palette,
  ChevronDown,
  Ellipsis,
  Plus,
  LayoutList,
  MessageCircle,
  X,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '../lib/cn'
import { Avatar } from './Avatar'
import { useUser } from './UserProvider'
import {
  useSidebarData,
  type SidebarData,
  type SidebarProject,
  type SidebarSession,
} from '../lib/hooks/queries'
import { useSidebarEvents } from '../lib/hooks/useSidebarEvents'
import { CreateModal } from './CreateModal'
import { usePortalMenu } from './PropertyDropdown'
import { StatusDot } from './StatusDot'
import { updateCard } from '../lib/actions/cards'
import { useState, useRef, useEffect, useCallback, useTransition } from 'react'

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Not started', dotState: 'not-started' as const },
  { value: 'SPECIFYING', label: 'Specifying', dotState: 'specifying' as const },
  { value: 'IMPLEMENTING', label: 'Implementing', dotState: 'implementing' as const },
  { value: 'COMPLETE', label: 'Complete', dotState: 'complete' as const },
  { value: 'CANCELLED', label: 'Cancelled', dotState: 'cancelled' as const },
] as const

function statusToDotState(status: string | null): 'not-started' | 'specifying' | 'implementing' | 'complete' | 'cancelled' {
  if (status === 'COMPLETE' || status === 'SPEC_COMPLETE') return 'complete'
  if (status === 'IN_PROGRESS' || status === 'SPECIFYING') return 'specifying'
  if (status === 'IMPLEMENTING') return 'implementing'
  if (status === 'CANCELLED') return 'cancelled'
  return 'not-started'
}

export type RecentSession = SidebarSession

interface SidebarProps {
  initialProjects: SidebarProject[]
  initialRecentSessions?: SidebarSession[]
}

export function Sidebar({ initialProjects, initialRecentSessions = [] }: SidebarProps) {
  const initialData = initialProjects.length > 0
    ? { projects: initialProjects, recentSessions: initialRecentSessions } as SidebarData
    : undefined
  const { data } = useSidebarData(initialData)
  const streamingSessions = useSidebarEvents()
  const projects = data?.projects ?? initialProjects
  const recentSessions = data?.recentSessions ?? initialRecentSessions
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [createModal, setCreateModal] = useState<'card' | 'chat' | null>(null)

  const firstSegment = decodeURIComponent(pathname.split('/')[1] ?? '')
  const activeProject = projects.find(
    (p) => p.name.toLowerCase() === firstSegment.toLowerCase(),
  ) ?? projects[0] ?? null
  const projectPath = activeProject
    ? `/${encodeURIComponent(activeProject.name.toLowerCase())}`
    : null

  const projectSessions = recentSessions
    .filter((s) => !activeProject || s.projectName?.toLowerCase() === activeProject.name.toLowerCase())
  const filteredSessions = projectSessions.slice(0, 5)

  const handleCloseModal = useCallback(() => setCreateModal(null), [])

  return (
    <aside
      className="flex flex-col shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)]"
      style={{ width: '216px' }}
    >
      {/* Header with project switcher */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2 px-1 mb-3">
          <div className="w-[26px] h-[26px] bg-[var(--accent)] rounded-[var(--radius-md)] flex items-center justify-center text-white text-[13px] font-bold">
            W
          </div>
          <span className="text-[15px] font-bold tracking-[-0.03em]">Workhorse</span>
        </div>

        {/* Project switcher */}
        {projects.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen(!switcherOpen)}
              className="flex items-center justify-between w-full px-2 py-2 rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
            >
              <span className="truncate">{activeProject?.name ?? 'Select project'}</span>
              <ChevronDown size={13} className="text-[var(--text-muted)] shrink-0" />
            </button>

            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] shadow-[var(--shadow-md)] z-40 py-1">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/${encodeURIComponent(project.name.toLowerCase())}`}
                      onClick={() => setSwitcherOpen(false)}
                      className={cn(
                        'block px-3 py-2 text-[13px] transition-colors duration-100',
                        project.id === activeProject?.id
                          ? 'text-[var(--text-primary)] font-medium bg-[var(--bg-hover)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                      )}
                    >
                      {project.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* Sections */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {projectPath && (
          <>
            {/* Cards link */}
            <SectionItem
              href={projectPath}
              icon={<LayoutList size={14} />}
              active={pathname === projectPath && !searchParams.has('session')}
              onAdd={() => setCreateModal('card')}
            >
              Cards
            </SectionItem>

            {/* Specs link */}
            <SectionItem
              href={`${projectPath}/specs`}
              icon={<FileText size={14} />}
              active={pathname.startsWith(`${projectPath}/specs`)}
            >
              Specs
            </SectionItem>

            <SectionItem
              href={`${projectPath}/design`}
              icon={<Palette size={14} />}
              active={pathname.startsWith(`${projectPath}/design`)}
            >
              Design
            </SectionItem>

            {/* Conversations section with recent items */}
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <SectionHeader
                icon={<MessageCircle size={14} />}
                active={pathname.startsWith(`${projectPath}/sessions/`)}
                onAdd={() => setCreateModal('chat')}
              >
                Conversations
              </SectionHeader>

              {filteredSessions.length > 0 && (
                <ConversationsList
                  sessions={projectSessions}
                  projectPath={projectPath}
                  pathname={pathname}
                  searchParams={searchParams}
                  streamingSessions={streamingSessions}
                />
              )}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <UserMenu user={user} />

      {/* Create modal */}
      {createModal && projectPath && activeProject && (
        <CreateModal
          projectSlug={projectPath}
          defaultTeamId={activeProject.teams[0]?.id}
          defaultMode={createModal}
          onClose={handleCloseModal}
        />
      )}
    </aside>
  )
}

/** A section row with icon, label (navigable), and hover action ([+]). */
function SectionItem({
  href,
  icon,
  active,
  disabled,
  onAdd,
  children,
}: {
  href: string
  icon: React.ReactNode
  active: boolean
  disabled?: boolean
  onAdd?: () => void
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <div className="group flex items-center rounded-[var(--radius-md)]">
        <span
          className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-[var(--radius-md)] text-[13px] text-[var(--text-muted)] font-[450] cursor-default"
          aria-disabled="true"
        >
          {icon}
          <span className="truncate">{children}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="group relative flex items-center rounded-[var(--radius-md)] transition-colors duration-100">
      <Link
        href={href}
        className={cn(
          'flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-[var(--radius-md)]',
          'text-[13px] cursor-pointer transition-colors duration-100',
          active
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium shadow-[var(--shadow-sm)]'
            : 'text-[var(--text-secondary)] font-[450] hover:bg-[var(--bg-hover)]',
        )}
      >
        {icon}
        <span className="truncate">{children}</span>
      </Link>
      {onAdd && (
        <button
          type="button"
          className="absolute right-1 p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-100"
          title="New"
          onClick={onAdd}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

/** A recent conversation item shown below the Conversations section. */
function ConversationItem({
  href,
  active,
  streaming,
  indicator,
  onDismiss,
  children,
}: {
  href: string
  active: boolean
  streaming?: boolean
  indicator: React.ReactNode
  onDismiss: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'group relative flex items-center rounded-[var(--radius-md)] transition-colors duration-100',
        active
          ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]'
          : 'hover:bg-[var(--bg-hover)]',
      )}
    >
      {/* Indicator sits outside the link so it can be independently interactive */}
      <div className="flex items-center shrink-0 pl-3">
        {indicator}
      </div>
      <Link
        href={href}
        className={cn(
          'flex items-center flex-1 min-w-0 pl-2 pr-3 py-1',
          'text-[12px] cursor-pointer transition-colors duration-100',
          active
            ? 'text-[var(--text-primary)] font-medium'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
        )}
      >
        <span className={cn('truncate', streaming && 'animate-pulse')}>{children}</span>
      </Link>
      <div className="absolute right-0 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-100"
        style={{ background: 'linear-gradient(to right, transparent, var(--bg-sidebar) 40%)', paddingLeft: '16px', paddingRight: '4px' }}
      >
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onDismiss() }}
          className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
          title="Dismiss"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  )
}

/** Clickable status dot for card-bound sessions — opens a status picker dropdown. */
function ClickableStatusDot({
  status,
  cardId,
  onStatusChange,
}: {
  status: string | null
  cardId: string
  onStatusChange: (cardId: string, newStatus: string) => void
}) {
  const { open, setOpen, toggle, triggerRef, menuRef, pos } = usePortalMenu()
  const dotState = statusToDotState(status)

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpen])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle() }}
        title="Change status"
        className={cn(
          'flex items-center justify-center w-5 h-5 rounded-full cursor-pointer transition-colors duration-100',
          open ? 'bg-[var(--bg-inset)]' : 'hover:bg-[var(--bg-inset)]',
        )}
      >
        <StatusDot state={dotState} />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-50 min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] py-1"
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onStatusChange(cardId, opt.value)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-[12px] flex items-center gap-2',
                'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
                status === opt.value
                  ? 'text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-secondary)]',
              )}
            >
              <StatusDot state={opt.dotState} />
              {opt.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

/** A non-navigating section header with icon, label, and hover [+] action. */
function SectionHeader({
  icon,
  active,
  onAdd,
  children,
}: {
  icon: React.ReactNode
  active: boolean
  onAdd?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="group relative flex items-center rounded-[var(--radius-md)] transition-colors duration-100">
      <span
        className={cn(
          'flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-[var(--radius-md)]',
          'text-[13px] cursor-default',
          active
            ? 'text-[var(--text-primary)] font-medium'
            : 'text-[var(--text-secondary)] font-[450]',
        )}
      >
        {icon}
        <span className="truncate">{children}</span>
      </span>
      {onAdd && (
        <button
          type="button"
          className="absolute right-1 p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-100"
          title="New"
          onClick={onAdd}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

/** Expandable list of conversation items. Shows 5 by default, expands to 100 on "older". */
function ConversationsList({
  sessions,
  projectPath,
  pathname,
  searchParams,
  streamingSessions,
}: {
  sessions: SidebarSession[]
  projectPath: string
  pathname: string
  searchParams: ReturnType<typeof useSearchParams>
  streamingSessions: Set<string>
}) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()
  const [, startTransition] = useTransition()

  const visibleSessions = sessions.filter((s) => !dismissed.has(s.id))
  const displaySessions = expanded ? visibleSessions.slice(0, 100) : visibleSessions.slice(0, 5)

  function handleDismiss(sessionId: string) {
    setDismissed((prev) => new Set([...prev, sessionId]))
    startTransition(async () => {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissedFromRecent: true }),
      })
    })
  }

  async function handleStatusChange(cardId: string, newStatus: string, sessionId: string) {
    setStatusOverrides((prev) => ({ ...prev, [sessionId]: newStatus }))
    try {
      await updateCard(cardId, { status: newStatus })
      queryClient.invalidateQueries({ queryKey: ['sidebar-data'] })
    } catch {
      console.error('Failed to update card status')
      setStatusOverrides((prev) => {
        const next = { ...prev }
        if (next[sessionId] === newStatus) delete next[sessionId]
        return next
      })
    }
  }

  return (
    <div className="ml-1">
      {displaySessions.map((session) => {
        const href = session.cardId && session.cardIdentifier && session.projectName
          ? `/${encodeURIComponent(session.projectName.toLowerCase())}/cards/${session.cardIdentifier}?session=${session.id}`
          : session.projectName
            ? `/${encodeURIComponent(session.projectName.toLowerCase())}/sessions/${session.id}`
            : '#'
        const label = session.cardTitle ?? session.title ?? 'New conversation'
        const isActive = searchParams.get('session') === session.id
          || pathname.startsWith(`${projectPath}/sessions/${session.id}`)
        const isCardBound = !!session.cardId
        const isStreaming = streamingSessions.has(session.id)
        const effectiveStatus = statusOverrides[session.id] ?? session.cardStatus

        return (
          <ConversationItem
            key={session.id}
            href={href}
            active={isActive}
            streaming={isStreaming}
            onDismiss={() => handleDismiss(session.id)}
            indicator={
              isCardBound && session.cardId
                ? <ClickableStatusDot
                    status={effectiveStatus}
                    cardId={session.cardId}
                    onStatusChange={(cardId, newStatus) =>
                      handleStatusChange(cardId, newStatus, session.id)
                    }
                  />
                : <MessageCircle size={11} className="text-[var(--text-muted)] shrink-0" />
            }
          >
            {label}
          </ConversationItem>
        )
      })}
      {visibleSessions.length > 5 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="block w-full text-left px-3 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-100 cursor-pointer"
        >
          Older
        </button>
      )}
    </div>
  )
}


function UserMenu({ user }: { user: { displayName: string; avatarUrl: string | null } }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative border-t border-[var(--border-subtle)]" ref={menuRef}>
      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] shadow-[var(--shadow-md)] z-40 py-1">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100"
          >
            <Settings size={14} />
            Settings
          </Link>
          <div className="my-1 border-t border-[var(--border-subtle)]" />
          <form action="/api/auth/sign-out" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </form>
        </div>
      )}
      <div className="flex items-center gap-2 px-4 py-[14px]">
        <Avatar variant="human" initial={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
        <span className="text-xs text-[var(--text-secondary)] truncate flex-1">
          {user.displayName}
        </span>
        <button
          onClick={() => setOpen(!open)}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-100 cursor-pointer"
        >
          <Ellipsis size={14} />
        </button>
      </div>
    </div>
  )
}

