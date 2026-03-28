'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface MarkReadyButtonProps {
  cardId: string
  status: string
}

export function MarkReadyButton({ cardId, status }: MarkReadyButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState(status)

  // Only show in SPECIFYING status
  if (currentStatus !== 'SPECIFYING') return null

  function handleMarkReady() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/mark-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId }),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text)
        }
        setCurrentStatus('IMPLEMENTING')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark ready')
      }
    })
  }

  return (
    <div className="flex items-center gap-[6px]">
      <button
        onClick={handleMarkReady}
        disabled={isPending}
        className="inline-flex items-center gap-[6px] px-[14px] py-[7px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-50"
      >
        <CheckCircle2 size={12} />
        {isPending ? 'Marking...' : 'Mark ready'}
      </button>
      {error && (
        <span className="text-[11px] text-[var(--accent)]">{error}</span>
      )}
    </div>
  )
}
