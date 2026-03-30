'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, X, Pencil, Maximize2, Minimize2 } from 'lucide-react'
import { SpecDropdown } from './SpecDropdown'
import { deriveLabel } from '../../lib/labels'
import type { SpecFileItem, MockupFileItem, ProjectSpecItem } from './types'
import type { CodeFileItem } from './ArtifactsSidebar'
import { SegmentedToggle } from './SegmentedToggle'

const DEVICES = [
  { key: 'desktop', label: 'Desktop' },
  { key: 'tablet', label: 'Tablet' },
  { key: 'mobile', label: 'Mobile' },
] as const

export type DeviceKey = (typeof DEVICES)[number]['key']

const CHANGES_OPTIONS = [
  { key: 'file', label: 'File' },
  { key: 'changes', label: 'Changes' },
] as const

interface SpecHeaderBarProps {
  filePath: string
  /** Content of the current file (for label derivation) */
  fileContent?: string
  /** Full ordered list of navigable files (specs + mockups) for prev/next */
  allNavigableFiles: string[]
  specs: SpecFileItem[]
  mockups: MockupFileItem[]
  codeFiles?: CodeFileItem[]
  projectSpecs: ProjectSpecItem[]
  isEditing: boolean
  /** Whether this is a mockup file (shows device toggle) */
  isMockup?: boolean
  /** Whether this is a code file */
  isCode?: boolean
  /** Current device selection for mockups */
  device?: DeviceKey
  /** Callback for device change */
  onDeviceChange?: (device: DeviceKey) => void
  onPrev: () => void
  onNext: () => void
  onSelectSpec: (filePath: string) => void
  onSelectProjectSpec: (filePath: string, content: string) => void
  onClose: () => void
  onEdit: () => void
  /** Whether changes diff view is active */
  showChanges?: boolean
  onToggleChanges?: () => void
  /** Whether the artifact is expanded (chat collapsed) */
  expanded?: boolean
  onToggleExpand?: () => void
}

/** Header bar at the top of the artifact area with navigation controls. */
export function SpecHeaderBar({
  filePath,
  fileContent,
  allNavigableFiles,
  specs,
  mockups,
  codeFiles = [],
  projectSpecs,
  isEditing,
  isMockup = false,
  isCode = false,
  device,
  onDeviceChange,
  onPrev,
  onNext,
  onSelectSpec,
  onSelectProjectSpec,
  onClose,
  onEdit,
  showChanges = false,
  onToggleChanges,
  expanded = false,
  onToggleExpand,
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
        title="Previous file"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-default"
        title="Next file"
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
          mockups={mockups}
          codeFiles={codeFiles}
          projectSpecs={projectSpecs}
          onSelectSpec={handleDropdownSelect}
          onSelectProjectSpec={handleDropdownSelectProject}
          isOpen={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
        />
      </div>

      <div className="flex-1" />

      {/* Device toggle (mockups only) */}
      {isMockup && device && onDeviceChange && (
        <SegmentedToggle
          options={DEVICES}
          value={device}
          onChange={onDeviceChange}
          className="mr-2"
        />
      )}

      {/* Changes toggle (specs and code, not mockups) */}
      {!isMockup && onToggleChanges && (
        <SegmentedToggle
          options={CHANGES_OPTIONS}
          value={showChanges ? 'changes' : 'file'}
          onChange={(key) => {
            if ((key === 'changes') !== showChanges) onToggleChanges()
          }}
          className="mr-1"
        />
      )}

      {/* Edit button */}
      {!isEditing && (
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-default)] text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
          title="Edit this file"
        >
          <Pencil size={11} />
          Edit
        </button>
      )}

      {/* Expand/collapse chat */}
      {onToggleExpand && (
        <button
          onClick={onToggleExpand}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
          title={expanded ? 'Show chat' : 'Expand'}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
        title="Close"
      >
        <X size={14} />
      </button>
    </div>
  )
}
