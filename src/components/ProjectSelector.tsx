'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search } from 'lucide-react'

interface Project {
  id: string
  name: string
  colour: string
}

interface ProjectSelectorProps {
  projects: Project[]
  selectedProjectId: string | null
  onSelect: (projectId: string | null) => void
}

const MAX_RECENT = 3
const RECENT_KEY = 'workhorse:recent-projects'

function getRecentIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

function pushRecent(id: string) {
  const ids = getRecentIds().filter((x) => x !== id)
  ids.unshift(id)
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 10)))
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelect,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const label = selectedProject?.name ?? 'All projects'

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Autofocus search on open
  useEffect(() => {
    if (open) {
      setQuery('')
      // Small delay to let the dropdown render
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const recentIds = useMemo(() => getRecentIds(), [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const recentProjects = useMemo(
    () =>
      recentIds
        .map((id) => projects.find((p) => p.id === id))
        .filter((p): p is Project => p != null)
        .slice(0, MAX_RECENT),
    [recentIds, projects],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return projects
    const q = query.toLowerCase()
    return projects.filter((p) => p.name.toLowerCase().includes(q))
  }, [projects, query])

  function handleSelect(projectId: string | null) {
    if (projectId) pushRecent(projectId)
    onSelect(projectId)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
      >
        {selectedProject && (
          <span
            className="w-[7px] h-[7px] rounded-full shrink-0"
            style={{ backgroundColor: selectedProject.colour }}
          />
        )}
        <span className="truncate max-w-[160px]">{label}</span>
        <ChevronDown size={12} className="shrink-0 text-[var(--text-muted)]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-[220px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] shadow-[var(--shadow-lg)] z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--bg-page)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
              <Search size={12} className="shrink-0 text-[var(--text-muted)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find project..."
                className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-[var(--text-faint)]"
              />
            </div>
          </div>

          <div className="max-h-[280px] overflow-y-auto py-1">
            {/* All projects option */}
            <button
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left cursor-pointer transition-colors duration-100 hover:bg-[var(--bg-hover)] ${
                !selectedProjectId
                  ? 'text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              All projects
            </button>

            {/* Recently viewed */}
            {!query.trim() && recentProjects.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                    Recent
                  </span>
                </div>
                {recentProjects.map((project) => (
                  <ProjectOption
                    key={`recent-${project.id}`}
                    project={project}
                    isSelected={project.id === selectedProjectId}
                    onSelect={handleSelect}
                  />
                ))}
              </>
            )}

            {/* Full list */}
            {!query.trim() && projects.length > 0 && (
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                  All
                </span>
              </div>
            )}
            {filtered.map((project) => (
              <ProjectOption
                key={project.id}
                project={project}
                isSelected={project.id === selectedProjectId}
                onSelect={handleSelect}
              />
            ))}

            {query.trim() && filtered.length === 0 && (
              <div className="px-3 py-3 text-[12px] text-[var(--text-muted)] text-center">
                No projects found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectOption({
  project,
  isSelected,
  onSelect,
}: {
  project: Project
  isSelected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(project.id)}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left cursor-pointer transition-colors duration-100 hover:bg-[var(--bg-hover)] ${
        isSelected
          ? 'text-[var(--text-primary)] font-medium'
          : 'text-[var(--text-secondary)]'
      }`}
    >
      <span
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ backgroundColor: project.colour }}
      />
      <span className="truncate">{project.name}</span>
    </button>
  )
}
