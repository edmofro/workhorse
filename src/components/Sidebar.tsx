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
  Search,
  Plus,
  LayoutList,
  MessageCircle,
  Code2,
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
import { CreateModal } from './CreateModal'
import { useState, useRef, useEffect } from 'react'

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
  const projects = data?.projects ?? initialProjects
  const recentSessions = data?.recentSessions ?? initialRecentSessions
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [createModal, setCreateModal] = useState<{ mode: 'chat' | 'card' } | null>(null)

  const firstSegment = decodeURIComponent(pathname.split('/')[1] ?? '')
  const activeProject = projects.find(
    (p) => p.name.toLowerCase() === firstSegment.toLowerCase(),
  ) ?? projects[0] ?? null
  const projectPath = activeProject
    ? `/${encodeURIComponent(activeProject.name.toLowerCase())}`
    : null

  const filteredSessions = recentSessions
    .filter((s) => !activeProject || s.projectName?.toLowerCase() === activeProject.name.toLowerCase())
    .slice(0, 5)

  return (
    <aside
      className="flex flex-col shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)]"
      style={{ width: '216px' }}
    >
      {/* Header with project switcher */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-[10px] px-1 mb-3">
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
              className="flex items-center justify-between w-full px-2 py-[7px] rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
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
                        'block px-3 py-[6px] text-[13px] transition-colors duration-100',
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
            <SectionItem
              href={projectPath}
              icon={<LayoutList size={14} />}
              active={pathname === projectPath && !searchParams.has('session')}
              onAdd={() => setCreateModal({ mode: 'card' })}
            >
              Cards
            </SectionItem>

            <SectionItem
              href={`${projectPath}/specs`}
              icon={<FileText size={14} />}
              active={pathname.startsWith(`${projectPath}/specs`)}
              onAdd={() => {
                // TODO: quick card → spec editor flow
              }}
            >
              Specs
            </SectionItem>

            <SectionItem
              href={`${projectPath}/design`}
              icon={<Palette size={14} />}
              active={pathname.startsWith(`${projectPath}/design`)}
              onAdd={() => {
                // TODO: quick card → mockup mode flow
              }}
            >
              Design
            </SectionItem>

            <SectionItem
              href={`${projectPath}/code`}
              icon={<Code2 size={14} />}
              active={pathname.startsWith(`${projectPath}/code`)}
            >
              Code
            </SectionItem>

            {/* Conversations section with recent items */}
            <SectionItem
              href={`${projectPath}/conversations`}
              icon={<MessageCircle size={14} />}
              active={pathname.startsWith(`${projectPath}/conversations`) || pathname.includes('/sessions/')}
              onAdd={() => setCreateModal({ mode: 'chat' })}
            >
              Conversations
            </SectionItem>

            {filteredSessions.length > 0 && (
              <div className="ml-1">
                {filteredSessions.map((session) => {
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
                    || pathname.includes(`/sessions/${session.id}`)
                  const isCardBound = !!session.cardId

                  return (
                    <ConversationItem
                      key={session.id}
                      href={href}
                      active={isActive}
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
                {recentSessions.filter((s) => !activeProject || s.projectName?.toLowerCase() === activeProject.name.toLowerCase()).length > 5 && (
                  <Link
                    href={`${projectPath}/conversations`}
                    className="block px-3 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-100"
                  >
                    View all
                  </Link>
                )}
              </div>
            )}
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
          defaultMode={createModal.mode}
          onClose={() => setCreateModal(null)}
        />
      )}
    </aside>
  )
}

/** A section row with icon, label (navigable), and hover actions ([🔍] [+]). */
function SectionItem({
  href,
  icon,
  active,
  onAdd,
  children,
}: {
  href: string
  icon: React.ReactNode
  active: boolean
  onAdd?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="group flex items-center rounded-[var(--radius-md)] transition-colors duration-100">
      <Link
        href={href}
        className={cn(
          'flex items-center gap-2 flex-1 min-w-0 px-3 py-[7px] rounded-[var(--radius-md)]',
          'text-[13px] cursor-pointer transition-colors duration-100',
          active
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium shadow-[var(--shadow-sm)]'
            : 'text-[var(--text-secondary)] font-[450] hover:bg-[var(--bg-hover)]',
        )}
      >
        {icon}
        <span className="truncate">{children}</span>
        {/* Hover actions — positioned inside the link row to stay aligned */}
        <span className="ml-auto flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
          <span
            role="button"
            className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
            title="Search"
            onClick={(e) => {
              e.preventDefault()
              // TODO: scoped search
            }}
          >
            <Search size={12} />
          </span>
          {onAdd && (
            <span
              role="button"
              className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
              title="New"
              onClick={(e) => {
                e.preventDefault()
                onAdd()
              }}
            >
              <Plus size={12} />
            </span>
          )}
        </span>
      </Link>
    </div>
  )
}

/** A recent conversation item shown below the Conversations section. */
function ConversationItem({
  href,
  active,
  indicator,
  children,
}: {
  href: string
  active: boolean
  indicator: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3 py-[5px] rounded-[var(--radius-md)]',
        'text-[12px] cursor-pointer transition-colors duration-100',
        active
          ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium shadow-[var(--shadow-sm)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
      )}
    >
      {indicator}
      <span className="truncate">{children}</span>
    </Link>
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
            className="flex items-center gap-2 px-3 py-[7px] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100"
          >
            <Settings size={14} />
            Settings
          </Link>
          <div className="my-1 border-t border-[var(--border-subtle)]" />
          <form action="/api/auth/sign-out" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-3 py-[7px] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
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
