'use client'

import { DesignMarkdownEditor } from './DesignMarkdownEditor'
import { DesignHtmlEditor } from './DesignHtmlEditor'

interface DesignFile {
  path: string
  name: string
  type: 'markdown' | 'component' | 'view' | 'mockup'
  content: string
}

interface DesignPreviewProps {
  file: DesignFile
  owner: string
  repo: string
  branch: string
  onFileUpdated: (path: string, newContent: string) => void
}

export function DesignPreview({ file, owner, repo, branch, onFileUpdated }: DesignPreviewProps) {
  const isHtml = file.name.endsWith('.html')
  const isMarkdown = file.name.endsWith('.md')

  function handleSaved(newContent: string) {
    onFileUpdated(file.path, newContent)
  }

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
        <DesignHtmlEditor
          content={file.content}
          fileName={file.name}
          filePath={file.path}
          owner={owner}
          repo={repo}
          branch={branch}
          onSaved={handleSaved}
        />
      ) : isMarkdown ? (
        <DesignMarkdownEditor
          content={file.content}
          filePath={file.path}
          owner={owner}
          repo={repo}
          branch={branch}
          onSaved={handleSaved}
        />
      ) : (
        <pre className="text-[13px] text-[var(--text-secondary)] bg-[var(--bg-inset)] rounded-[var(--radius-default)] p-4 overflow-x-auto leading-[1.6] font-mono">
          {file.content}
        </pre>
      )}
    </div>
  )
}
