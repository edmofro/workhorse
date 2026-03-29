'use client'

interface MockupPreviewProps {
  title: string
  html: string
  onExpand?: () => void
}

export function MockupPreview({ title, html, onExpand }: MockupPreviewProps) {
  return (
    <div
      className="border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden cursor-pointer transition-[border-color] duration-100 hover:border-[var(--border-default)]"
      onClick={onExpand}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-page)] border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          {title}
        </span>
        {onExpand && (
          <span className="text-[11px] text-[var(--accent)] font-medium">
            Expand
          </span>
        )}
      </div>
      <div
        className="bg-white overflow-hidden"
        style={{ maxHeight: '200px', transform: 'scale(0.6)', transformOrigin: 'top left', width: '166.67%' }}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}
