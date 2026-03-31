'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { parseSpec } from '../../lib/specs/format'

interface SpecDiffViewProps {
  cardId: string
  filePath: string
  /** Current content of the spec from the card branch */
  currentContent: string
}

type SegmentType = 'unchanged' | 'added' | 'removed'

interface Segment {
  type: SegmentType
  text: string
}

/**
 * Inline tracked-changes view for spec files. Renders the spec with full
 * markdown formatting (headings, lists, checkboxes), with additions shown
 * in green and deletions in red with strikethrough — like Slab or Google Docs.
 */
export function SpecDiffView({ cardId, filePath, currentContent }: SpecDiffViewProps) {
  const [baseContent, setBaseContent] = useState<string | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Map<string, string | null>>(new Map())
  const cachedCardIdRef = useRef(cardId)

  useEffect(() => {
    if (cachedCardIdRef.current !== cardId) {
      cacheRef.current.clear()
      cachedCardIdRef.current = cardId
    }
  }, [cardId])

  useEffect(() => {
    const cached = cacheRef.current.get(filePath)
    if (cached !== undefined) {
      setBaseContent(cached)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/base-file?cardId=${encodeURIComponent(cardId)}&filePath=${encodeURIComponent(filePath)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `Failed to load base file (${res.status})`)
        }
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          cacheRef.current.set(filePath, data.content ?? null)
          setBaseContent(data.content ?? null)
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

  // File is entirely new — show everything as added
  if (baseContent === null) {
    return <NewSpecView content={currentContent} />
  }

  // Still loading initial value (shouldn't reach here due to loading guard, but satisfies TS)
  if (baseContent === undefined) {
    return null
  }

  // No changes
  if (baseContent === currentContent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-[var(--text-faint)]">No changes</p>
      </div>
    )
  }

  return (
    <DiffRenderedSpec baseContent={baseContent} currentContent={currentContent} />
  )
}

/** Renders a brand-new spec with all content highlighted as additions. */
function NewSpecView({ content }: { content: string }) {
  const parsed = parseSpec(content)
  return (
    <div className="flex-1 overflow-y-auto flex justify-center">
      <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
        <h1 className="text-[24px] font-bold tracking-[-0.03em] leading-[1.3] mb-6">
          <span className="diff-added">{parsed.frontmatter.title || 'Untitled spec'}</span>
        </h1>
        <div className="text-[14px] text-[var(--text-secondary)] leading-[1.75] prose-workhorse">
          <div className="diff-added">
            <DiffMarkdown content={parsed.content} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Renders a spec with inline tracked changes (word-level diff). */
function DiffRenderedSpec({ baseContent, currentContent }: { baseContent: string; currentContent: string }) {
  const baseParsed = useMemo(() => parseSpec(baseContent), [baseContent])
  const currentParsed = useMemo(() => parseSpec(currentContent), [currentContent])

  const titleChanged = baseParsed.frontmatter.title !== currentParsed.frontmatter.title

  // Compute word-level diff of the body content
  const bodySegments = useMemo(
    () => diffWords(baseParsed.content, currentParsed.content),
    [baseParsed.content, currentParsed.content],
  )

  return (
    <div className="flex-1 overflow-y-auto flex justify-center">
      <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
        {/* Title */}
        <h1 className="text-[24px] font-bold tracking-[-0.03em] leading-[1.3] mb-6">
          {titleChanged ? (
            <>
              <span className="diff-removed">{baseParsed.frontmatter.title}</span>
              <span className="diff-added">{currentParsed.frontmatter.title}</span>
            </>
          ) : (
            currentParsed.frontmatter.title || 'Untitled spec'
          )}
        </h1>

        {/* Body with inline diff */}
        <div className="text-[14px] text-[var(--text-secondary)] leading-[1.75] prose-workhorse">
          <DiffMarkdownSegments segments={bodySegments} />
        </div>
      </div>
    </div>
  )
}

/**
 * Renders markdown content (used for new files where everything is an addition).
 * Simple markdown rendering inline.
 */
function DiffMarkdown({ content }: { content: string }) {
  const html = useMemo(() => renderDiffMarkdown(content), [content])
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

/**
 * Renders word-level diff segments as formatted markdown with inline change markers.
 * Processes the segments to produce markdown with <ins> and <del> annotations.
 */
function DiffMarkdownSegments({ segments }: { segments: Segment[] }) {
  // Merge segments back into annotated markdown, then render
  const html = useMemo(() => {
    // Build annotated text: wrap added/removed in placeholder markers,
    // then render the whole thing as markdown, preserving the markers.
    let annotated = ''
    for (const seg of segments) {
      if (seg.type === 'unchanged') {
        annotated += seg.text
      } else if (seg.type === 'added') {
        annotated += `\x01ADD_START\x01${seg.text}\x01ADD_END\x01`
      } else if (seg.type === 'removed') {
        annotated += `\x01DEL_START\x01${seg.text}\x01DEL_END\x01`
      }
    }

    // Render the annotated markdown
    let rendered = renderDiffMarkdown(annotated)

    // Replace markers with HTML spans
    rendered = rendered
      .replace(/\x01ADD_START\x01/g, '<span class="diff-added">')
      .replace(/\x01ADD_END\x01/g, '</span>')
      .replace(/\x01DEL_START\x01/g, '<span class="diff-removed">')
      .replace(/\x01DEL_END\x01/g, '</span>')

    return rendered
  }, [segments])

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

// --- Markdown renderer (simplified from MarkdownContent.tsx) ---

function renderDiffMarkdown(md: string): string {
  if (!md) return ''

  let html = md

  const placeholders: string[] = []
  function placeholder(content: string): string {
    const idx = placeholders.length
    placeholders.push(content)
    return `\x00PH${idx}\x00`
  }

  // Extract fenced code blocks
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang: string, code: string) =>
      placeholder(`<pre class="code-block"><code>${escapeHtml(code)}</code></pre>`),
  )

  // Extract markdown tables
  html = html.replace(
    /(?:^\|.+\|[ \t]*\n\|[ \t]*[-:]+[-| :\t]*\|[ \t]*\n(?:\|.+\|[ \t]*\n?)*)/gm,
    (match) => {
      const rows = match.trim().split('\n')
      if (rows.length < 2) return match
      const parseRow = (row: string) =>
        row.split('|').slice(1, -1).map((cell) => cell.trim())
      const headerCells = parseRow(rows[0])
      const alignRow = parseRow(rows[1])
      const aligns = alignRow.map((cell) => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center'
        if (cell.endsWith(':')) return 'right'
        return 'left'
      })
      const thead = `<thead><tr>${headerCells.map((c, i) => `<th style="text-align:${aligns[i] ?? 'left'}">${escapeHtml(c)}</th>`).join('')}</tr></thead>`
      const bodyRows = rows.slice(2).map((row) => {
        const cells = parseRow(row)
        return `<tr>${cells.map((c, i) => `<td style="text-align:${aligns[i] ?? 'left'}">${escapeHtml(c)}</td>`).join('')}</tr>`
      }).join('')
      const tbody = bodyRows ? `<tbody>${bodyRows}</tbody>` : ''
      return placeholder(`<table class="md-table">${thead}${tbody}</table>`)
    },
  )

  // Escape remaining text (preserving \x00 and \x01 markers)
  html = escapeHtmlPreserveMarkers(html)

  // Restore placeholders
  html = html.replace(/\x00PH(\d+)\x00/g, (_match, idx: string) => {
    const i = parseInt(idx, 10)
    return placeholders[i] ?? _match
  })

  // Markdown formatting
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Checkbox lists (must come before regular lists)
  html = html.replace(
    /(?:^- \[[ xX]\] .+$\n?)+/gm,
    (match) => {
      const items = match.trim().split('\n')
      return `<ul class="checklist">${items.map((item) => {
        const checked = item.match(/^- \[[xX]\]\s+(.+)/)
        const unchecked = item.match(/^- \[\s*\]\s+(.+)/)
        if (checked) return `<li class="check-item done"><span class="check-box done">✓</span>${checked[1]}</li>`
        if (unchecked) return `<li class="check-item"><span class="check-box"></span>${unchecked[1]}</li>`
        return `<li>${item.replace(/^- /, '')}</li>`
      }).join('')}</ul>`
    },
  )

  // Numbered lists
  html = html.replace(
    /(?:^\d+\.\s+.+$\n?)+/gm,
    (match) => {
      const items = match.trim().split('\n')
      return `<ol>${items.map((i) => `<li>${i.replace(/^\d+\.\s+/, '')}</li>`).join('')}</ol>`
    },
  )

  // Unordered lists
  html = html.replace(
    /(?:^[-*]\s+.+$\n?)+/gm,
    (match) => {
      const items = match.trim().split('\n')
      return `<ul>${items.map((i) => `<li>${i.replace(/^[-*]\s+/, '')}</li>`).join('')}</ul>`
    },
  )

  // Paragraphs
  html = html
    .split('\n\n')
    .map((block) => {
      block = block.trim()
      if (!block) return ''
      if (block.startsWith('<')) return block
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`
    })
    .join('')

  return html
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Escape HTML but preserve \x00 (placeholder) and \x01 (diff marker) bytes. */
function escapeHtmlPreserveMarkers(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// --- Word-level diff algorithm ---

/**
 * Compute a word-level diff between two strings.
 * Uses a simple LCS-based approach on word tokens.
 */
function diffWords(oldText: string, newText: string): Segment[] {
  const oldTokens = tokenize(oldText)
  const newTokens = tokenize(newText)

  // Compute LCS table
  const m = oldTokens.length
  const n = newTokens.length

  // For large inputs, use a greedy approach instead of full DP
  if (m * n > 1_000_000) {
    return greedyWordDiff(oldTokens, newTokens)
  }

  // Standard LCS DP
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to get the diff
  const segments: Segment[] = []
  let i = m
  let j = n

  // Collect operations in reverse, then reverse
  const ops: Array<{ type: SegmentType; text: string }> = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      ops.push({ type: 'unchanged', text: oldTokens[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'added', text: newTokens[j - 1] })
      j--
    } else {
      ops.push({ type: 'removed', text: oldTokens[i - 1] })
      i--
    }
  }

  ops.reverse()

  // Merge consecutive segments of the same type
  for (const op of ops) {
    const last = segments[segments.length - 1]
    if (last && last.type === op.type) {
      last.text += op.text
    } else {
      segments.push({ ...op })
    }
  }

  return segments
}

/**
 * Greedy word diff for large inputs — trades optimality for speed.
 * Scans forward matching equal words, collecting runs of removed/added.
 */
function greedyWordDiff(oldTokens: string[], newTokens: string[]): Segment[] {
  const segments: Segment[] = []
  let i = 0
  let j = 0

  while (i < oldTokens.length && j < newTokens.length) {
    if (oldTokens[i] === newTokens[j]) {
      const last = segments[segments.length - 1]
      if (last && last.type === 'unchanged') {
        last.text += oldTokens[i]
      } else {
        segments.push({ type: 'unchanged', text: oldTokens[i] })
      }
      i++
      j++
    } else {
      // Look ahead to find next common word
      const lookAhead = 20
      let foundOld = -1
      let foundNew = -1

      for (let k = 1; k <= lookAhead; k++) {
        if (j + k < newTokens.length && oldTokens[i] === newTokens[j + k]) {
          foundNew = j + k
          break
        }
        if (i + k < oldTokens.length && oldTokens[i + k] === newTokens[j]) {
          foundOld = i + k
          break
        }
      }

      if (foundNew >= 0) {
        // Added words
        let added = ''
        while (j < foundNew) { added += newTokens[j]; j++ }
        segments.push({ type: 'added', text: added })
      } else if (foundOld >= 0) {
        // Removed words
        let removed = ''
        while (i < foundOld) { removed += oldTokens[i]; i++ }
        segments.push({ type: 'removed', text: removed })
      } else {
        // No match found nearby — emit as removed + added
        segments.push({ type: 'removed', text: oldTokens[i] })
        segments.push({ type: 'added', text: newTokens[j] })
        i++
        j++
      }
    }
  }

  // Remaining
  if (i < oldTokens.length) {
    let removed = ''
    while (i < oldTokens.length) { removed += oldTokens[i]; i++ }
    segments.push({ type: 'removed', text: removed })
  }
  if (j < newTokens.length) {
    let added = ''
    while (j < newTokens.length) { added += newTokens[j]; j++ }
    segments.push({ type: 'added', text: added })
  }

  return segments
}

/**
 * Tokenize text into words, preserving whitespace and newlines as separate tokens.
 * This ensures diff granularity at the word level while preserving formatting.
 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  const regex = /(\S+|\s+)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0])
  }
  return tokens
}
