'use client'

import { useState, useEffect, useRef } from 'react'

interface SpecDiffViewProps {
  cardId: string
  filePath: string
}

interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed'
  text: string
}

/** Inline tracked-changes diff for spec files. Shows additions and removals
 *  inline like Google Docs or Slab, rather than a line-by-line code diff. */
export function SpecDiffView({ cardId, filePath }: SpecDiffViewProps) {
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
        <p className="text-[13px] text-[var(--text-muted)]">Loading changes…</p>
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

  const segments = buildInlineDiff(diff)

  return (
    <div className="flex-1 overflow-y-auto flex justify-center">
      <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
        <div className="text-[14px] leading-[1.7] text-[var(--text-secondary)]">
          {segments.map((seg, i) => {
            if (seg.type === 'unchanged') {
              return <span key={i}>{seg.text}</span>
            }
            if (seg.type === 'added') {
              return (
                <span
                  key={i}
                  className="bg-[var(--diff-green-bg,rgba(22,163,74,0.07))] text-[var(--diff-green,#16a34a)] rounded-[2px] px-[2px]"
                >
                  {seg.text}
                </span>
              )
            }
            if (seg.type === 'removed') {
              return (
                <span
                  key={i}
                  className="bg-[var(--diff-red-bg,rgba(220,38,38,0.07))] text-[var(--diff-red,#dc2626)] line-through rounded-[2px] px-[2px]"
                >
                  {seg.text}
                </span>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Convert a unified diff into inline tracked-changes segments.
 * Groups adjacent removed+added lines as replacements, and renders
 * unchanged lines as plain text. The result reads like a document
 * with strikethrough deletions and highlighted insertions inline.
 */
function buildInlineDiff(diff: string): DiffSegment[] {
  const lines = diff.split('\n')
  const segments: DiffSegment[] = []

  let inHunk = false
  let removedBuffer: string[] = []
  let addedBuffer: string[] = []

  function flushBuffers() {
    if (removedBuffer.length > 0) {
      segments.push({ type: 'removed', text: removedBuffer.join('\n') })
      removedBuffer = []
    }
    if (addedBuffer.length > 0) {
      segments.push({ type: 'added', text: addedBuffer.join('\n') })
      addedBuffer = []
    }
  }

  for (const raw of lines) {
    // Skip diff metadata
    if (raw.startsWith('diff --git') || raw.startsWith('index ') || raw.startsWith('---') || raw.startsWith('+++')) {
      continue
    }

    // Hunk header — start a new hunk section
    if (raw.match(/^@@\s/)) {
      flushBuffers()
      inHunk = true
      // Add a visual separator between hunks (not for the first hunk)
      if (segments.length > 0) {
        segments.push({ type: 'unchanged', text: '\n\u2022 \u2022 \u2022\n\n' })
      }
      continue
    }

    if (!inHunk) continue

    if (raw.startsWith('+')) {
      addedBuffer.push(raw.slice(1))
    } else if (raw.startsWith('-')) {
      removedBuffer.push(raw.slice(1))
    } else {
      // Context line — flush any pending changes first
      flushBuffers()
      const content = raw.startsWith(' ') ? raw.slice(1) : raw
      segments.push({ type: 'unchanged', text: content + '\n' })
    }
  }

  flushBuffers()
  return segments
}
