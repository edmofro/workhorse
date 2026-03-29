'use client'

import { useState, useEffect } from 'react'
import { FileText, Image as ImageIcon, Plus, ChevronRight, Search, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { cn } from '../../lib/cn'
import { deriveLabel, matchesSearch } from '../../lib/labels'

interface SpecFileItem {
  filePath: string
  isNew: boolean
  content?: string
}

interface MockupFileItem {
  filePath: string
  content?: string
}

interface ProjectSpecItem {
  filePath: string
  content: string
}

interface RightPanelProps {
  specs: SpecFileItem[]
  mockups: MockupFileItem[]
  projectSpecs: ProjectSpecItem[]
  activeFilePath?: string | null
  onSelectSpec: (filePath: string) => void
  onSelectMockup: (filePath: string) => void
  onCreateSpec: () => void
  /** Open a project spec for reading (and potentially editing) */
  onSelectProjectSpec: (filePath: string, content: string) => void
}

const STORAGE_KEY = 'workhorse:right-panel-collapsed'

function getStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === 'true'
  // Collapse by default on small screens
  return window.innerWidth < 1200
}

export function RightPanel({
  specs,
  mockups,
  projectSpecs,
  activeFilePath,
  onSelectSpec,
  onSelectMockup,
  onCreateSpec,
  onSelectProjectSpec,
}: RightPanelProps) {
  const [collapsed, setCollapsed] = useState(getStoredCollapsed)
  const [projectSpecsOpen, setProjectSpecsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const attachedPaths = new Set(specs.map((s) => s.filePath))
  const filteredProjectSpecs = projectSpecs.filter((ps) => {
    if (attachedPaths.has(ps.filePath)) return false
    if (!searchQuery.trim()) return true
    const label = deriveLabel(ps.filePath, ps.content)
    return matchesSearch(searchQuery, ps.filePath, label)
  })

  // Auto-expand project specs when user starts searching
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    if (query.trim() && !projectSpecsOpen) {
      setProjectSpecsOpen(true)
    }
  }

  // Filter card specs by search too
  const filteredSpecs = searchQuery.trim()
    ? specs.filter((s) => {
        const label = deriveLabel(s.filePath, s.content)
        return matchesSearch(searchQuery, s.filePath, label)
      })
    : specs

  const filteredMockups = searchQuery.trim()
    ? mockups.filter((m) => {
        const label = deriveLabel(m.filePath, m.content)
        return matchesSearch(searchQuery, m.filePath, label)
      })
    : mockups

  if (collapsed) {
    return (
      <div className="shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex items-start justify-center pt-3" style={{ width: '32px' }}>
        <button
          onClick={() => setCollapsed(false)}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
          title="Show files"
        >
          <PanelRightOpen size={14} />
        </button>
      </div>
    )
  }

  return (
    <aside
      className="shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col overflow-y-auto"
      style={{ width: '240px' }}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          Specs
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreateSpec}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-100 cursor-pointer"
            title="New spec"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
            title="Collapse panel"
          >
            <PanelRightClose size={14} />
          </button>
        </div>
      </div>

      {/* Card specs */}
      {filteredSpecs.length === 0 && !searchQuery.trim() && (
        <p className="px-3 py-2 text-[11px] text-[var(--text-faint)]">
          No specs yet
        </p>
      )}
      {filteredSpecs.map((spec) => {
        const fileName = deriveLabel(spec.filePath, spec.content)
        const isActive = spec.filePath === activeFilePath
        return (
          <button
            key={spec.filePath}
            onClick={() => onSelectSpec(spec.filePath)}
            className={cn(
              'flex items-center gap-2 mx-2 px-2 py-[6px] rounded-[var(--radius-md)] text-left cursor-pointer transition-colors duration-100',
              isActive
                ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            <FileText size={12} className="shrink-0 text-[var(--text-muted)]" />
            <span className="text-[12px] font-medium truncate flex-1">{fileName}</span>
            {spec.isNew && (
              <span className="text-[10px] text-[var(--green)] font-medium shrink-0">new</span>
            )}
          </button>
        )
      })}

      {/* Mockups */}
      {filteredMockups.length > 0 && (
        <>
          <div className="flex items-center px-3 pt-4 pb-1">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
              Mockups
            </span>
          </div>
          {filteredMockups.map((mockup) => {
            const fileName = deriveLabel(mockup.filePath, mockup.content)
            return (
              <button
                key={mockup.filePath}
                onClick={() => onSelectMockup(mockup.filePath)}
                className="flex items-center gap-2 mx-2 px-2 py-[6px] rounded-[var(--radius-md)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
              >
                <ImageIcon size={12} className="shrink-0 text-[var(--text-muted)]" />
                <span className="text-[12px] font-medium truncate">{fileName}</span>
              </button>
            )
          })}
        </>
      )}

      {/* Separator */}
      <div className="mx-3 my-3 border-t border-[var(--border-subtle)]" />

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search specs..."
            className="w-full pl-[26px] pr-2 py-[5px] text-[11px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] transition-[border-color] duration-100 placeholder:text-[var(--text-faint)]"
          />
        </div>
      </div>

      {/* Project specs — collapsible */}
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
                  {searchQuery.trim() ? 'No matching specs' : 'All specs are already edited'}
                </p>
              )}
              {filteredProjectSpecs.map((ps) => {
                const fileName = deriveLabel(ps.filePath, ps.content)
                return (
                  <button
                    key={ps.filePath}
                    onClick={() => onSelectProjectSpec(ps.filePath, ps.content)}
                    className="flex items-center gap-2 mx-2 px-2 py-[6px] rounded-[var(--radius-md)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer w-[calc(100%-16px)]"
                  >
                    <FileText size={12} className="shrink-0 text-[var(--text-faint)]" />
                    <span className="text-[12px] truncate">{fileName}</span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </aside>
  )
}
