'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { updateSpecContent } from '../../lib/actions/specs'
import { parseSpec, serializeSpec, type SpecFrontmatter } from '../../lib/specs/format'
import { Eye } from 'lucide-react'

interface SpecEditorProps {
  spec: {
    id: string
    filePath: string
    content: string
    isNew: boolean
  }
  onContentChange: (id: string, content: string) => void
  baselineContent?: string | null
}

export function SpecEditor({ spec, onContentChange, baselineContent }: SpecEditorProps) {
  const parsed = parseSpec(spec.content)
  const [title, setTitle] = useState(parsed.frontmatter.title)
  const [body, setBody] = useState(parsed.content)
  const [showRaw, setShowRaw] = useState(false)
  const [showChanges, setShowChanges] = useState(false)
  const [rawContent, setRawContent] = useState(spec.content)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const canShowChanges = !spec.isNew && !!baselineContent

  const save = useCallback(
    (content: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        await updateSpecContent(spec.id, content)
        onContentChange(spec.id, content)
        setLastSaved(new Date().toLocaleTimeString('en-AU', {
          hour: 'numeric',
          minute: '2-digit',
        }))
      }, 500)
    },
    [spec.id, onContentChange],
  )

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle)
    const fm: SpecFrontmatter = { ...parsed.frontmatter, title: newTitle }
    const full = serializeSpec(fm, body)
    setRawContent(full)
    save(full)
  }

  function handleBodyChange(newBody: string) {
    setBody(newBody)
    const fm: SpecFrontmatter = { ...parsed.frontmatter, title }
    const full = serializeSpec(fm, newBody)
    setRawContent(full)
    save(full)
  }

  function handleRawChange(raw: string) {
    setRawContent(raw)
    const reParsed = parseSpec(raw)
    setTitle(reParsed.frontmatter.title)
    setBody(reParsed.content)
    save(raw)
  }

  // Tracked changes view
  if (showChanges && baselineContent) {
    const baselineParsed = parseSpec(baselineContent)
    const diffResult = computeWordDiff(baselineParsed.content, body)

    return (
      <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
            Tracked changes
          </span>
          <button
            onClick={() => setShowChanges(false)}
            className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
          >
            Back to editor
          </button>
        </div>

        {/* Title diff */}
        <div className="mb-6">
          {baselineParsed.frontmatter.title !== title ? (
            <div className="text-[24px] font-bold tracking-[-0.03em] leading-[1.3]">
              <span className="bg-[rgba(239,68,68,0.12)] line-through text-[var(--text-muted)]">
                {baselineParsed.frontmatter.title}
              </span>{' '}
              <span className="bg-[rgba(16,185,129,0.12)]">
                {title}
              </span>
            </div>
          ) : (
            <div className="text-[24px] font-bold tracking-[-0.03em] leading-[1.3]">
              {title}
            </div>
          )}
        </div>

        {/* Body diff */}
        <div className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
          {diffResult.map((segment, i) => {
            if (segment.type === 'equal') {
              return <span key={i}>{segment.text}</span>
            }
            if (segment.type === 'delete') {
              return (
                <span
                  key={i}
                  className="bg-[rgba(239,68,68,0.12)] line-through text-[var(--text-muted)]"
                >
                  {segment.text}
                </span>
              )
            }
            if (segment.type === 'insert') {
              return (
                <span
                  key={i}
                  className="bg-[rgba(16,185,129,0.12)]"
                >
                  {segment.text}
                </span>
              )
            }
            return null
          })}
        </div>

        {lastSaved && (
          <p className="text-[11px] text-[var(--text-faint)] mt-4">
            Auto-saved at {lastSaved}
          </p>
        )}
      </div>
    )
  }

  if (showRaw) {
    return (
      <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
            Raw markdown
          </span>
          <button
            onClick={() => setShowRaw(false)}
            className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
          >
            Rich editor
          </button>
        </div>
        <textarea
          value={rawContent}
          onChange={(e) => handleRawChange(e.target.value)}
          className="w-full min-h-[60vh] font-mono text-[13px] leading-[1.6] text-[var(--text-secondary)] bg-transparent border border-[var(--border-default)] rounded-[var(--radius-default)] p-4 outline-none focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] transition-[border-color,box-shadow] duration-150 resize-y"
        />
        {lastSaved && (
          <p className="text-[11px] text-[var(--text-faint)] mt-2">
            Auto-saved at {lastSaved}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-[var(--text-faint)] font-mono">
          {spec.filePath}
        </span>
        <div className="flex items-center gap-3">
          {canShowChanges && (
            <button
              onClick={() => setShowChanges(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors duration-100"
            >
              <Eye size={11} />
              Show changes
            </button>
          )}
          <button
            onClick={() => setShowRaw(true)}
            className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors duration-100"
          >
            Raw markdown
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        className="w-full text-[24px] font-bold tracking-[-0.03em] leading-[1.3] bg-transparent border-none outline-none mb-2"
        placeholder="Spec title"
      />

      <div className="text-[14px] text-[var(--text-muted)] mb-8">
        {spec.isNew ? 'New spec' : 'Editing existing'} · {parsed.frontmatter.card ?? 'No card'}
        {' · '}
        {parsed.frontmatter.status ?? 'draft'}
      </div>

      {/* Body editor */}
      <SpecBodyEditor value={body} onChange={handleBodyChange} />

      {lastSaved && (
        <p className="text-[11px] text-[var(--text-faint)] mt-4">
          Auto-saved at {lastSaved}
        </p>
      )}
    </div>
  )
}

function SpecBodyEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  // Render markdown sections as editable blocks
  const sections = parseSections(value)

  return (
    <div className="space-y-6">
      {sections.map((section, idx) => (
        <div key={idx}>
          {section.heading && (
            <input
              value={section.heading}
              onChange={(e) => {
                const newSections = [...sections]
                newSections[idx] = { ...newSections[idx], heading: e.target.value }
                onChange(sectionsToMarkdown(newSections))
              }}
              className="w-full text-[16px] font-semibold tracking-[-0.01em] leading-[1.3] bg-transparent border-none outline-none mb-3 pb-[6px] border-b border-[var(--border-subtle)]"
              style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border-subtle)' }}
            />
          )}
          <textarea
            value={section.content}
            onChange={(e) => {
              const newSections = [...sections]
              newSections[idx] = { ...newSections[idx], content: e.target.value }
              onChange(sectionsToMarkdown(newSections))
            }}
            className="w-full text-[14px] text-[var(--text-secondary)] leading-[1.75] bg-transparent border-none outline-none resize-none min-h-[60px] placeholder:text-[var(--text-faint)]"
            placeholder="Add content..."
            rows={Math.max(3, section.content.split('\n').length + 1)}
          />
        </div>
      ))}
    </div>
  )
}

interface Section {
  heading: string | null
  content: string
}

function parseSections(markdown: string): Section[] {
  const lines = markdown.split('\n')
  const sections: Section[] = []
  let currentHeading: string | null = null
  let currentContent: string[] = []

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/)
    if (h2Match) {
      if (currentHeading !== null || currentContent.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join('\n').trim(),
        })
      }
      currentHeading = h2Match[1]
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  // Push remaining content
  sections.push({
    heading: currentHeading,
    content: currentContent.join('\n').trim(),
  })

  // If we have nothing, provide a default
  if (sections.length === 0 || (sections.length === 1 && !sections[0].heading && !sections[0].content)) {
    return [{ heading: null, content: '' }]
  }

  return sections
}

function sectionsToMarkdown(sections: Section[]): string {
  return sections
    .map((s) => {
      if (s.heading) {
        return `## ${s.heading}\n\n${s.content}`
      }
      return s.content
    })
    .join('\n\n')
}

// Simple word-level diff algorithm
interface DiffSegment {
  type: 'equal' | 'insert' | 'delete'
  text: string
}

function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = tokenize(oldText)
  const newWords = tokenize(newText)

  // Build LCS table
  const m = oldWords.length
  const n = newWords.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find diff
  const segments: DiffSegment[] = []
  let i = m
  let j = n

  const rawSegments: DiffSegment[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      rawSegments.unshift({ type: 'equal', text: oldWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawSegments.unshift({ type: 'insert', text: newWords[j - 1] })
      j--
    } else {
      rawSegments.unshift({ type: 'delete', text: oldWords[i - 1] })
      i--
    }
  }

  // Merge adjacent segments of the same type
  for (const seg of rawSegments) {
    const last = segments[segments.length - 1]
    if (last && last.type === seg.type) {
      last.text += seg.text
    } else {
      segments.push({ ...seg })
    }
  }

  return segments
}

function tokenize(text: string): string[] {
  // Split into words and whitespace, preserving whitespace as separate tokens
  const tokens: string[] = []
  const regex = /(\s+|\S+)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0])
  }
  return tokens
}
