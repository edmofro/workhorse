'use client'

import { FileText, Image as ImageIcon, Code2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { deriveLabel } from '../../lib/labels'
import type { SpecFileItem, MockupFileItem } from './types'
import { PrSection } from './PrSection'

export interface CodeFileItem {
  filePath: string
  /** The raw file extension, e.g. 'tsx', 'ts', 'css' */
  ext: string
  linesAdded?: number
  linesRemoved?: number
}

interface ArtifactsSidebarProps {
  specs: SpecFileItem[]
  mockups: MockupFileItem[]
  codeFiles: CodeFileItem[]
  activeFilePath?: string | null
  onSelectFile: (filePath: string) => void
  /** PR section props — when provided, the PR section renders at the top */
  pr?: {
    cardId: string
    cardIdentifier: string
    hasCodeChanges: boolean
    prUrl: string | null
    prNumber: number | null
    cardBranch: string | null
    dependsOn: { identifier: string; title: string }[]
    repoOwner: string
    repoName: string
    onPrCreated: (prUrl: string, prNumber?: number) => void
  }
}

/** Artifacts sidebar shown in the chat view. Three sections: Specs, Mockups, Code. */
export function ArtifactsSidebar({
  specs,
  mockups,
  codeFiles,
  activeFilePath,
  onSelectFile,
  pr,
}: ArtifactsSidebarProps) {
  return (
    <aside className="shrink-0 w-[248px] border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col overflow-y-auto">
      {/* PR section */}
      {pr && (
        <PrSection
          cardId={pr.cardId}
          cardIdentifier={pr.cardIdentifier}
          hasCodeChanges={pr.hasCodeChanges}
          prUrl={pr.prUrl}
          prNumber={pr.prNumber}
          cardBranch={pr.cardBranch}
          dependsOn={pr.dependsOn}
          repoOwner={pr.repoOwner}
          repoName={pr.repoName}
          onPrCreated={pr.onPrCreated}
        />
      )}

      {/* Specs */}
      <Section label="Specs">
        {specs.length > 0 ? specs.map((spec) => {
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
        }) : (
          <p className="px-2 py-1 text-[11px] text-[var(--text-faint)]">No specs yet</p>
        )}
      </Section>

      {/* Mockups */}
      <Section label="Mockups">
        {mockups.length > 0 ? mockups.map((mockup) => {
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
        }) : (
          <p className="px-2 py-1 text-[11px] text-[var(--text-faint)]">No mockups yet</p>
        )}
      </Section>

      {/* Code */}
      <Section label="Code changes">
        {codeFiles.length > 0 ? codeFiles.map((file) => {
          const label = file.filePath.split('/').pop() ?? file.filePath
          return (
            <FileRow
              key={file.filePath}
              icon={<Code2 size={13} className="text-[var(--text-muted)]" />}
              label={label}
              isActive={file.filePath === activeFilePath}
              onClick={() => onSelectFile(file.filePath)}
              lineStats={file.linesAdded != null || file.linesRemoved != null
                ? { added: file.linesAdded ?? 0, removed: file.linesRemoved ?? 0 }
                : undefined}
            />
          )
        }) : (
          <p className="px-2 py-1 text-[11px] text-[var(--text-faint)]">No changes yet</p>
        )}
      </Section>
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
  lineStats,
}: {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
  lineStats?: { added: number; removed: number }
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
        'text-[12px] font-medium truncate flex-1',
        isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
      )}>
        {label}
      </span>
      {lineStats && (
        <span className="shrink-0 text-[11px] tabular-nums flex items-center gap-1">
          <span className="text-[var(--green)]">+{lineStats.added}</span>
          <span className="text-[var(--diff-red,#dc2626)]">−{lineStats.removed}</span>
        </span>
      )}
    </button>
  )
}
