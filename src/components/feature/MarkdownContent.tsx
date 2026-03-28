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

function renderMarkdown(md: string): string {
  if (!md) return ''

  let html = md

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
            return `<div class="spec-criterion done"><span class="spec-check done">✓</span><span>${checked[1]}</span></div>`
          }
          if (unchecked) {
            return `<div class="spec-criterion"><span class="spec-check"></span><span>${unchecked[1]}</span></div>`
          }
          if (question) {
            return `<div class="spec-question">${question[1]}</div>`
          }
          if (line.trim()) {
            return `<p>${line.trim()}</p>`
          }
          return ''
        })
        .join('')

      return `<div class="spec-extract-block"><div class="spec-extract-label">Spec: ${escapeHtml(title)}</div>${criteriaHtml}</div>`
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

      return `<div class="mockup-block"><div class="mockup-label">${escapeHtml(title)}</div><div class="mockup-preview">${lines.join('\n')}</div></div>`
    },
  )

  // Basic markdown rendering
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Code blocks
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="code-block"><code>$2</code></pre>',
  )
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
