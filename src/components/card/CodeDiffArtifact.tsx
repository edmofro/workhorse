'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'

interface CodeDiffArtifactProps {
  cardId: string
  filePath: string
}

interface DiffHunk {
  header: string
  lines: DiffLine[]
}

interface DiffLine {
  type: 'context' | 'add' | 'remove' | 'header'
  content: string
  oldLineNo?: number
  newLineNo?: number
}

/** Renders a unified diff for a code file, styled like GitHub's diff view. */
export function CodeDiffArtifact({ cardId, filePath }: CodeDiffArtifactProps) {
  const [diff, setDiff] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    const cacheKey = `${cardId}:${filePath}`
    const cached = cacheRef.current.get(cacheKey)
    if (cached !== undefined) {
      setDiff(cached)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/code-diff?cardId=${encodeURIComponent(cardId)}&filePath=${encodeURIComponent(filePath)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `Failed to load diff (${res.status})`)
        }
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          const diffText = data.diff ?? ''
          cacheRef.current.set(cacheKey, diffText)
          setDiff(diffText)
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-[var(--text-muted)]">Loading diff…</p>
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

  if (!diff || diff.trim() === '') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-[var(--text-faint)]">No changes</p>
      </div>
    )
  }

  const hunks = parseDiff(diff)

  return (
    <div className="flex-1 overflow-auto bg-[var(--bg-page)]">
      <div className="font-mono text-[12px] leading-[20px]">
        {hunks.map((hunk, i) => (
          <div key={i}>
            {/* Hunk header */}
            <div className="px-4 py-1 bg-[rgba(37,99,235,0.08)] text-[var(--text-muted)] text-[11px] border-y border-[var(--border-subtle)] sticky top-0">
              {hunk.header}
            </div>
            {/* Diff lines */}
            {hunk.lines.map((line, j) => (
              <div
                key={j}
                className={cn(
                  'flex',
                  line.type === 'add' && 'bg-[rgba(22,163,74,0.07)]',
                  line.type === 'remove' && 'bg-[rgba(220,38,38,0.07)]',
                )}
              >
                {/* Line numbers */}
                <span className="shrink-0 w-[48px] text-right pr-2 text-[var(--text-faint)] select-none border-r border-[var(--border-subtle)]">
                  {line.oldLineNo ?? ''}
                </span>
                <span className="shrink-0 w-[48px] text-right pr-2 text-[var(--text-faint)] select-none border-r border-[var(--border-subtle)]">
                  {line.newLineNo ?? ''}
                </span>
                {/* +/- indicator */}
                <span className={cn(
                  'shrink-0 w-[20px] text-center select-none',
                  line.type === 'add' && 'text-[var(--green)]',
                  line.type === 'remove' && 'text-[#dc2626]', // Diff-specific semantic colour (not in design system palette)
                  line.type === 'context' && 'text-[var(--text-faint)]',
                )}>
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                </span>
                {/* Content */}
                <span className="flex-1 px-2 whitespace-pre-wrap break-all">
                  {line.content}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Parse a unified diff string into hunks with typed lines. */
function parseDiff(diff: string): DiffHunk[] {
  const lines = diff.split('\n')
  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null
  let oldLine = 0
  let newLine = 0

  for (const raw of lines) {
    // Hunk header
    const hunkMatch = raw.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)/)
    if (hunkMatch) {
      currentHunk = { header: raw, lines: [] }
      hunks.push(currentHunk)
      oldLine = parseInt(hunkMatch[1], 10)
      newLine = parseInt(hunkMatch[2], 10)
      continue
    }

    // Skip diff metadata lines (only before the first hunk)
    if (!currentHunk) continue

    if (raw.startsWith('+')) {
      currentHunk.lines.push({ type: 'add', content: raw.slice(1), newLineNo: newLine })
      newLine++
    } else if (raw.startsWith('-')) {
      currentHunk.lines.push({ type: 'remove', content: raw.slice(1), oldLineNo: oldLine })
      oldLine++
    } else {
      // Context line (starts with space or is empty)
      currentHunk.lines.push({
        type: 'context',
        content: raw.startsWith(' ') ? raw.slice(1) : raw,
        oldLineNo: oldLine,
        newLineNo: newLine,
      })
      oldLine++
      newLine++
    }
  }

  return hunks
}
