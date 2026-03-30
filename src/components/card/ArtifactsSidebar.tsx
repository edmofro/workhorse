'use client'

import { FileText, Image as ImageIcon, Code2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { deriveLabel } from '../../lib/labels'
import type { SpecFileItem, MockupFileItem } from './types'

export interface CodeFileItem {
  filePath: string
  /** The raw file extension, e.g. 'tsx', 'ts', 'css' */
  ext: string
}

interface ArtifactsSidebarProps {
  specs: SpecFileItem[]
  mockups: MockupFileItem[]
  codeFiles: CodeFileItem[]
  activeFilePath?: string | null
  onSelectFile: (filePath: string) => void
}

/** Artifacts sidebar shown in the chat view. Inspired by Claude's artifacts panel —
 *  wider, cleaner, with file type labels. Three sections: Specs, Mockups, Code. */
export function ArtifactsSidebar({
  specs,
  mockups,
  codeFiles,
  activeFilePath,
  onSelectFile,
}: ArtifactsSidebarProps) {
  const hasContent = specs.length > 0 || mockups.length > 0 || codeFiles.length > 0

  if (!hasContent) return null

  return (
    <aside className="shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col overflow-y-auto" style={{ width: '240px' }}>
      <div className="px-4 pt-4 pb-1">
        <h2 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">
          Artifacts
        </h2>
      </div>

      {/* Specs */}
      {specs.length > 0 && (
        <Section label="Specs">
          {specs.map((spec) => {
            const label = deriveLabel(spec.filePath, spec.content)
            return (
              <FileRow
                key={spec.filePath}
                icon={<FileText size={16} className="text-[var(--text-muted)]" />}
                label={label}
                typeLabel="Spec · MD"
                isActive={spec.filePath === activeFilePath}
                badge={spec.isNew ? 'new' : 'updated'}
                onClick={() => onSelectFile(spec.filePath)}
              />
            )
          })}
        </Section>
      )}

      {/* Mockups */}
      {mockups.length > 0 && (
        <Section label="Mockups">
          {mockups.map((mockup) => {
            const label = deriveLabel(mockup.filePath, mockup.content)
            return (
              <FileRow
                key={mockup.filePath}
                icon={<ImageIcon size={16} className="text-[var(--text-muted)]" />}
                label={label}
                typeLabel="Mockup · HTML"
                isActive={mockup.filePath === activeFilePath}
                onClick={() => onSelectFile(mockup.filePath)}
              />
            )
          })}
        </Section>
      )}

      {/* Code */}
      {codeFiles.length > 0 && (
        <Section label="Code">
          {codeFiles.map((file) => {
            const label = file.filePath.split('/').pop() ?? file.filePath
            return (
              <FileRow
                key={file.filePath}
                icon={<Code2 size={16} className="text-[var(--text-muted)]" />}
                label={label}
                typeLabel={`Code · ${file.ext.toUpperCase()}`}
                isActive={file.filePath === activeFilePath}
                onClick={() => onSelectFile(file.filePath)}
              />
            )
          })}
        </Section>
      )}
    </aside>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 pb-2">
      <div className="px-1 pt-3 pb-1.5">
        <span className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-[0.04em]">
          {label}
        </span>
      </div>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  )
}

function FileRow({
  icon,
  label,
  typeLabel,
  isActive,
  badge,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  typeLabel: string
  isActive: boolean
  badge?: 'new' | 'updated'
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 w-full px-3 py-2.5 rounded-[var(--radius-default)] text-left cursor-pointer transition-colors duration-100',
        isActive
          ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]'
          : 'hover:bg-[var(--bg-hover)]',
      )}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-[13px] font-medium truncate',
            isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
          )}>
            {label}
          </span>
          {badge === 'new' && (
            <span className="text-[10px] text-[var(--green)] font-medium shrink-0">new</span>
          )}
          {badge === 'updated' && (
            <span className="text-[10px] text-[var(--amber)] font-medium shrink-0">updated</span>
          )}
        </div>
        <span className="text-[11px] text-[var(--text-faint)]">{typeLabel}</span>
      </div>
    </button>
  )
}
