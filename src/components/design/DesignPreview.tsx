'use client'

import { MarkdownContent } from '../card/MarkdownContent'

interface DesignFile {
  path: string
  name: string
  type: 'markdown' | 'component' | 'view' | 'mockup'
  content: string
}

interface DesignPreviewProps {
  file: DesignFile
}

export function DesignPreview({ file }: DesignPreviewProps) {
  const isHtml = file.name.endsWith('.html')
  const isMarkdown = file.name.endsWith('.md')

  return (
    <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          {file.type}
        </span>
        <span className="text-[12px] text-[var(--text-faint)] font-mono">
          {file.name}
        </span>
      </div>

      {isHtml ? (
        <div className="border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden">
          <iframe
            srcDoc={file.content}
            className="w-full border-none"
            style={{ minHeight: '500px' }}
            sandbox="allow-scripts"
            title={file.name}
          />
        </div>
      ) : isMarkdown ? (
        <div className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
          <MarkdownContent content={file.content} />
        </div>
      ) : (
        <pre className="text-[13px] text-[var(--text-secondary)] bg-[var(--bg-inset)] rounded-[var(--radius-default)] p-4 overflow-x-auto leading-[1.6] font-mono">
          {file.content}
        </pre>
      )}
    </div>
  )
}
