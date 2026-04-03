'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'
import { createCard } from '../lib/actions/cards'
import { associateAttachmentsWithCard } from '../lib/actions/attachments'
import { useAttachments } from '../lib/hooks/useAttachments'
import { AttachmentButton } from './card/AttachmentButton'
import { AttachmentPreview } from './card/AttachmentPreview'

interface CreateModalProps {
  projectSlug: string
  defaultTeamId?: string
  /** Which mode the modal opened in. */
  defaultMode: 'chat' | 'card'
  onClose: () => void
}

const CONVERSATION_PILLS = [
  { label: 'Interview me', message: 'Interview me on this topic' },
  { label: 'Review specs', message: 'Review the current specs' },
  { label: 'Make changes', message: 'Help me make changes' },
]

export function CreateModal({
  projectSlug,
  defaultTeamId,
  defaultMode,
  onClose,
}: CreateModalProps) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const attachments = useAttachments()

  const isCard = defaultMode === 'card'
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  async function handleSubmit(value: string) {
    if (!value.trim() || busy || attachments.isUploading || (isCard && !defaultTeamId)) return
    setBusy(true)
    setError(null)

    try {
      if (isCard) {
        const input = value.trim()
        let title: string
        let description: string

        const uploaded = attachments.getUploadedAttachments()

        try {
          const res = await fetch('/api/generate-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: input,
              attachmentIds: uploaded.map((a) => a.id),
            }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Generation failed')
          description = data.description || input
          title = data.title || input.split(/[.!?\n]/)[0].slice(0, 60).trim()
          if (data._error) console.warn('[generate-card] API error:', data._error)
        } catch {
          description = input
          title = input.split(/[.!?\n]/)[0].slice(0, 60).trim()
        }

        const card = await createCard({ title, description: description || undefined, teamId: defaultTeamId! })

        if (uploaded.length > 0) {
          try {
            await associateAttachmentsWithCard(card.id, uploaded.map((a) => a.id))
          } catch {
            // Card was created — navigate but warn about attachments
            setError('Card created, but attachments could not be linked. You can re-add them on the card.')
            await new Promise((r) => setTimeout(r, 2000))
          }
        }

        onClose()
        router.push(`${projectSlug}/cards/${card.identifier}`)
      } else {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: value.trim(),
            teamId: defaultTeamId,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to create session')
        onClose()
        router.push(`${projectSlug}/sessions/${data.id}`)
      }
    } catch {
      setError(isCard ? 'Failed to create card. Please try again.' : 'Failed to start conversation. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(prompt)
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (!isCard) return
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null)

    if (files.length > 0) {
      const dt = new DataTransfer()
      for (const f of files) dt.items.add(f)
      attachments.addFiles(dt.files)
    }
  }

  function handlePillClick(pill: { label: string; message: string }) {
    handleSubmit(pill.message)
  }

  const canSend = !!prompt.trim() && !busy && !attachments.isUploading && (isCard ? !!defaultTeamId : true)

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[rgba(28,25,23,0.40)]"
        onClick={() => !busy && onClose()}
      />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] pointer-events-none">
        <div className="w-full max-w-[520px] pointer-events-auto bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] overflow-hidden">
          {/* Header with title and close button */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-[14px] font-medium text-[var(--text-primary)]">
              {isCard ? 'New card' : 'New conversation'}
            </h2>
            <button
              onClick={() => !busy && onClose()}
              className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="px-5 pb-4">
            {/* Pills (conversation mode only) */}
            {!isCard && !busy && (
              <div className="flex flex-wrap gap-2 mb-3">
                {CONVERSATION_PILLS.map((pill) => (
                  <button
                    key={pill.label}
                    onClick={() => handlePillClick(pill)}
                    className="px-3 py-[6px] rounded-[var(--radius-pill)] text-[12px] font-medium bg-[var(--bg-page)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            )}

            {/* Attachment preview */}
            {attachments.hasAttachments && (
              <div className="mb-2">
                <AttachmentPreview
                  pending={attachments.pending}
                  onRemovePending={attachments.removeAttachment}
                  compact
                />
              </div>
            )}

            {/* Input container */}
            <div className={`flex ${isCard ? 'flex-col' : 'items-end'} bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--accent)] focus-within:shadow-[var(--shadow-input-focus)] p-1.5 ${isCard ? 'p-4' : 'pl-4'}`}>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                autoFocus
                rows={isCard ? 4 : 1}
                placeholder={isCard ? 'Describe what needs to be done...' : 'What would you like to discuss?'}
                disabled={busy}
                className={`flex-1 border-none bg-transparent outline-none resize-none text-[14px] leading-[1.5] placeholder:text-[var(--text-faint)] ${isCard ? 'min-h-[96px] py-0' : 'min-h-[24px] py-2'}`}
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              />
              <div className={`flex items-center ${isCard ? 'justify-between mt-3' : ''}`}>
                {isCard && (
                  <AttachmentButton onFiles={attachments.addFiles} disabled={busy} />
                )}
                <button
                  onClick={() => handleSubmit(prompt)}
                  disabled={!canSend}
                  className={`px-4 py-2 bg-[var(--accent)] text-white rounded-[var(--radius-default)] text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-default shrink-0 transition-colors duration-100 hover:bg-[var(--accent-hover)] ${isCard ? 'ml-auto' : ''}`}
                >
                  {busy ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" />
                      {isCard ? 'Creating...' : 'Starting...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {isCard ? 'Create card' : 'Send'}
                      <kbd className="flex items-center gap-0.5 font-sans text-[10px] opacity-60">
                        <span>{isMac ? '⌘' : 'Ctrl'}</span>
                        <span>↵</span>
                      </kbd>
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="mt-2 text-[12px] text-[var(--accent)]">{error}</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
