'use client'

import { FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { SpecFileItem, MockupFileItem } from './types'

interface SpecRailProps {
  specs: SpecFileItem[]
  mockups: MockupFileItem[]
  activeFilePath?: string | null
  onSelectFile: (filePath: string) => void
}

/** Narrow navigation rail (~140px) replacing the chat column in focus mode. */
export function SpecRail({
  specs,
  mockups,
  activeFilePath,
  onSelectFile,
}: SpecRailProps) {
  return (
    <div
      className="shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col overflow-y-auto"
      style={{ width: '140px' }}
    >
      <div className="px-3 pt-3 pb-1">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          Specs
        </span>
      </div>

      {specs.map((spec) => {
        const fileName = spec.filePath.split('/').pop()?.replace(/\.md$/, '') ?? spec.filePath
        const isActive = spec.filePath === activeFilePath
        return (
          <button
            key={spec.filePath}
            onClick={() => onSelectFile(spec.filePath)}
            className={cn(
              'flex items-center gap-1 mx-1 px-2 py-1 rounded-[var(--radius-md)] text-left cursor-pointer transition-colors duration-100',
              isActive
                ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            <FileText size={11} className="shrink-0 text-[var(--text-muted)]" />
            <span className="text-[10px] font-medium truncate flex-1">{fileName}</span>
            {spec.isNew && (
              <span className="text-[10px] text-[var(--green)] font-medium shrink-0">new</span>
            )}
          </button>
        )
      })}

      {mockups.length > 0 && (
        <>
          <div className="px-3 pt-3 pb-1">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
              Mockups
            </span>
          </div>
          {mockups.map((mockup) => {
            const fileName = mockup.filePath.split('/').pop()?.replace(/\.html$/, '') ?? mockup.filePath
            return (
              <button
                key={mockup.filePath}
                onClick={() => onSelectFile(mockup.filePath)}
                className="flex items-center gap-1 mx-1 px-2 py-1 rounded-[var(--radius-md)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
              >
                <ImageIcon size={11} className="shrink-0 text-[var(--text-muted)]" />
                <span className="text-[10px] font-medium truncate">{fileName}</span>
              </button>
            )
          })}
        </>
      )}
    </div>
  )
}
