'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Image as ImageIcon, Code2, Search } from 'lucide-react'
import { deriveLabel, matchesSearch } from '../../lib/labels'
import type { SpecFileItem, MockupFileItem, ProjectSpecItem } from './types'
import type { CodeFileItem } from './ArtifactsSidebar'

interface SpecDropdownProps {
  specs: SpecFileItem[]
  mockups: MockupFileItem[]
  codeFiles?: CodeFileItem[]
  projectSpecs: ProjectSpecItem[]
  onSelectSpec: (filePath: string) => void
  onSelectProjectSpec: (filePath: string, content: string) => void
  isOpen: boolean
  onClose: () => void
}

/** Dropdown file browser with search, shown from the spec header bar chevron. */
export function SpecDropdown({
  specs,
  mockups,
  codeFiles = [],
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
        const label = deriveLabel(s.filePath, s.content)
        return matchesSearch(lowerQuery, s.filePath, label)
      })
    : specs

  const filteredMockups = lowerQuery
    ? mockups.filter((m) => {
        const label = deriveLabel(m.filePath, m.content)
        return matchesSearch(lowerQuery, m.filePath, label)
      })
    : mockups

  const filteredCodeFiles = lowerQuery
    ? codeFiles.filter((f) => {
        const fileName = f.filePath.split('/').pop() ?? f.filePath
        return fileName.toLowerCase().includes(lowerQuery) || f.filePath.toLowerCase().includes(lowerQuery)
      })
    : codeFiles

  const filteredProjectSpecs = projectSpecs.filter((ps) => {
    if (attachedPaths.has(ps.filePath)) return false
    if (!lowerQuery) return true
    const label = deriveLabel(ps.filePath, ps.content)
    return (
      matchesSearch(lowerQuery, ps.filePath, label) ||
      ps.content.toLowerCase().includes(lowerQuery)
    )
  })

  const hasCardFiles = filteredSpecs.length > 0 || filteredMockups.length > 0 || filteredCodeFiles.length > 0

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 w-[280px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] shadow-[var(--shadow-lg)] z-50 flex flex-col overflow-hidden"
      style={{ maxHeight: '400px' }}
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
            placeholder="Search files..."
            className="w-full pl-[26px] pr-2 py-1 text-[12px] bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] transition-[border-color] duration-100 placeholder:text-[var(--text-faint)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* This card — specs, mockups, and code */}
        {hasCardFiles && (
          <div className="px-1 pb-1">
            <div className="px-2 pt-2 pb-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                This card
              </span>
            </div>
            {filteredSpecs.map((spec) => {
              const fileName = deriveLabel(spec.filePath, spec.content)
              return (
                <button
                  key={spec.filePath}
                  onClick={() => handleSelect(spec.filePath)}
                  className="flex items-center gap-1 w-full px-2 py-1 rounded-[var(--radius-md)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  <FileText size={11} className="shrink-0 text-[var(--text-muted)]" />
                  <span className="text-[11px] font-medium truncate flex-1">{fileName}</span>
                </button>
              )
            })}
            {filteredMockups.map((mockup) => {
              const fileName = deriveLabel(mockup.filePath, mockup.content)
              return (
                <button
                  key={mockup.filePath}
                  onClick={() => handleSelect(mockup.filePath)}
                  className="flex items-center gap-1 w-full px-2 py-1 rounded-[var(--radius-md)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  <ImageIcon size={11} className="shrink-0 text-[var(--text-muted)]" />
                  <span className="text-[11px] font-medium truncate flex-1">{fileName}</span>
                </button>
              )
            })}
            {filteredCodeFiles.map((file) => {
              const fileName = file.filePath.split('/').pop() ?? file.filePath
              const hasStats = file.linesAdded != null || file.linesRemoved != null
              return (
                <button
                  key={file.filePath}
                  onClick={() => handleSelect(file.filePath)}
                  className="flex items-center gap-1 w-full px-2 py-1 rounded-[var(--radius-md)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  <Code2 size={11} className="shrink-0 text-[var(--text-muted)]" />
                  <span className="text-[11px] font-medium truncate flex-1">{fileName}</span>
                  {hasStats && (
                    <span className="shrink-0 text-[10px] font-mono tabular-nums">
                      {(file.linesAdded ?? 0) > 0 && <span className="text-[var(--green)]">+{file.linesAdded}</span>}
                      {(file.linesAdded ?? 0) > 0 && (file.linesRemoved ?? 0) > 0 && <span className="text-[var(--text-faint)]">/</span>}
                      {(file.linesRemoved ?? 0) > 0 && <span className="text-[var(--diff-red,#dc2626)]">−{file.linesRemoved}</span>}
                    </span>
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
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                All project specs
              </span>
            </div>
            {filteredProjectSpecs.map((ps) => {
              const fileName = deriveLabel(ps.filePath, ps.content)
              return (
                <button
                  key={ps.filePath}
                  onClick={() => handleSelectProject(ps.filePath, ps.content)}
                  className="flex items-center gap-1 w-full px-2 py-1 rounded-[var(--radius-md)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  <FileText size={11} className="shrink-0 text-[var(--text-faint)]" />
                  <span className="text-[11px] truncate flex-1">{fileName}</span>
                </button>
              )
            })}
          </div>
        )}

        {!hasCardFiles && filteredProjectSpecs.length === 0 && (
          <p className="px-3 py-4 text-[11px] text-[var(--text-faint)] text-center">
            No matching files
          </p>
        )}
      </div>
    </div>
  )
}
