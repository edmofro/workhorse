'use client'

import { useState, useCallback } from 'react'
import { History, ChevronLeft } from 'lucide-react'

interface HistoryEntry {
  sha: string
  message: string
  author: string
  date: string
}

interface FileHistoryProps {
  cardId: string
  filePath: string
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export function FileHistory({ cardId, filePath }: FileHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [viewingContent, setViewingContent] = useState<{
    sha: string
    content: string
    message: string
  } | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/file-history?cardId=${cardId}&filePath=${encodeURIComponent(filePath)}`,
      )
      if (res.ok) {
        const data = await res.json()
        setEntries(data.history)
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }, [cardId, filePath])

  async function viewVersion(entry: HistoryEntry) {
    try {
      const res = await fetch(
        `/api/file-history?cardId=${cardId}&filePath=${encodeURIComponent(filePath)}&sha=${entry.sha}`,
      )
      if (res.ok) {
        const data = await res.json()
        setViewingContent({
          sha: entry.sha,
          content: data.content ?? '',
          message: entry.message,
        })
      }
    } catch {
      // Ignore
    }
  }

  function handleOpen() {
    setIsOpen(true)
    loadHistory()
  }

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors duration-100"
      >
        <History size={11} />
        History
      </button>
    )
  }

  if (viewingContent) {
    return (
      <div className="fixed inset-0 z-50 bg-[rgba(28,25,23,0.40)] flex items-center justify-center p-8">
        <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] max-w-3xl w-full max-h-[80vh] flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-subtle)]">
            <button
              onClick={() => setViewingContent(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[13px] font-medium text-[var(--text-primary)]">
              {viewingContent.message}
            </span>
            <span className="text-[11px] text-[var(--text-faint)] font-mono ml-auto">
              {viewingContent.sha.slice(0, 7)}
            </span>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-[13px] font-mono text-[var(--text-secondary)] leading-[1.6] whitespace-pre-wrap">
            {viewingContent.content}
          </pre>
          <div className="flex justify-end px-4 py-3 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => { setViewingContent(null); setIsOpen(false) }}
              className="px-3 py-[6px] text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors duration-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(28,25,23,0.40)] flex items-center justify-center p-8">
      <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] max-w-md w-full max-h-[60vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
            File history
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="text-[13px] text-[var(--text-muted)] text-center py-4">
              Loading history...
            </p>
          )}

          {!loading && entries.length === 0 && (
            <p className="text-[13px] text-[var(--text-muted)] text-center py-4">
              No history yet
            </p>
          )}

          {entries.map((entry) => (
            <button
              key={entry.sha}
              onClick={() => viewVersion(entry)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors duration-100 text-left cursor-pointer border-b border-[var(--border-subtle)] last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[var(--text-primary)] truncate">
                  {entry.message}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">
                  {entry.author === 'Workhorse' ? 'Interviewer' : entry.author}
                </div>
              </div>
              <span className="text-[11px] text-[var(--text-faint)] shrink-0 mt-1">
                {relativeTime(entry.date)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
