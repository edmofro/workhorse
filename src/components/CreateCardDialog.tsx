'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from './Button'
import { createCard } from '../lib/actions/cards'
import { associateAttachmentsWithCard } from '../lib/actions/attachments'
import { useAttachments } from '../lib/hooks/useAttachments'
import { AttachmentButton } from './card/AttachmentButton'
import { AttachmentPreview } from './card/AttachmentPreview'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  name: string
  colour: string
}

interface CreateCardDialogProps {
  teams: Team[]
  projectName: string
}

export function CreateCardDialog({ teams, projectName }: CreateCardDialogProps) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()
  const attachments = useAttachments()

  const busy = isPending || isGenerating

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || !teamId || busy || attachments.isUploading) return

    startTransition(async () => {
      setIsGenerating(true)

      let title: string
      let description: string

      const uploaded = attachments.getUploadedAttachments()

      try {
        const res = await fetch('/api/generate-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt.trim(),
            attachmentIds: uploaded.map((a) => a.id),
          }),
        })
        const data = await res.json()
        title = data.title
        description = data.description ?? ''
      } catch {
        // Fallback: use raw prompt
        title =
          prompt.trim().length > 60
            ? prompt.trim().slice(0, 57) + '...'
            : prompt.trim()
        description = prompt.trim()
      }

      setIsGenerating(false)

      const card = await createCard({
        title,
        description: description || undefined,
        teamId,
      })

      // Associate attachments with the card
      if (uploaded.length > 0) {
        await associateAttachmentsWithCard(
          card.id,
          uploaded.map((a) => a.id),
        )
      }

      setOpen(false)
      setPrompt('')
      attachments.clear()
      router.push(
        `/${encodeURIComponent(projectName.toLowerCase())}/cards/${card.identifier}/chat`,
      )
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
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

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={teams.length === 0}>
        <Plus size={12} /> New card
      </Button>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => !busy && setOpen(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-full max-w-[480px] bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-6">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-4">
            New card
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                autoFocus
                rows={4}
                placeholder="Describe what you're wanting to achieve..."
                disabled={busy}
                className="w-full px-3 py-2 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)] resize-none disabled:opacity-60"
              />
              {attachments.hasAttachments && (
                <div className="mt-2">
                  <AttachmentPreview
                    pending={attachments.pending}
                    onRemovePending={attachments.removeAttachment}
                    compact
                  />
                </div>
              )}
              <div className="mt-2">
                <AttachmentButton
                  onFiles={attachments.addFiles}
                  disabled={busy}
                  compact
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-[var(--text-muted)] mb-1">
                Team
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                disabled={busy}
                className="w-full px-3 py-2 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] transition-[border-color,box-shadow] duration-150 disabled:opacity-60"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!prompt.trim() || busy || attachments.isUploading}>
                {busy ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create card'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
