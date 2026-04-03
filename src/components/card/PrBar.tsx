'use client'

import { useState } from 'react'
import { cn } from '../../lib/cn'
import { ExternalLink, MoreHorizontal, Loader2 } from 'lucide-react'

interface PrBarProps {
  cardId: string
  hasCodeChanges: boolean
  prUrl: string | null
  onPrCreated: (prUrl: string) => void
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function PrBar({ cardId, hasCodeChanges, prUrl, onPrCreated }: PrBarProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sanitise: only render as link if it's a valid HTTPS URL
  const safePrUrl = prUrl && isSafeUrl(prUrl) ? prUrl : null

  // Always render the container to prevent layout shift.
  // When no code changes, render a zero-height placeholder with the border.
  if (!hasCodeChanges) {
    return <div className="border-t border-[var(--border-subtle)]" />
  }

  async function handleCreatePr() {
    setIsCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to create PR' }))
        throw new Error(data.error ?? 'Failed to create PR')
      }
      const data = await res.json()
      onPrCreated(data.prUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PR')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 px-4 py-2',
        'border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]',
      )}
    >
      {error && (
        <span className="text-[11px] text-red-500 mr-auto">{error}</span>
      )}
      {safePrUrl ? (
        <>
          <a
            href={safePrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1.5 px-[14px] py-[7px]',
              'rounded-[var(--radius-default)] text-[12px] font-medium',
              'bg-[var(--accent)] text-white',
              'hover:bg-[var(--accent-hover)] transition-colors duration-100',
            )}
          >
            View PR
            <ExternalLink size={11} />
          </a>
          <button
            className={cn(
              'p-[6px] rounded-[var(--radius-default)]',
              'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
            )}
            title="More options"
          >
            <MoreHorizontal size={14} />
          </button>
        </>
      ) : (
        <button
          onClick={handleCreatePr}
          disabled={isCreating}
          className={cn(
            'inline-flex items-center gap-1.5 px-[14px] py-[7px]',
            'rounded-[var(--radius-default)] text-[12px] font-medium',
            'bg-[var(--accent)] text-white',
            'hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer',
            'disabled:opacity-60 disabled:cursor-default',
          )}
        >
          {isCreating && <Loader2 size={12} className="animate-spin" />}
          {isCreating ? 'Creating PR…' : 'Create PR'}
        </button>
      )}
    </div>
  )
}
