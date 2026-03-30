'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, X, Pencil, Monitor, Tablet, Smartphone } from 'lucide-react'
import { SpecDropdown } from './SpecDropdown'
import { FileHistory } from './FileHistory'
import { deriveLabel } from '../../lib/labels'
import type { SpecFileItem, ProjectSpecItem } from './types'
import { cn } from '../../lib/cn'

const DEVICES = [
  { key: 'desktop', label: 'Desktop', icon: Monitor },
  { key: 'tablet', label: 'Tablet', icon: Tablet },
  { key: 'mobile', label: 'Mobile', icon: Smartphone },
] as const

export type DeviceKey = (typeof DEVICES)[number]['key']

interface SpecHeaderBarProps {
  filePath: string
  /** Content of the current file (for label derivation) */
  fileContent?: string
  cardId: string
  /** Full ordered list of navigable files (specs + mockups) for prev/next */
  allNavigableFiles: string[]
  specs: SpecFileItem[]
  projectSpecs: ProjectSpecItem[]
  isEditing: boolean
  /** Whether this is a mockup file (shows device toggle) */
  isMockup?: boolean
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
}

/** Header bar at the top of the artifact area with navigation controls. */
export function SpecHeaderBar({
  filePath,
  fileContent,
  cardId,
  allNavigableFiles,
  specs,
  projectSpecs,
  isEditing,
  isMockup = false,
  device,
  onDeviceChange,
  onPrev,
  onNext,
  onSelectSpec,
  onSelectProjectSpec,
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
          projectSpecs={projectSpecs}
          onSelectSpec={handleDropdownSelect}
          onSelectProjectSpec={handleDropdownSelectProject}
          isOpen={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
        />
      </div>

      <div className="flex-1" />

      {/* Device toggle (mockups only) */}
      {isMockup && onDeviceChange && (
        <div className="inline-flex bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-[var(--radius-default)] p-[2px] gap-[1px] mr-2">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              onClick={() => onDeviceChange(d.key)}
              className={cn(
                'px-[10px] py-[4px] rounded-[var(--radius-md)] text-[11px] font-medium leading-none transition-colors duration-100 cursor-pointer',
                d.key === device
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* History (specs only) */}
      {!isMockup && <FileHistory cardId={cardId} filePath={filePath} />}

      {/* Edit button — only for specs, and only when not already editing */}
      {!isMockup && !isEditing && (
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-default)] text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
          title="Edit this file"
        >
          <Pencil size={11} />
          Edit
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
