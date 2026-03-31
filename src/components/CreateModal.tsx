'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LayoutList } from 'lucide-react'
import { createCard } from '../lib/actions/cards'

interface CreateModalProps {
  projectSlug: string
  defaultTeamId?: string
  onClose: () => void
}

export function CreateModal({
  projectSlug,
  defaultTeamId,
  onClose,
}: CreateModalProps) {
  const [prompt, setPrompt] = useState('')
  const [busyAction, setBusyAction] = useState<'chat' | 'card' | null>(null)
  const router = useRouter()

  const busy = busyAction !== null

  async function handleCreateCard() {
    if (!prompt.trim() || busy || !defaultTeamId) return
    setBusyAction('card')

    try {
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
    } catch {
      setBusyAction(null)
    }
  }

  async function handleStartChat() {
    if (!prompt.trim() || busy) return
    setBusyAction('chat')

    try {
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
    } catch {
      setBusyAction(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      handleStartChat()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleCreateCard()
    }
    if (e.key === 'Escape' && !busy) {
      onClose()
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[rgba(28,25,23,0.40)]"
        onClick={() => !busy && onClose()}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-full max-w-[480px] bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-5">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              rows={4}
              placeholder="What's on your mind?"
              disabled={busy}
              className="w-full px-3 py-3 pb-12 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)] resize-none disabled:opacity-60"
            />
            <div className="absolute bottom-[1px] left-[1px] right-[1px] flex items-center justify-between px-2 py-2 rounded-b-[var(--radius-default)]">
              <button
                onClick={handleStartChat}
                disabled={!prompt.trim() || busy}
                title="Start conversation (↵)"
                className="p-2 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                {busyAction === 'chat' ? (
                  <div className="w-[14px] h-[14px] border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight size={14} />
                )}
              </button>
              <button
                onClick={handleCreateCard}
                disabled={!prompt.trim() || busy || !defaultTeamId}
                title="Create card (⌘↵)"
                className="p-2 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                {busyAction === 'card' ? (
                  <div className="w-[14px] h-[14px] border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LayoutList size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
