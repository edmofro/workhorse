'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Pencil, Check, Monitor, Tablet, Smartphone } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ChatMessage } from '../card/ChatMessage'
import { ChatInput } from '../card/ChatInput'

interface DesignHtmlEditorProps {
  content: string
  fileName: string
  filePath: string
  owner: string
  repo: string
  branch: string
  onSaved: (newContent: string) => void
}

const DEVICES = [
  { key: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
  { key: 'tablet', label: 'Tablet', icon: Tablet, width: '768px' },
  { key: 'mobile', label: 'Mobile', icon: Smartphone, width: '375px' },
] as const

type DeviceKey = (typeof DEVICES)[number]['key']

/**
 * HTML editor for design library components, views, and mockups.
 * Uses the same mockup viewer interface as within cards:
 * - Device toggle for responsive preview
 * - Inspector-style CSS tweaks via a property panel
 * - AI conversational edits via floating chat
 * All edits commit directly to main.
 */
export function DesignHtmlEditor({
  content,
  fileName,
  filePath,
  owner,
  repo,
  branch,
  onSaved,
}: DesignHtmlEditorProps) {
  const [editing, setEditing] = useState(false)
  const [device, setDevice] = useState<DeviceKey>('desktop')
  const [htmlContent, setHtmlContent] = useState(content)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<
    { id: string; role: 'user' | 'assistant'; content: string; userName: string; createdAt: string }[]
  >([])
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [selectedCss, setSelectedCss] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!editing) setHtmlContent(content)
  }, [content, editing])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const currentDevice = DEVICES.find((d) => d.key === device)!

  const save = useCallback(
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

  function handleChatSend(message: string) {
    setChatMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        userName: 'You',
        createdAt: new Date().toISOString(),
      },
    ])
    // TODO: Wire to AI endpoint for conversational edits
    // For now, acknowledge the message
    setChatMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'AI-assisted editing for design files will be connected shortly. For now, use the source editor to make changes directly.',
        userName: 'Workhorse',
        createdAt: new Date().toISOString(),
      },
    ])
  }

  function handleSourceEdit(newHtml: string) {
    setHtmlContent(newHtml)
    save(newHtml)
  }

  function handleCssChange(property: string, value: string) {
    setSelectedCss((prev) => ({ ...prev, [property]: value }))
  }

  // View mode (not editing)
  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
          >
            <Pencil size={11} />
            Edit
          </button>
        </div>
        <div className="border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden">
          <iframe
            srcDoc={htmlContent}
            className="w-full border-none"
            style={{ minHeight: '500px' }}
            sandbox="allow-scripts"
            title={fileName}
          />
        </div>
      </div>
    )
  }

  // Editing mode — full mockup viewer interface
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-page)]">
      {/* Toolbar */}
      <div
        className="flex items-center px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0"
        style={{ height: '52px' }}
      >
        <span className="text-[15px] font-semibold tracking-[-0.01em]">
          {fileName}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {/* Device toggle */}
          <div className="inline-flex bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-[var(--radius-default)] p-[2px] gap-[1px]">
            {DEVICES.map((d) => {
              const Icon = d.icon
              return (
                <button
                  key={d.key}
                  onClick={() => setDevice(d.key)}
                  className={cn(
                    'px-[10px] py-[5px] rounded-[var(--radius-md)] text-xs font-medium leading-none transition-colors duration-100 cursor-pointer inline-flex items-center gap-[5px]',
                    d.key === device
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
                  )}
                >
                  <Icon size={12} />
                  {d.label}
                </button>
              )
            })}
          </div>

          {/* Inspector toggle */}
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className={cn(
              'px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium transition-colors duration-100 cursor-pointer',
              inspectorOpen
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)]',
            )}
          >
            Inspector
          </button>

          {/* Source toggle */}
          <SourceEditorToggle
            htmlContent={htmlContent}
            onChange={handleSourceEdit}
          />

          {/* Done */}
          <button
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer"
          >
            <Check size={11} />
            Done
          </button>

          <button
            onClick={() => setEditing(false)}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Preview area */}
        <div className="flex-1 flex items-start justify-center overflow-auto p-8 bg-[var(--bg-mockup-stage)]">
          <div
            className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden transition-[width] duration-300"
            style={{ width: currentDevice.width, maxWidth: '100%', minHeight: '400px' }}
          >
            <iframe
              srcDoc={htmlContent}
              className="w-full border-none"
              style={{ minHeight: '600px' }}
              sandbox="allow-scripts"
              title={fileName}
            />
          </div>
        </div>

        {/* Inspector panel */}
        {inspectorOpen && (
          <aside
            className="border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 overflow-y-auto"
            style={{ width: '280px' }}
          >
            <div className="p-4 border-b border-[var(--border-subtle)]">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                CSS Inspector
              </span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[12px] text-[var(--text-faint)]">
                Select an element in the preview to inspect and tweak its styles.
              </p>
              {Object.entries(selectedCss).map(([prop, val]) => (
                <div key={prop} className="flex items-center gap-2">
                  <label className="text-[11px] font-mono text-[var(--text-muted)] w-[100px] shrink-0 truncate">
                    {prop}
                  </label>
                  <input
                    value={val}
                    onChange={(e) => handleCssChange(prop, e.target.value)}
                    className="flex-1 text-[12px] font-mono bg-[var(--bg-page)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-2 py-1 outline-none focus:border-[var(--accent)]"
                  />
                </div>
              ))}
              {Object.keys(selectedCss).length === 0 && (
                <div className="text-[12px] text-[var(--text-faint)] italic">
                  No element selected
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Floating chat pill */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 bottom-5 px-5 py-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full shadow-[var(--shadow-md)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
          >
            Chat about this design
          </button>
        )}

        {/* Floating chat panel */}
        {chatOpen && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[16px] shadow-[var(--shadow-lg)] flex flex-col overflow-hidden"
            style={{ width: '640px', maxWidth: 'calc(100% - 40px)', maxHeight: '60vh' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                Chat
              </span>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              {chatMessages.length === 0 && (
                <p className="text-[13px] text-[var(--text-faint)] text-center py-4">
                  Suggest changes to this design
                </p>
              )}
              {chatMessages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  userName={msg.userName}
                  timestamp={msg.createdAt}
                />
              ))}
            </div>

            <ChatInput
              onSend={handleChatSend}
              placeholder="Suggest changes..."
              compact
            />
          </div>
        )}
      </div>

      {/* Save status */}
      {lastSaved && (
        <div className="absolute bottom-2 right-4 text-[11px] text-[var(--text-faint)]">
          {saving ? 'Saving...' : `Saved at ${lastSaved}`}
        </div>
      )}
    </div>
  )
}

/** Toggle button that opens an inline source editor overlay */
function SourceEditorToggle({
  htmlContent,
  onChange,
}: {
  htmlContent: string
  onChange: (html: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [localHtml, setLocalHtml] = useState(htmlContent)

  useEffect(() => {
    setLocalHtml(htmlContent)
  }, [htmlContent])

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium transition-colors duration-100 cursor-pointer',
          open
            ? 'bg-[var(--accent)] text-white'
            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)]',
        )}
      >
        Source
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] flex flex-col" style={{ width: '800px', maxWidth: '90vw', height: '70vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <span className="text-[13px] font-semibold text-[var(--text-secondary)]">Source editor</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onChange(localHtml); setOpen(false) }}
                  className="px-3 py-[5px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
                >
                  Apply
                </button>
                <button
                  onClick={() => { setLocalHtml(htmlContent); setOpen(false) }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors duration-100"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <textarea
              value={localHtml}
              onChange={(e) => setLocalHtml(e.target.value)}
              className="flex-1 font-mono text-[13px] leading-[1.6] text-[var(--text-secondary)] bg-[var(--bg-inset)] p-4 outline-none resize-none border-none"
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </>
  )
}
