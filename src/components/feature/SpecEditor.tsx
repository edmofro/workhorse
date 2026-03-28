'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { updateSpecContent } from '../../lib/actions/specs'
import { parseSpec, serializeSpec, type SpecFrontmatter } from '../../lib/specs/format'

interface SpecEditorProps {
  spec: {
    id: string
    filePath: string
    content: string
    isNew: boolean
  }
  onContentChange: (id: string, content: string) => void
}

export function SpecEditor({ spec, onContentChange }: SpecEditorProps) {
  const parsed = parseSpec(spec.content)
  const [title, setTitle] = useState(parsed.frontmatter.title)
  const [body, setBody] = useState(parsed.content)
  const [showRaw, setShowRaw] = useState(false)
  const [rawContent, setRawContent] = useState(spec.content)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

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
        <button
          onClick={() => setShowRaw(true)}
          className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors duration-100"
        >
          Raw markdown
        </button>
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
