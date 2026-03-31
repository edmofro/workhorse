'use client'

import { useState, useEffect, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteCard } from '../lib/actions/cards'
import { getDependencies } from '../lib/actions/dependencies'

interface DependentCard {
  identifier: string
  title: string
}

interface DeleteCardDialogProps {
  cardId: string
  cardTitle: string
  onCancel: () => void
  onDeleted: () => void
}

export function DeleteCardDialog({
  cardId,
  cardTitle,
  onCancel,
  onDeleted,
}: DeleteCardDialogProps) {
  const [dependents, setDependents] = useState<DependentCard[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getDependencies(cardId)
      .then(({ dependedOnBy }) => {
        setDependents(
          dependedOnBy.map((d) => ({
            identifier: d.dependent.identifier,
            title: d.dependent.title,
          })),
        )
      })
      .catch(() => {})
  }, [cardId])

  function handleDelete() {
    startTransition(async () => {
      await deleteCard(cardId)
      onDeleted()
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[rgba(28,25,23,0.40)]"
        onClick={!isPending ? onCancel : undefined}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-6">
          <div className="w-9 h-9 rounded-full bg-[rgba(220,38,38,0.06)] flex items-center justify-center mb-4">
            <Trash2 size={18} className="text-[#dc2626]" />
          </div>

          <h2 className="text-[15px] font-semibold tracking-[-0.01em] mb-2">
            Delete card?
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5">
            <strong className="font-medium text-[var(--text-primary)]">
              {cardTitle}
            </strong>{' '}
            and all its specs will be permanently deleted. This cannot be undone.
          </p>

          {dependents.length > 0 && (
            <div className="bg-[rgba(180,83,9,0.06)] border border-[rgba(180,83,9,0.12)] rounded-[var(--radius-default)] p-3 mb-5">
              <div className="text-[11px] font-semibold text-[#b45309] uppercase tracking-[0.06em] mb-2.5">
                Dependent cards
              </div>
              <ul className="space-y-1.5">
                {dependents.map((dep) => (
                  <li key={dep.identifier} className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-medium text-[var(--text-muted)]">
                      {dep.identifier}
                    </span>
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      {dep.title}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] text-[#b45309] mt-2.5 leading-snug">
                These cards depend on this one. The dependency will be removed if
                you proceed.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="px-3 py-[7px] rounded-[var(--radius-default)] text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-3 py-[7px] rounded-[var(--radius-default)] text-xs font-medium bg-[#dc2626] text-white hover:bg-[#b91c1c] transition-colors duration-100 cursor-pointer disabled:opacity-50"
            >
              {isPending ? 'Deleting…' : 'Delete card'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
