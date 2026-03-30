'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '../../lib/cn'

interface CodeEditorViewProps {
  cardId: string
  filePath: string
  isEditing: boolean
  onContentChange?: (content: string) => void
}

/** Plain code view with line numbers. In view mode, renders the file content
 *  with syntax-aware styling. In edit mode, provides a textarea overlay. */
export function CodeEditorView({ cardId, filePath, isEditing, onContentChange }: CodeEditorViewProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/worktree-files?cardId=${encodeURIComponent(cardId)}&filePath=${encodeURIComponent(filePath)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `Failed to load file (${res.status})`)
        }
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setContent(data.content ?? '')
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [cardId, filePath])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    onContentChange?.(newContent)
  }, [onContentChange])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-[var(--text-muted)]">Loading file…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-[var(--text-muted)]">{error}</p>
      </div>
    )
  }

  if (content === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-[var(--text-faint)]">File not found</p>
      </div>
    )
  }

  const lines = content.split('\n')

  if (isEditing) {
    return (
      <div className="flex-1 overflow-auto bg-[var(--bg-page)]">
        <div className="flex font-mono text-[12px] leading-[20px] min-h-full">
          {/* Line numbers */}
          <div className="shrink-0 w-[40px] pt-3 pb-3 text-right pr-2 text-[var(--text-faint)] select-none border-r border-[var(--border-subtle)] bg-[var(--bg-page)]">
            {lines.map((_, i) => (
              <div key={i} className="h-[20px]">{i + 1}</div>
            ))}
          </div>
          {/* Editable textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            className="flex-1 p-3 bg-transparent text-[var(--text-secondary)] outline-none resize-none font-mono text-[12px] leading-[20px] whitespace-pre"
            spellCheck={false}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-[var(--bg-page)]">
      <div className="font-mono text-[12px] leading-[20px]">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="shrink-0 w-[40px] text-right pr-2 text-[var(--text-faint)] select-none border-r border-[var(--border-subtle)]">
              {i + 1}
            </span>
            <span className="flex-1 px-3 whitespace-pre-wrap break-all text-[var(--text-secondary)]">
              {line || '\u00A0'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
