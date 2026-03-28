'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from './Button'
import { createCard } from '../lib/actions/cards'
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
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !teamId) return

    startTransition(async () => {
      const card = await createCard({
        title: title.trim(),
        description: description.trim() || undefined,
        teamId,
      })
      setOpen(false)
      setTitle('')
      setDescription('')
      router.push(
        `/${encodeURIComponent(projectName.toLowerCase())}/cards/${card.identifier}`,
      )
    })
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
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-full max-w-[440px] bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-6">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-4">
            New card
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] text-[var(--text-muted)] mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                placeholder="e.g. Patient allergy tracking"
                className="w-full px-3 py-2 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[var(--text-muted)] mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief description..."
                className="w-full px-3 py-2 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)] resize-none"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[var(--text-muted)] mb-1">
                Team
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-3 py-2 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] transition-[border-color,box-shadow] duration-150"
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || isPending}>
                {isPending ? 'Creating...' : 'Create card'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
