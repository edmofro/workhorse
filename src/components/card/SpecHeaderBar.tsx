'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Maximize2, Minimize2, X, Pencil } from 'lucide-react'
import { SpecDropdown } from './SpecDropdown'
import { FileHistory } from './FileHistory'
import { deriveLabel } from '../../lib/labels'
import type { SpecFileItem, ProjectSpecItem } from './types'

interface SpecHeaderBarProps {
  filePath: string
  /** Content of the current file (for label derivation) */
  fileContent?: string
  cardId: string
  /** Full ordered list of navigable files (specs + mockups) for prev/next */
  allNavigableFiles: string[]
  specs: SpecFileItem[]
  projectSpecs: ProjectSpecItem[]
  isFocusMode: boolean
  isEditing: boolean
  onPrev: () => void
  onNext: () => void
  onSelectSpec: (filePath: string) => void
  onSelectProjectSpec: (filePath: string, content: string) => void
  onToggleFocus: () => void
  onClose: () => void
  onEdit: () => void
}

/** Header bar at the top of the artifact/spec area with navigation controls. */
export function SpecHeaderBar({
  filePath,
  fileContent,
  cardId,
  allNavigableFiles,
  specs,
  projectSpecs,
  isFocusMode,
  isEditing,
  onPrev,
  onNext,
  onSelectSpec,
  onSelectProjectSpec,
  onToggleFocus,
  onClose,
  onEdit,
}: SpecHeaderBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const fileName = deriveLabel(filePath, fileContent)

  // Use allNavigableFiles for prev/next boundary detection
  const currentIdx = allNavigableFiles.indexOf(filePath)
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx < allNavigableFiles.length - 1

  const handleDropdownSelect = useCallback((fp: string) => {
    onSelectSpec(fp)
  }, [onSelectSpec])

  const handleDropdownSelectProject = useCallback((fp: string, content: string) => {
    onSelectProjectSpec(fp, content)
  }, [onSelectProjectSpec])

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
      {/* Prev/Next arrows */}
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-default"
        title="Previous spec"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-default"
        title="Next spec"
      >
        <ChevronRight size={14} />
      </button>

      {/* File name + dropdown trigger */}
      <div className="relative flex items-center">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-md)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
        >
          {fileName}
          <ChevronDown size={12} className="text-[var(--text-muted)]" />
        </button>
        <SpecDropdown
          specs={specs}
          projectSpecs={projectSpecs}
          onSelectSpec={handleDropdownSelect}
          onSelectProjectSpec={handleDropdownSelectProject}
          isOpen={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
        />
      </div>

      <div className="flex-1" />

      {/* History */}
      <FileHistory cardId={cardId} filePath={filePath} />

      {/* Edit button — only in non-editing states */}
      {!isEditing && (
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-default)] text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
          title="Edit this spec"
        >
          <Pencil size={11} />
          Edit
        </button>
      )}

      {/* Focus toggle */}
      <button
        onClick={onToggleFocus}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
        title={isFocusMode ? 'Exit focus mode' : 'Focus mode'}
      >
        {isFocusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>

      {/* Close */}
      <button
        onClick={onClose}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
        title="Close spec"
      >
        <X size={14} />
      </button>
    </div>
  )
}
