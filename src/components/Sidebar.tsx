'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Settings, LogOut, FileText, Palette, ChevronDown, Ellipsis } from 'lucide-react'
import { cn } from '../lib/cn'
import { Avatar } from './Avatar'
import { useUser } from './UserProvider'
import { useState, useRef, useEffect } from 'react'

interface SidebarProject {
  id: string
  name: string
  teams: { id: string; name: string; colour: string }[]
}

interface SidebarProps {
  projects: SidebarProject[]
}

export function Sidebar({ projects }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  // Derive active project from URL path
  const firstSegment = decodeURIComponent(pathname.split('/')[1] ?? '')
  const activeProject = projects.find(
    (p) => p.name.toLowerCase() === firstSegment.toLowerCase(),
  ) ?? projects[0] ?? null
  const activeTeamId = searchParams.get('team')

  const projectPath = activeProject
    ? `/${encodeURIComponent(activeProject.name.toLowerCase())}`
    : null

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

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {projectPath && (
          <>
            {/* Specs link */}
            <NavItem
              href={`${projectPath}/specs`}
              icon={<FileText size={14} />}
              active={pathname.startsWith(`${projectPath}/specs`)}
            >
              Specs
            </NavItem>

            {/* Design link */}
            <NavItem
              href={`${projectPath}/design`}
              icon={<Palette size={14} />}
              active={pathname.startsWith(`${projectPath}/design`)}
            >
              Design
            </NavItem>

            {/* Teams section */}
            <div className="px-2 pt-5 pb-[6px] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
              Teams
            </div>

            {activeProject?.teams.map((team) => (
              <NavItem
                key={team.id}
                href={`${projectPath}?team=${team.id}`}
                active={pathname === projectPath && activeTeamId === team.id}
                dot={team.colour}
              >
                {team.name}
              </NavItem>
            ))}

            {activeProject?.teams.length === 0 && (
              <p className="px-2 py-2 text-[11px] text-[var(--text-faint)]">
                No teams yet
              </p>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <UserMenu user={user} />
    </aside>
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
        <div className="absolute bottom-full left-2 right-2 mb-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] shadow-[var(--shadow-md)] py-1 z-40">
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

function NavItem({
  href,
  icon,
  dot,
  active,
  children,
}: {
  href: string
  icon?: React.ReactNode
  dot?: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3 py-[7px] rounded-[var(--radius-md)]',
        'text-[13px] cursor-pointer transition-colors duration-100',
        active
          ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium shadow-[var(--shadow-sm)]'
          : 'text-[var(--text-secondary)] font-[450] hover:bg-[var(--bg-hover)]',
      )}
    >
      {icon}
      {dot && (
        <span
          className="w-[8px] h-[8px] rounded-full shrink-0"
          style={{ background: dot }}
        />
      )}
      {children}
    </Link>
  )
}
