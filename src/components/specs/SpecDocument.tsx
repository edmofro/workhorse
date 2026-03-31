import { Pencil } from 'lucide-react'
import { parseSpec } from '../../lib/specs/format'
import { MarkdownContent } from '../card/MarkdownContent'

interface SpecDocumentProps {
  path: string
  content: string
  onEdit?: () => void
  isCreating?: boolean
}

export function SpecDocument({ path, content, onEdit, isCreating }: SpecDocumentProps) {
  const parsed = parseSpec(content)

  return (
    <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-[24px] font-bold tracking-[-0.03em] leading-[1.3]">
          {parsed.frontmatter.title}
        </h1>
        {onEdit && (
          <button
            onClick={onEdit}
            disabled={isCreating}
            title="Edit this spec"
            className="shrink-0 mt-[6px] inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-50"
          >
            <Pencil size={11} />
            {isCreating ? 'Creating...' : 'Edit'}
          </button>
        )}
      </div>
      {parsed.frontmatter.area && (
        <div className="text-[14px] text-[var(--text-faint)] mb-8">
          {parsed.frontmatter.area}
        </div>
      )}

      <div className="text-[12px] text-[var(--text-faint)] font-mono mb-6">
        {path}
      </div>

      <div className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
        <MarkdownContent content={parsed.content} />
      </div>
    </div>
  )
}
