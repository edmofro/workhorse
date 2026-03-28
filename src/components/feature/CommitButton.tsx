'use client'

import { useState, useTransition } from 'react'
import { GitBranch, ExternalLink, Download } from 'lucide-react'
import { Button } from '../Button'

interface CommitButtonProps {
  featureId: string
  hasSpecs: boolean
  existingPrUrl?: string | null
  existingBranch?: string | null // used for display context
}

export function CommitButton({
  featureId,
  hasSpecs,
  existingPrUrl,
}: CommitButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [prUrl, setPrUrl] = useState(existingPrUrl ?? null)
  const [error, setError] = useState<string | null>(null)

  function handleCommit() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureId }),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text)
        }
        const data = await res.json()
        setPrUrl(data.prUrl)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Commit failed')
      }
    })
  }

  function handleDownloadHandoff() {
    window.open(`/api/handoff?featureId=${featureId}`, '_blank')
  }

  if (prUrl) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-[6px] px-[14px] py-[7px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100"
        >
          <ExternalLink size={12} />
          View PR
        </a>
        <button
          onClick={handleDownloadHandoff}
          className="p-[7px] rounded-[var(--radius-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
          title="Download implementation handoff"
        >
          <Download size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleCommit}
        disabled={!hasSpecs || isPending}
      >
        <GitBranch size={12} />
        {isPending ? 'Committing...' : 'Commit spec'}
      </Button>
      {error && (
        <span className="text-[11px] text-[var(--accent)]">{error}</span>
      )}
    </div>
  )
}
