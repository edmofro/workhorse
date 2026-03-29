'use client'

import { FileText, Image as ImageIcon, Plus, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { SpecFileItem, MockupFileItem } from './types'

interface SpecsPanelProps {
  specs: SpecFileItem[]
  mockups: MockupFileItem[]
  activeFilePath?: string | null
  onSelectSpec: (filePath: string) => void
  onSelectMockup: (filePath: string) => void
  onCreateSpec: () => void
  collapsed?: boolean
  onToggle?: () => void
}

/** Right-side panel listing card specs and mockups. Shown in chat mode.
 *  Supports a collapsed state (narrow strip with toggle) and expanded (160px file list). */
export function SpecsPanel({
  specs,
  mockups,
  activeFilePath,
  onSelectSpec,
  onSelectMockup,
  onCreateSpec,
  collapsed = false,
  onToggle,
}: SpecsPanelProps) {
  const hasFiles = specs.length > 0 || mockups.length > 0

  // Collapsed: narrow strip with toggle button and file count badge
  if (collapsed) {
    return (
      <aside
        className="shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col items-center pt-3 gap-3"
        style={{ width: '44px' }}
      >
        <button
          onClick={onToggle}
          className="p-1.5 rounded-[var(--radius-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
          title="Show specs panel"
        >
          <PanelRightOpen size={14} />
        </button>
        {hasFiles && (
          <span className="text-[10px] font-medium text-[var(--text-muted)] tabular-nums">
            {specs.length + mockups.length}
          </span>
        )}
      </aside>
    )
  }

  // Expanded: full file list
  return (
    <aside
      className="shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col overflow-y-auto"
      style={{ width: '160px' }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          Specs
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreateSpec}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-100 cursor-pointer"
            title="New spec"
          >
            <Plus size={11} />
          </button>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
              title="Collapse specs panel"
            >
              <PanelRightClose size={11} />
            </button>
          )}
        </div>
      </div>

      {specs.length === 0 && (
        <p className="px-3 py-2 text-[10px] text-[var(--text-faint)]">
          No specs yet
        </p>
      )}
      {specs.map((spec) => {
        const fileName = spec.filePath.split('/').pop()?.replace(/\.md$/, '') ?? spec.filePath
        const isActive = spec.filePath === activeFilePath
        return (
          <button
            key={spec.filePath}
            onClick={() => onSelectSpec(spec.filePath)}
            className={cn(
              'flex items-center gap-1 mx-1 px-2 py-1 rounded-[var(--radius-md)] text-left cursor-pointer transition-colors duration-100',
              isActive
                ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            <FileText size={11} className="shrink-0 text-[var(--text-muted)]" />
            <span className="text-[11px] font-medium truncate flex-1">{fileName}</span>
            {spec.isNew && (
              <span className="text-[10px] text-[var(--green)] font-medium shrink-0">new</span>
            )}
          </button>
        )
      })}

      {mockups.length > 0 && (
        <>
          <div className="flex items-center px-3 pt-3 pb-1">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
              Mockups
            </span>
          </div>
          {mockups.map((mockup) => {
            const fileName = mockup.filePath.split('/').pop()?.replace(/\.html$/, '') ?? mockup.filePath
            return (
              <button
                key={mockup.filePath}
                onClick={() => onSelectMockup(mockup.filePath)}
                className="flex items-center gap-1 mx-1 px-2 py-1 rounded-[var(--radius-md)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
              >
                <ImageIcon size={11} className="shrink-0 text-[var(--text-muted)]" />
                <span className="text-[11px] font-medium truncate">{fileName}</span>
              </button>
            )
          })}
        </>
      )}
    </aside>
  )
}
