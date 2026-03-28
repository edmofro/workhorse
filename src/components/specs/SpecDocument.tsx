import { parseSpec } from '../../lib/specs/format'
import { MarkdownContent } from '../feature/MarkdownContent'

interface SpecDocumentProps {
  path: string
  content: string
}

export function SpecDocument({ path, content }: SpecDocumentProps) {
  const parsed = parseSpec(content)

  return (
    <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
      <h1 className="text-[24px] font-bold tracking-[-0.03em] leading-[1.3] mb-2">
        {parsed.frontmatter.title}
      </h1>
      <div className="text-[14px] text-[var(--text-muted)] mb-8">
        {parsed.frontmatter.card && (
          <span className="font-mono text-[12px] mr-2">
            {parsed.frontmatter.card}
          </span>
        )}
        {parsed.frontmatter.status && (
          <span className="capitalize">{parsed.frontmatter.status}</span>
        )}
        {parsed.frontmatter.area && (
          <span className="text-[var(--text-faint)]"> · {parsed.frontmatter.area}</span>
        )}
      </div>

      <div className="text-[12px] text-[var(--text-faint)] font-mono mb-6">
        {path}
      </div>

      <div className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
        <MarkdownContent content={parsed.content} />
      </div>
    </div>
  )
}
