'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Search } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SpecFileItem {
  filePath: string
  isNew: boolean
}

interface ProjectSpecItem {
  filePath: string
  content: string
}

interface SpecDropdownProps {
  specs: SpecFileItem[]
  projectSpecs: ProjectSpecItem[]
  onSelectSpec: (filePath: string) => void
  onSelectProjectSpec: (filePath: string, content: string) => void
  isOpen: boolean
  onClose: () => void
}

/** Dropdown file browser with search, shown from the spec header bar chevron. */
export function SpecDropdown({
  specs,
  projectSpecs,
  onSelectSpec,
  onSelectProjectSpec,
  isOpen,
  onClose,
}: SpecDropdownProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  const handleSelect = useCallback((filePath: string) => {
    onSelectSpec(filePath)
    onClose()
  }, [onSelectSpec, onClose])

  const handleSelectProject = useCallback((filePath: string, content: string) => {
    onSelectProjectSpec(filePath, content)
    onClose()
  }, [onSelectProjectSpec, onClose])

  if (!isOpen) return null

  const lowerQuery = query.toLowerCase().trim()
  const attachedPaths = new Set(specs.map((s) => s.filePath))

  const filteredSpecs = lowerQuery
    ? specs.filter((s) => {
        const name = s.filePath.split('/').pop() ?? s.filePath
        return name.toLowerCase().includes(lowerQuery)
      })
    : specs

  const filteredProjectSpecs = projectSpecs.filter((ps) => {
    if (attachedPaths.has(ps.filePath)) return false
    if (!lowerQuery) return true
    const name = ps.filePath.split('/').pop() ?? ps.filePath
    const title = extractTitle(ps.content)
    return (
      name.toLowerCase().includes(lowerQuery) ||
      title.toLowerCase().includes(lowerQuery) ||
      ps.content.toLowerCase().includes(lowerQuery)
    )
  })

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 w-[280px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] shadow-[var(--shadow-lg)] z-50 flex flex-col overflow-hidden"
      style={{ maxHeight: '360px' }}
    >
      {/* Search */}
      <div className="px-2 pt-2 pb-1 shrink-0">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
            }}
            placeholder="Search specs..."
            className="w-full pl-[26px] pr-2 py-[5px] text-[12px] bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] transition-[border-color] duration-100 placeholder:text-[var(--text-faint)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* This card */}
        {filteredSpecs.length > 0 && (
          <div className="px-1 pb-1">
            <div className="px-2 pt-2 pb-1">
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                This card
              </span>
            </div>
            {filteredSpecs.map((spec) => {
              const fileName = spec.filePath.split('/').pop()?.replace(/\.md$/, '') ?? spec.filePath
              return (
                <button
                  key={spec.filePath}
                  onClick={() => handleSelect(spec.filePath)}
                  className="flex items-center gap-[6px] w-full px-2 py-[5px] rounded-[var(--radius-md)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  <FileText size={11} className="shrink-0 text-[var(--text-muted)]" />
                  <span className="text-[11px] font-medium truncate flex-1">{fileName}</span>
                  {spec.isNew && (
                    <span className="text-[9px] text-[var(--green)] font-medium shrink-0">new</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Project specs */}
        {filteredProjectSpecs.length > 0 && (
          <div className="px-1 pb-1">
            <div className="px-2 pt-1 pb-1 border-t border-[var(--border-subtle)]">
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                All project specs
              </span>
            </div>
            {filteredProjectSpecs.map((ps) => {
              const fileName = ps.filePath.split('/').pop()?.replace(/\.md$/, '') ?? ps.filePath
              return (
                <button
                  key={ps.filePath}
                  onClick={() => handleSelectProject(ps.filePath, ps.content)}
                  className="flex items-center gap-[6px] w-full px-2 py-[5px] rounded-[var(--radius-md)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  <FileText size={11} className="shrink-0 text-[var(--text-faint)]" />
                  <span className="text-[11px] truncate flex-1">{fileName}</span>
                </button>
              )
            })}
          </div>
        )}

        {filteredSpecs.length === 0 && filteredProjectSpecs.length === 0 && (
          <p className="px-3 py-4 text-[11px] text-[var(--text-faint)] text-center">
            No matching specs
          </p>
        )}
      </div>
    </div>
  )
}

function extractTitle(content: string): string {
  const match = content.match(/^title:\s*(.+)$/m)
  return match?.[1] ?? ''
}
