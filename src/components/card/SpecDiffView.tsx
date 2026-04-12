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
 *
 * Changes are grouped sensibly: a single changed word appears inline, a run of
 * changed words appears as a contiguous block, and short unchanged runs between
 * changes are absorbed so the diff reads as one grouped change rather than
 * alternating flickers.
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
  const html = useMemo(() => renderMarkdown(parsed.content), [parsed.content])
  return (
    <div className="flex-1 overflow-y-auto flex justify-center">
      <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
        <h1 className="text-[24px] font-bold tracking-[-0.03em] leading-[1.3] mb-6">
          <span className="diff-added">{parsed.frontmatter.title || 'Untitled spec'}</span>
        </h1>
        <div className="text-[14px] text-[var(--text-secondary)] leading-[1.75] prose-workhorse">
          <div className="diff-added" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  )
}

/** Renders a spec with inline tracked changes. */
function DiffRenderedSpec({ baseContent, currentContent }: { baseContent: string; currentContent: string }) {
  const baseParsed = useMemo(() => parseSpec(baseContent), [baseContent])
  const currentParsed = useMemo(() => parseSpec(currentContent), [currentContent])

  const titleChanged = baseParsed.frontmatter.title !== currentParsed.frontmatter.title

  const bodyHtml = useMemo(() => {
    const raw = diffWords(baseParsed.content, currentParsed.content)
    const segments = collapseShortUnchangedRuns(raw)
    const lines = segmentsToLines(segments)
    return renderDiffLines(lines)
  }, [baseParsed.content, currentParsed.content])

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
        <div
          className="text-[14px] text-[var(--text-secondary)] leading-[1.75] prose-workhorse"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Line-by-line rendering — splits diff segments into lines, detects block
// types from clean text, then renders each line with proper markdown
// formatting and inline diff spans.
// ---------------------------------------------------------------------------

interface DiffLine {
  segments: Segment[]
  /** Concatenated text of all segments (for type detection) */
  rawText: string
}

/**
 * Split diff segments into lines. Each DiffLine contains the segments that
 * make up one visual line, with newlines used as split points.
 */
function segmentsToLines(segments: Segment[]): DiffLine[] {
  const lines: DiffLine[] = [{ segments: [], rawText: '' }]

  for (const seg of segments) {
    const parts = seg.text.split('\n')
    for (let p = 0; p < parts.length; p++) {
      if (p > 0) {
        lines.push({ segments: [], rawText: '' })
      }
      const text = parts[p]
      if (text !== '') {
        const current = lines[lines.length - 1]
        current.segments.push({ type: seg.type, text })
        current.rawText += text
      }
    }
  }

  return lines
}

/**
 * Get the "current version" of a line's text (non-removed segments).
 * Falls back to the "base version" (non-added) if the line is entirely removed.
 */
function detectText(segments: Segment[]): string {
  const current = segments.filter(s => s.type !== 'removed').map(s => s.text).join('')
  if (current) return current
  return segments.filter(s => s.type !== 'added').map(s => s.text).join('')
}

/**
 * Strip a prefix of `prefixLen` characters from the "current" (non-removed)
 * segments. Removed segments in the prefix area are dropped (they were part
 * of the old block prefix, e.g. an old checkbox state).
 */
function stripCurrentPrefix(segments: Segment[], prefixLen: number): Segment[] {
  const result: Segment[] = []
  let remaining = prefixLen

  for (const seg of segments) {
    if (seg.type === 'removed') {
      if (remaining > 0) {
        // Removed content in the prefix area — skip (old prefix)
        continue
      }
      result.push({ type: seg.type, text: seg.text })
      continue
    }

    // Unchanged or added segments count toward the prefix
    if (remaining <= 0) {
      result.push({ type: seg.type, text: seg.text })
    } else if (seg.text.length <= remaining) {
      remaining -= seg.text.length
    } else {
      result.push({ type: seg.type, text: seg.text.slice(remaining) })
      remaining = 0
    }
  }

  return result
}

/**
 * Render segments as inline HTML with diff spans and inline markdown.
 * Uses \x01 markers around diff spans so that inline markdown formatting
 * (bold, italic, code) can be applied across segment boundaries.
 */
function renderInlineSegments(segments: Segment[]): string {
  if (segments.length === 0) return ''

  let html = ''
  for (const seg of segments) {
    const escaped = escapeHtml(seg.text)
    if (seg.type === 'added') html += `\x01AS\x01${escaped}\x01AE\x01`
    else if (seg.type === 'removed') html += `\x01DS\x01${escaped}\x01DE\x01`
    else html += escaped
  }

  // Apply inline markdown formatting — markers survive these replacements
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Replace markers with HTML spans
  html = html
    .replace(/\x01AS\x01/g, '<span class="diff-added">')
    .replace(/\x01AE\x01/g, '</span>')
    .replace(/\x01DS\x01/g, '<span class="diff-removed">')
    .replace(/\x01DE\x01/g, '</span>')

  return html
}

/**
 * Render an array of DiffLines as HTML with proper block-level markdown
 * formatting and inline diff spans.
 */
function renderDiffLines(lines: DiffLine[]): string {
  let html = ''
  let i = 0
  let inCodeBlock = false
  let codeSegments: Segment[][] = []

  while (i < lines.length) {
    const line = lines[i]
    const text = detectText(line.segments)

    // --- Code blocks ---
    if (text.trimStart().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeSegments = []
        i++
        continue
      } else {
        // Render accumulated code block
        const allSegs = codeSegments.flatMap((segs, idx) => {
          const result: Segment[] = [...segs]
          if (idx < codeSegments.length - 1) {
            result.push({ type: 'unchanged', text: '\n' })
          }
          return result
        })
        const inner = allSegs.length > 0
          ? renderCodeSegments(allSegs)
          : ''
        html += `<pre class="code-block"><code>${inner}</code></pre>`
        inCodeBlock = false
        i++
        continue
      }
    }

    if (inCodeBlock) {
      codeSegments.push(line.segments)
      i++
      continue
    }

    // --- Empty line (paragraph separator) ---
    if (!line.rawText.trim()) {
      i++
      continue
    }

    // --- Headings ---
    const headingMatch = text.match(/^(#{1,3})\s+/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const content = stripCurrentPrefix(line.segments, headingMatch[0].length)
      const inner = renderInlineSegments(content)
      html += `<h${level}>${inner}</h${level}>`
      i++
      continue
    }

    // --- Checkbox lists ---
    if (text.match(/^- \[[ xX]\]\s+/)) {
      const items: string[] = []
      while (i < lines.length) {
        const l = lines[i]
        const t = detectText(l.segments)
        const cbMatch = t.match(/^- \[[ xX]\]\s+/)
        if (!cbMatch) break
        const checked = !!t.match(/^- \[[xX]\]/)
        const content = stripCurrentPrefix(l.segments, cbMatch[0].length)
        const inner = renderInlineSegments(content)
        const cls = checked ? 'check-item done' : 'check-item'
        const box = checked ? '<span class="check-box done">✓</span>' : '<span class="check-box"></span>'
        items.push(`<li class="${cls}">${box}${inner}</li>`)
        i++
      }
      html += `<ul class="checklist">${items.join('')}</ul>`
      continue
    }

    // --- Ordered lists ---
    if (text.match(/^\d+\.\s+/)) {
      const items: string[] = []
      while (i < lines.length) {
        const l = lines[i]
        const t = detectText(l.segments)
        const olMatch = t.match(/^\d+\.\s+/)
        if (!olMatch) break
        const content = stripCurrentPrefix(l.segments, olMatch[0].length)
        items.push(`<li>${renderInlineSegments(content)}</li>`)
        i++
      }
      html += `<ol>${items.join('')}</ol>`
      continue
    }

    // --- Unordered lists ---
    if (text.match(/^[-*]\s+/)) {
      const items: string[] = []
      while (i < lines.length) {
        const l = lines[i]
        const t = detectText(l.segments)
        const ulMatch = t.match(/^[-*]\s+/)
        if (!ulMatch) break
        const content = stripCurrentPrefix(l.segments, ulMatch[0].length)
        items.push(`<li>${renderInlineSegments(content)}</li>`)
        i++
      }
      html += `<ul>${items.join('')}</ul>`
      continue
    }

    // --- Tables ---
    if (text.match(/^\|/)) {
      const rows: DiffLine[] = []
      while (i < lines.length) {
        const l = lines[i]
        const t = detectText(l.segments)
        if (!t.match(/^\|/)) break
        rows.push(l)
        i++
      }
      html += renderDiffTable(rows)
      continue
    }

    // --- Paragraph: collect consecutive text lines ---
    {
      const paraLines: DiffLine[] = []
      while (i < lines.length) {
        const l = lines[i]
        const t = detectText(l.segments)
        if (!t.trim()) break
        if (t.match(/^#{1,3}\s+/)) break
        if (t.match(/^[-*]\s+/)) break
        if (t.match(/^\d+\.\s+/)) break
        if (t.match(/^\|/)) break
        if (t.trimStart().startsWith('```')) break
        paraLines.push(l)
        i++
      }

      if (paraLines.length > 0) {
        const inner = paraLines
          .map(l => renderInlineSegments(l.segments))
          .join('<br/>')
        html += `<p>${inner}</p>`
      }
    }
  }

  // Handle unclosed code block
  if (inCodeBlock && codeSegments.length > 0) {
    const allSegs = codeSegments.flatMap((segs, idx) => {
      const result: Segment[] = [...segs]
      if (idx < codeSegments.length - 1) {
        result.push({ type: 'unchanged', text: '\n' })
      }
      return result
    })
    html += `<pre class="code-block"><code>${renderCodeSegments(allSegs)}</code></pre>`
  }

  return html
}

/** Render code block segments with diff spans but no markdown formatting. */
function renderCodeSegments(segments: Segment[]): string {
  return segments.map(seg => {
    const escaped = escapeHtml(seg.text)
    if (seg.type === 'added') return `<span class="diff-added">${escaped}</span>`
    if (seg.type === 'removed') return `<span class="diff-removed">${escaped}</span>`
    return escaped
  }).join('')
}

/** Render a markdown table from DiffLines, with inline diff in cells. */
function renderDiffTable(rows: DiffLine[]): string {
  if (rows.length < 2) return ''

  // Parse cells from raw text for structure, but we'll render with segments
  const parseRowCells = (raw: string) =>
    raw.split('|').slice(1, -1).map(c => c.trim())

  const headerText = detectText(rows[0].segments)
  const sepText = rows.length > 1 ? detectText(rows[1].segments) : ''

  const headerCells = parseRowCells(headerText)
  const sepCells = parseRowCells(sepText)
  const isSepRow = sepCells.every(c => /^[-:]+$/.test(c))

  if (!isSepRow) {
    // Not a proper table — render as paragraph
    return rows.map(r => `<p>${renderInlineSegments(r.segments)}</p>`).join('')
  }

  const aligns = sepCells.map(cell => {
    if (cell.startsWith(':') && cell.endsWith(':')) return 'center'
    if (cell.endsWith(':')) return 'right'
    return 'left'
  })

  const thead = `<thead><tr>${headerCells.map((c, idx) =>
    `<th style="text-align:${aligns[idx] ?? 'left'}">${escapeHtml(c)}</th>`
  ).join('')}</tr></thead>`

  const bodyRows = rows.slice(2).map(row => {
    const cellTexts = parseRowCells(detectText(row.segments))
    return `<tr>${cellTexts.map((c, idx) =>
      `<td style="text-align:${aligns[idx] ?? 'left'}">${escapeHtml(c)}</td>`
    ).join('')}</tr>`
  }).join('')

  const tbody = bodyRows ? `<tbody>${bodyRows}</tbody>` : ''
  return `<table class="md-table">${thead}${tbody}</table>`
}

// ---------------------------------------------------------------------------
// Plain markdown renderer (used for new-file view where there are no diffs)
// ---------------------------------------------------------------------------

function renderMarkdown(md: string): string {
  if (!md) return ''

  let html = escapeHtml(md)

  // Fenced code blocks
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang: string, code: string) =>
      `<pre class="code-block"><code>${code}</code></pre>`,
  )

  // Inline formatting
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Checkbox lists
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

  // Ordered lists
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

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// Diff algorithm
// ---------------------------------------------------------------------------

/**
 * Compute a word-level diff between two strings using LCS.
 */
function diffWords(oldText: string, newText: string): Segment[] {
  const oldTokens = tokenize(oldText)
  const newTokens = tokenize(newText)

  const m = oldTokens.length
  const n = newTokens.length

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

  const ops: Array<{ type: SegmentType; text: string }> = []
  let i = m
  let j = n

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
  const segments: Segment[] = []
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
 * Post-process word-level diff segments to collapse short unchanged runs
 * between two changed segments of the same type. This makes the diff read
 * as grouped changes rather than word-by-word flicker.
 *
 * Only same-type neighbours are collapsed. An unchanged bridge between a
 * removed and an added segment is left alone.
 *
 * Runs that cross a line boundary are never collapsed.
 */
function collapseShortUnchangedRuns(segments: Segment[]): Segment[] {
  const COLLAPSE_THRESHOLD = 3
  const result: Segment[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]

    if (
      seg.type === 'unchanged' &&
      result.length > 0 &&
      result[result.length - 1].type !== 'unchanged' &&
      i + 1 < segments.length
    ) {
      const prevType = result[result.length - 1].type
      const next = segments[i + 1]
      const words = seg.text.match(/\S+/g) ?? []

      if (
        next.type === prevType &&
        words.length > 0 &&
        words.length <= COLLAPSE_THRESHOLD &&
        !seg.text.includes('\n')
      ) {
        result[result.length - 1].text += seg.text + next.text
        i++ // consume the next same-type segment
        continue
      }
    }

    // Normal path: merge with last segment if same type, otherwise push
    const last = result[result.length - 1]
    if (last && last.type === seg.type) {
      last.text += seg.text
    } else {
      result.push({ ...seg })
    }
  }

  return result
}

/**
 * Greedy word diff for large inputs — trades optimality for speed.
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
        let added = ''
        while (j < foundNew) { added += newTokens[j]; j++ }
        segments.push({ type: 'added', text: added })
      } else if (foundOld >= 0) {
        let removed = ''
        while (i < foundOld) { removed += oldTokens[i]; i++ }
        segments.push({ type: 'removed', text: removed })
      } else {
        segments.push({ type: 'removed', text: oldTokens[i] })
        segments.push({ type: 'added', text: newTokens[j] })
        i++
        j++
      }
    }
  }

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
 * Tokenize text into words and whitespace as separate tokens.
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
