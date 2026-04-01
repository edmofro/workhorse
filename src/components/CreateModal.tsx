'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createCard } from '../lib/actions/cards'

interface CreateModalProps {
  projectSlug: string
  defaultTeamId?: string
  /** Which mode the modal opened in. */
  defaultMode: 'chat' | 'card'
  onClose: () => void
}

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

  const isCard = defaultMode === 'card'

  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  async function handleSubmit() {
    if (!prompt.trim() || busy) return
    setBusy(true)
    setError(null)

    try {
      if (isCard) {
        if (!defaultTeamId) return

        let title: string
        let description: string

        try {
          const res = await fetch('/api/generate-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt.trim() }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Generation failed')
          title = data.title
          description = data.description ?? ''
        } catch {
          title = prompt.trim().length > 60
            ? prompt.trim().slice(0, 57) + '...'
            : prompt.trim()
          description = prompt.trim()
        }

        const card = await createCard({ title, description: description || undefined, teamId: defaultTeamId })
        onClose()
        router.push(`${projectSlug}/cards/${card.identifier}`)
      } else {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt.trim(),
            teamId: defaultTeamId,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to create session')
        onClose()
        router.push(`${projectSlug}/sessions/${data.id}`)
      }
    } catch {
      setBusy(false)
      setError(isCard ? 'Failed to create card. Please try again.' : 'Failed to start conversation. Please try again.')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[rgba(28,25,23,0.40)]"
        onClick={() => !busy && onClose()}
      />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] pointer-events-none">
        <div className="w-full max-w-[520px] bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] pointer-events-auto overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <h2 className="text-[14px] font-medium text-[var(--text-primary)]">
              {isCard ? 'New card' : 'New conversation'}
            </h2>
          </div>
          <div className="px-5 pb-4">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              rows={3}
              placeholder={isCard ? 'Describe what needs to be done...' : 'What would you like to discuss?'}
              disabled={busy}
              className="w-full mt-2 px-3 py-3 text-[14px] bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)] resize-none disabled:opacity-60"
            />
            {error && (
              <p className="mt-2 text-[12px] text-[var(--accent)]">{error}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-[var(--text-faint)]">
                Enter to {isCard ? 'create' : 'start'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => !busy && onClose()}
                  disabled={busy}
                  className="px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-100 cursor-pointer rounded-[var(--radius-default)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || busy || (isCard && !defaultTeamId)}
                  className="px-3 py-1.5 text-[12px] font-medium bg-[var(--accent)] text-white rounded-[var(--radius-default)] hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                  {busy ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" />
                      {isCard ? 'Creating...' : 'Starting...'}
                    </span>
                  ) : (
                    isCard ? 'Create card' : 'Start conversation'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
