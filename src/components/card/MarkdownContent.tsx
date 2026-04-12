'use client'

import { useMemo } from 'react'

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const html = useMemo(() => renderMarkdown(content), [content])

  return (
    <div
      className="prose-workhorse"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function stripFrontmatter(md: string): string {
  const match = md.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
  return match ? match[1] : md
}

function renderMarkdown(md: string): string {
  if (!md) return ''

  // Strip YAML frontmatter if present
  let html = stripFrontmatter(md)

  // Placeholder approach: extract special blocks from raw markdown into safe HTML,
  // then escape remaining text, then re-insert the placeholders.

  const placeholders: string[] = []
  function placeholder(content: string): string {
    const idx = placeholders.length
    placeholders.push(content)
    return `\x00PH${idx}\x00`
  }

  // Extract and render spec blocks
  html = html.replace(
    /```spec\n([\s\S]*?)```/g,
    (_match, content: string) => {
      const lines = content.trim().split('\n')
      let title = 'Spec extract'

      // Parse optional frontmatter
      if (lines[0] === '---') {
        const endIdx = lines.indexOf('---', 1)
        if (endIdx > 0) {
          const frontmatter = lines.slice(1, endIdx).join('\n')
          const titleMatch = frontmatter.match(/title:\s*(.+)/)
          if (titleMatch) title = titleMatch[1].trim()
          lines.splice(0, endIdx + 1)
        }
      }

      const criteriaHtml = lines
        .map((line) => {
          const checked = line.match(/^\s*-\s*\[x\]\s*(.+)/i)
          const unchecked = line.match(/^\s*-\s*\[\s*\]\s*(.+)/)
          const question = line.match(/^>\s*Open question:\s*(.+)/i)

          if (checked) {
            return `<div class="spec-criterion done"><span class="spec-check done">✓</span><span>${escapeHtml(checked[1])}</span></div>`
          }
          if (unchecked) {
            return `<div class="spec-criterion"><span class="spec-check"></span><span>${escapeHtml(unchecked[1])}</span></div>`
          }
          if (question) {
            return `<div class="spec-question">${escapeHtml(question[1])}</div>`
          }
          if (line.trim()) {
            return `<p>${escapeHtml(line.trim())}</p>`
          }
          return ''
        })
        .join('')

      return placeholder(`<div class="spec-extract-block"><div class="spec-extract-label">Spec: ${escapeHtml(title)}</div>${criteriaHtml}</div>`)
    },
  )

  // Extract mockup blocks
  html = html.replace(
    /```mockup\n([\s\S]*?)```/g,
    (_match, content: string) => {
      const lines = content.trim().split('\n')
      let title = 'Mockup'

      // Parse title line
      const titleMatch = lines[0]?.match(/^title:\s*(.+)/)
      if (titleMatch) {
        title = titleMatch[1].trim()
        lines.shift()
        if (lines[0] === '---') lines.shift()
      }

      // Mockup HTML is intentionally rendered raw (it IS HTML content)
      return placeholder(`<div class="mockup-block"><div class="mockup-label">${escapeHtml(title)}</div><div class="mockup-preview">${lines.join('\n')}</div></div>`)
    },
  )

  // Extract fenced code blocks BEFORE inline code (prevents inline code regex eating fence content)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang: string, code: string) =>
      placeholder(`<pre class="code-block"><code>${escapeHtml(code)}</code></pre>`),
  )

  // Extract markdown tables before escaping
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

  // Now escape remaining raw text
  html = escapeHtml(html)

  // Restore placeholders (they were escaped, so fix them)
  html = html.replace(/\x00PH(\d+)\x00/g, (_match, idx: string) => {
    const i = parseInt(idx, 10)
    return placeholders[i] ?? _match
  })

  // Basic markdown rendering (now operating on escaped text)
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
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
  // Paragraphs — wrap remaining lines
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
