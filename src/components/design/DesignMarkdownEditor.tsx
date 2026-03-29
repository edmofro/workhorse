'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Pencil, Check } from 'lucide-react'
import { MarkdownContent } from '../card/MarkdownContent'

interface DesignMarkdownEditorProps {
  content: string
  filePath: string
  owner: string
  repo: string
  branch: string
  onSaved: (newContent: string) => void
}

/**
 * Markdown editor for design library files.
 * Same editing interface as the spec editor, but commits directly to main.
 */
export function DesignMarkdownEditor({
  content,
  filePath,
  owner,
  repo,
  branch,
  onSaved,
}: DesignMarkdownEditorProps) {
  const [editing, setEditing] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [rawContent, setRawContent] = useState(content)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external content changes when not editing
  useEffect(() => {
    if (!editing) setRawContent(content)
  }, [content, editing])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const autoSave = useCallback(
    (newContent: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaving(true)
        try {
          const res = await fetch('/api/design-library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              owner,
              repo,
              branch,
              path: filePath,
              content: newContent,
            }),
          })
          if (res.ok) {
            setLastSaved(
              new Date().toLocaleTimeString('en-AU', {
                hour: 'numeric',
                minute: '2-digit',
              }),
            )
            onSaved(newContent)
          }
        } finally {
          setSaving(false)
        }
      }, 1500)
    },
    [owner, repo, branch, filePath, onSaved],
  )

  function handleRawChange(value: string) {
    setRawContent(value)
    autoSave(value)
  }

  function handleBodyChange(newBody: string) {
    // Strip frontmatter, apply body change, reconstruct
    const fmMatch = rawContent.match(/^(---\n[\s\S]*?\n---\n)/)
    const full = fmMatch ? fmMatch[1] + newBody : newBody
    setRawContent(full)
    autoSave(full)
  }

  // Extract body (without frontmatter) for the rich editor
  function getBody(): string {
    const match = rawContent.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
    return match ? match[1] : rawContent
  }

  // View mode
  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div />
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
          >
            <Pencil size={11} />
            Edit
          </button>
        </div>
        <div className="text-[14px] text-[var(--text-secondary)] leading-[1.75]">
          <MarkdownContent content={rawContent} />
        </div>
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
              onClick={() => setEditing(false)}
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
            {saving ? 'Saving...' : `Saved at ${lastSaved}`}
          </p>
        )}
      </div>
    )
  }

  // Rich editor mode
  const body = getBody()

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
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer"
          >
            <Check size={11} />
            Done editing
          </button>
        </div>
      </div>

      <DesignBodyEditor value={body} onChange={handleBodyChange} />

      {lastSaved && (
        <p className="text-[11px] text-[var(--text-faint)] mt-4">
          {saving ? 'Saving...' : `Saved at ${lastSaved}`}
        </p>
      )}
    </div>
  )
}

function DesignBodyEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
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
              className="w-full text-[16px] font-semibold tracking-[-0.01em] leading-[1.3] bg-transparent border-none outline-none mb-3 pb-[6px]"
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
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
      }
      currentHeading = h2Match[1]
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })

  if (sections.length === 0 || (sections.length === 1 && !sections[0].heading && !sections[0].content)) {
    return [{ heading: null, content: '' }]
  }

  return sections
}

function sectionsToMarkdown(sections: Section[]): string {
  return sections
    .map((s) => (s.heading ? `## ${s.heading}\n\n${s.content}` : s.content))
    .join('\n\n')
}
