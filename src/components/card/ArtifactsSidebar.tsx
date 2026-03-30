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

/** Artifacts sidebar shown in the chat view. Three sections: Specs, Mockups, Code. */
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
    <aside className="shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col overflow-y-auto" style={{ width: '216px' }}>
      {/* Specs */}
      {specs.length > 0 && (
        <Section label="Specs">
          {specs.map((spec) => {
            const label = deriveLabel(spec.filePath, spec.content)
            return (
              <FileRow
                key={spec.filePath}
                icon={<FileText size={13} className="text-[var(--text-muted)]" />}
                label={label}
                isActive={spec.filePath === activeFilePath}
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
                icon={<ImageIcon size={13} className="text-[var(--text-muted)]" />}
                label={label}
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
                icon={<Code2 size={13} className="text-[var(--text-muted)]" />}
                label={label}
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
    <div className="px-2 pb-2">
      <div className="px-2 pt-3 pb-1">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
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
  isActive,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-2 py-1.5 rounded-[var(--radius-md)] text-left cursor-pointer transition-colors duration-100',
        isActive
          ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]'
          : 'hover:bg-[var(--bg-hover)]',
      )}
    >
      <div className="shrink-0">{icon}</div>
      <span className={cn(
        'text-[12px] font-medium truncate',
        isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
      )}>
        {label}
      </span>
    </button>
  )
}
