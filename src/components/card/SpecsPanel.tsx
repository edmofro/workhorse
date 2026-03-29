'use client'

import { FileText, Image as ImageIcon, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SpecFileItem {
  filePath: string
  isNew: boolean
}

interface MockupFileItem {
  filePath: string
}

interface SpecsPanelProps {
  specs: SpecFileItem[]
  mockups: MockupFileItem[]
  activeFilePath?: string | null
  onSelectSpec: (filePath: string) => void
  onSelectMockup: (filePath: string) => void
  onCreateSpec: () => void
}

/** Thin right-side panel (~160px) listing card specs and mockups. Shown in chat mode. */
export function SpecsPanel({
  specs,
  mockups,
  activeFilePath,
  onSelectSpec,
  onSelectMockup,
  onCreateSpec,
}: SpecsPanelProps) {
  return (
    <aside
      className="shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col overflow-y-auto"
      style={{ width: '160px' }}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          Specs
        </span>
        <button
          onClick={onCreateSpec}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-100 cursor-pointer"
          title="New spec"
        >
          <Plus size={11} />
        </button>
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
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
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
