'use client'

import { useState } from 'react'
import { FileText, Plus, ChevronRight, Search } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SpecData {
  id: string
  filePath: string
  isNew: boolean
}

interface ProjectSpecData {
  id: string
  filePath: string
  content: string
}

interface SpecListSidebarProps {
  specs: SpecData[]
  projectSpecs: ProjectSpecData[]
  activeSpecId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onAttachProjectSpec: (filePath: string, content: string) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export function SpecListSidebar({
  specs,
  projectSpecs,
  activeSpecId,
  onSelect,
  onAdd,
  onAttachProjectSpec,
  searchQuery,
  onSearchChange,
}: SpecListSidebarProps) {
  const [projectSpecsOpen, setProjectSpecsOpen] = useState(false)
  const [internalQuery, setInternalQuery] = useState('')
  const query = searchQuery ?? internalQuery
  const setQuery = onSearchChange ?? setInternalQuery

  const attachedPaths = new Set(specs.map((s) => s.filePath))

  const filteredProjectSpecs = projectSpecs.filter((ps) => {
    if (attachedPaths.has(ps.filePath)) return false
    if (!query.trim()) return true
    const name = ps.filePath.split('/').pop() ?? ps.filePath
    return name.toLowerCase().includes(query.toLowerCase())
  })

  return (
    <aside
      className="flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-page)] shrink-0 overflow-y-auto"
      style={{ width: '216px' }}
    >
      {/* Card specs section */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          Card specs
        </span>
        <button
          onClick={onAdd}
          className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-100 cursor-pointer p-1"
        >
          <Plus size={12} />
        </button>
      </div>

      {specs.map((spec) => {
        const fileName = spec.filePath.split('/').pop() ?? spec.filePath
        const isActive = spec.id === activeSpecId

        return (
          <button
            key={spec.id}
            onClick={() => onSelect(spec.id)}
            className={cn(
              'flex items-center gap-2 mx-2 px-2 py-[6px] rounded-[var(--radius-md)] text-left cursor-pointer transition-colors duration-100',
              isActive
                ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            <FileText size={13} className="shrink-0 text-[var(--text-muted)]" />
            <span className="text-[12px] font-medium truncate">{fileName}</span>
          </button>
        )
      })}

      {/* Search bar */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search specs..."
            className="w-full pl-[26px] pr-2 py-[5px] text-[11px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] transition-[border-color] duration-100 placeholder:text-[var(--text-faint)]"
          />
        </div>
      </div>

      {/* Project specs section — collapsible */}
      {projectSpecs.length > 0 && (
        <>
          <button
            onClick={() => setProjectSpecsOpen(!projectSpecsOpen)}
            className="flex items-center gap-1 px-3 py-[6px] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] cursor-pointer hover:text-[var(--text-secondary)] transition-colors duration-100"
          >
            <ChevronRight
              size={11}
              className={cn(
                'transition-transform duration-100',
                projectSpecsOpen && 'rotate-90',
              )}
            />
            Project specs
            <span className="text-[var(--text-faint)] font-normal ml-1">
              {filteredProjectSpecs.length}
            </span>
          </button>

          {projectSpecsOpen && (
            <div className="pb-2">
              {filteredProjectSpecs.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-[var(--text-faint)]">
                  {query.trim() ? 'No matching specs' : 'All specs attached'}
                </p>
              )}
              {filteredProjectSpecs.map((ps) => {
                const fileName = ps.filePath.split('/').pop() ?? ps.filePath
                return (
                  <div
                    key={ps.id}
                    className="flex items-center gap-2 mx-2 px-2 py-[6px] rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100"
                  >
                    <FileText size={13} className="shrink-0 text-[var(--text-faint)]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] truncate">{fileName}</div>
                    </div>
                    <button
                      onClick={() => onAttachProjectSpec(ps.filePath, ps.content)}
                      className="text-[10px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100 shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </aside>
  )
}
