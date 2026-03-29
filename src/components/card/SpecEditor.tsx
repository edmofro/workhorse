'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { parseSpec, serializeSpec, type SpecFrontmatter } from '../../lib/specs/format'
import { MarkdownContent } from './MarkdownContent'
import { Pencil, Check } from 'lucide-react'

interface SpecEditorProps {
  spec: {
    id: string
    filePath: string
    content: string
    isNew: boolean
  }
  onContentChange: (id: string, content: string) => void
  baselineContent?: string | null
  isEditing?: boolean
  onStartEditing?: () => Promise<boolean> | boolean
  onDoneEditing?: () => void
  cardStatus?: string
}

export function SpecEditor({
  spec,
  onContentChange,
  isEditing = false,
  onStartEditing,
  onDoneEditing,
  cardStatus,
}: SpecEditorProps) {
  const parsed = parseSpec(spec.content)
  const [title, setTitle] = useState(parsed.frontmatter.title)
  const [body, setBody] = useState(parsed.content)
  const [showRaw, setShowRaw] = useState(false)
  const [rawContent, setRawContent] = useState(spec.content)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [editing, setEditing] = useState(isEditing)

  const isInterviewerWorking = cardStatus === 'SPECIFYING'

  const save = useCallback(
    (content: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
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

  async function handleStartEdit() {
    if (onStartEditing) {
      const ok = await onStartEditing()
      if (!ok) return
    }
    setEditing(true)
  }

  function handleDoneEdit() {
    setEditing(false)
    onDoneEditing?.()
  }

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

  // View-only mode (not editing)
  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div />
          <button
            onClick={handleStartEdit}
            className="inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
          >
            <Pencil size={11} />
            Edit
          </button>
        </div>

        {/* Title */}
        <h1 className="text-[24px] font-bold tracking-[-0.03em] leading-[1.3] mb-2">
          {title || 'Untitled spec'}
        </h1>

        <div className="text-[14px] text-[var(--text-muted)] mb-8">
          {parsed.frontmatter.card && (
            <span className="font-mono text-[12px] mr-2">{parsed.frontmatter.card}</span>
          )}
          <span className="capitalize">{parsed.frontmatter.status ?? 'draft'}</span>
        </div>

        {/* Body (read-only rendered) */}
        <div className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
          <MarkdownContent content={body} />
        </div>

        {isInterviewerWorking && (
          <div className="mt-6 px-3 py-2 rounded-[var(--radius-default)] bg-[var(--amber-alpha)] border border-[rgba(180,83,9,0.15)] text-[12px] text-[var(--text-muted)]">
            Interviewer is working... spec may update automatically.
          </div>
        )}
      </div>
    )
  }

  // Raw markdown mode
  if (showRaw) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
            Raw markdown
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRaw(false)}
              className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
            >
              Rich editor
            </button>
            <button
              onClick={handleDoneEdit}
              className="inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer"
            >
              <Check size={11} />
              Done editing
            </button>
          </div>
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

  // Rich editor mode
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRaw(true)}
            className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors duration-100"
          >
            Raw markdown
          </button>
          <button
            onClick={handleDoneEdit}
            className="inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer"
          >
            <Check size={11} />
            Done editing
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
        {parsed.frontmatter.card && (
          <span className="font-mono text-[12px] mr-2">{parsed.frontmatter.card}</span>
        )}
        <span className="capitalize">{parsed.frontmatter.status ?? 'draft'}</span>
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
