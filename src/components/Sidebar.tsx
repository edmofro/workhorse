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
  Search,
  LayoutList,
  MessageCircle,
} from 'lucide-react'
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
import { useState, useRef, useEffect, useCallback } from 'react'

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
            <NavRow
              href={projectPath}
              icon={<LayoutList size={14} />}
              active={pathname === projectPath && !searchParams.has('session')}
              onAdd={() => setCreateModal('card')}
            >
              Cards
            </NavRow>

            {/* Specs link */}
            <NavRow
              href={`${projectPath}/specs`}
              icon={<FileText size={14} />}
              active={pathname.startsWith(`${projectPath}/specs`)}
            >
              Specs
            </NavRow>

            <NavRow
              href={`${projectPath}/design`}
              icon={<Palette size={14} />}
              active={pathname.startsWith(`${projectPath}/design`)}
            >
              Design
            </NavRow>

            {/* Conversations section with recent items */}
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <NavRow
                icon={<MessageCircle size={14} />}
                active={pathname.startsWith(`${projectPath}/sessions/`)}
                onAdd={() => setCreateModal('chat')}
              >
                Conversations
              </NavRow>

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

/** Unified nav row — handles both navigable section items and non-navigating section headers. */
function NavRow({
  href,
  icon,
  active,
  disabled,
  onAdd,
  children,
}: {
  href?: string
  icon: React.ReactNode
  active: boolean
  disabled?: boolean
  onAdd?: () => void
  children: React.ReactNode
}) {
  const labelClass = cn(
    'flex items-center gap-2 flex-1 min-w-0 px-3 py-2 text-[13px]',
    disabled
      ? 'text-[var(--text-muted)] font-[450] cursor-default'
      : active
        ? 'text-[var(--text-primary)] font-medium'
        : href
          ? 'text-[var(--text-secondary)] font-[450] cursor-pointer'
          : 'text-[var(--text-secondary)] font-[450] cursor-default',
  )

  return (
    <div
      className={cn(
        'group flex items-center rounded-[var(--radius-md)] transition-colors duration-100',
        !disabled && (active
          ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]'
          : 'hover:bg-[var(--bg-hover)]'),
      )}
    >
      {href && !disabled ? (
        <Link href={href} className={labelClass}>
          {icon}
          <span className="truncate">{children}</span>
        </Link>
      ) : (
        <span className={labelClass} aria-disabled={disabled || undefined}>
          {icon}
          <span className="truncate">{children}</span>
        </span>
      )}
      {!disabled && onAdd && (
        <div className="flex items-center shrink-0 pr-2 gap-1">
          <button
            type="button"
            className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-100"
            title="New"
            onClick={onAdd}
          >
            <Plus size={12} />
          </button>
          <span className="p-1 text-[var(--text-muted)]" aria-hidden="true">
            <Search size={12} />
          </span>
        </div>
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
  children,
}: {
  href: string
  active: boolean
  streaming?: boolean
  indicator: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3 py-1 rounded-[var(--radius-md)]',
        'text-[12px] cursor-pointer transition-colors duration-100',
        active
          ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium shadow-[var(--shadow-sm)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
      )}
    >
      {indicator}
      <span className={cn('truncate', streaming && 'animate-pulse')}>{children}</span>
    </Link>
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
  const displaySessions = expanded ? sessions.slice(0, 100) : sessions.slice(0, 5)

  return (
    <div className="ml-1">
      {displaySessions.map((session) => {
        const href = session.cardId && session.cardIdentifier && session.projectName
          ? `/${encodeURIComponent(session.projectName.toLowerCase())}/cards/${session.cardIdentifier}?session=${session.id}`
          : session.projectName
            ? `/${encodeURIComponent(session.projectName.toLowerCase())}/sessions/${session.id}`
            : '#'
        const sessionLabel = session.title ?? session.cardTitle ?? 'New conversation'
        const label = session.cardIdentifier
          ? `${session.cardIdentifier}: ${sessionLabel}`
          : sessionLabel
        const isActive = searchParams.get('session') === session.id
          || pathname.startsWith(`${projectPath}/sessions/${session.id}`)
        const isCardBound = !!session.cardId

        const isStreaming = streamingSessions.has(session.id)

        return (
          <ConversationItem
            key={session.id}
            href={href}
            active={isActive}
            streaming={isStreaming}
            indicator={
              isCardBound
                ? <StatusDot status={session.cardStatus} />
                : <MessageCircle size={11} className="text-[var(--text-muted)] shrink-0" />
            }
          >
            {label}
          </ConversationItem>
        )
      })}
      {sessions.length > 5 && !expanded && (
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

function StatusDot({ status }: { status: string | null }) {
  if (status === 'COMPLETE' || status === 'SPEC_COMPLETE') {
    return (
      <span className="w-[8px] h-[8px] rounded-full shrink-0 bg-[var(--green)]" />
    )
  }
  if (status === 'IN_PROGRESS' || status === 'SPECIFYING') {
    return (
      <span className="w-[8px] h-[8px] rounded-full shrink-0 bg-[var(--amber)]" />
    )
  }
  // NOT_STARTED or unknown — hollow dot
  return (
    <span className="w-[8px] h-[8px] rounded-full shrink-0 border border-[var(--border-default)]" />
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

