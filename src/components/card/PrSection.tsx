'use client'

import { useState, useCallback } from 'react'
import {
  GitPullRequest,
  GitMerge,
  ExternalLink,
  ChevronDown,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '../../lib/cn'

type PrState = 'hidden' | 'create' | 'open' | 'merged' | 'merged-new' | 'updating'

interface PrSectionProps {
  cardId: string
  hasCodeChanges: boolean
  prUrl: string | null
  prNumber?: number | null
  prTitle?: string | null
  prMerged?: boolean
  postMergeCount?: number
  cardBranch?: string | null
  onPrCreated: (prUrl: string, prNumber?: number) => void
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function extractPrNumber(url: string): string | null {
  const match = url.match(/\/pull\/(\d+)/)
  return match ? `#${match[1]}` : null
}

export function PrSection({
  cardId,
  hasCodeChanges,
  prUrl,
  prNumber,
  prTitle,
  prMerged = false,
  postMergeCount = 0,
  cardBranch,
  onPrCreated,
}: PrSectionProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const safePrUrl = prUrl && isSafeUrl(prUrl) ? prUrl : null
  const displayNumber = prNumber ? `#${prNumber}` : (safePrUrl ? extractPrNumber(safePrUrl) : null)
  const displayTitle = prTitle ?? 'Pull request'

  // Derive state
  let state: PrState = 'hidden'
  if (isCreating) {
    state = 'updating'
  } else if (safePrUrl && prMerged && postMergeCount > 0) {
    state = 'merged-new'
  } else if (safePrUrl && prMerged) {
    state = 'merged'
  } else if (safePrUrl) {
    state = 'open'
  } else if (hasCodeChanges) {
    state = 'create'
  }

  const handleCreatePr = useCallback(async () => {
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
      onPrCreated(data.prUrl, data.prNumber)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PR')
    } finally {
      setIsCreating(false)
    }
  }, [cardId, onPrCreated])

  const handleCopyBranch = useCallback(async (branchName: string) => {
    await navigator.clipboard.writeText(branchName)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [])

  if (state === 'hidden') return null

  // Pre-PR: just the Create PR button
  if (state === 'create') {
    return (
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)]">
        {error && (
          <p className="text-[11px] text-red-500 mb-1.5">{error}</p>
        )}
        <button
          onClick={handleCreatePr}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-[5px]',
            'rounded-[var(--radius-default)] text-[12px] font-medium',
            'bg-[var(--accent)] text-white',
            'hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer',
          )}
        >
          Create PR
        </button>
      </div>
    )
  }

  // Updating: spinner state
  if (state === 'updating') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-subtle)]">
        <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
        <span className="text-[12px] font-medium text-[var(--text-muted)]">
          Creating PR…
        </span>
      </div>
    )
  }

  const isMerged = state === 'merged' || state === 'merged-new'

  return (
    <div className="border-b border-[var(--border-subtle)]">
      {/* Collapsed bar */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        {/* Clickable area: icon + title + number */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex items-center gap-2 flex-1 min-w-0 rounded-[var(--radius-md)] -mx-1 px-1 py-0.5',
            'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
          )}
        >
          {isMerged ? (
            <GitMerge size={14} className="shrink-0 text-[var(--text-muted)]" />
          ) : (
            <GitPullRequest size={14} className="shrink-0 text-[var(--green)]" />
          )}
          <span
            className={cn(
              'text-[12px] font-medium truncate',
              isMerged ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]',
            )}
          >
            {displayTitle}
          </span>
          {displayNumber && (
            <span className="shrink-0 text-[11px] font-medium font-mono text-[var(--text-muted)]">
              {displayNumber}
            </span>
          )}
          {state === 'merged-new' && (
            <span className="shrink-0 inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-semibold bg-[rgba(194,65,12,0.08)] text-[var(--accent)]">
              {postMergeCount} new
            </span>
          )}
          <ChevronDown
            size={10}
            className={cn(
              'shrink-0 text-[var(--text-faint)] transition-transform duration-100 ml-auto',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {/* External link — always visible, doesn't toggle expand */}
        {safePrUrl && (
          <a
            href={safePrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-100"
            title="Open on GitHub"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {error && (
            <p className="text-[11px] text-red-500">{error}</p>
          )}

          {/* CI status — placeholder until GitHub checks API is wired */}
          {!isMerged && (
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">CI</span>
              <span className="text-[11px] text-[var(--text-faint)]">No checks</span>
            </div>
          )}

          {(cardBranch || !isMerged) && <div className="h-px bg-[var(--border-subtle)]" />}

          {/* Branch details — shown immediately */}
          {cardBranch && (
            <BranchDetails
              branchName={cardBranch}
              copied={copied}
              onCopy={handleCopyBranch}
            />
          )}

          {/* Prepare new PR for merged+new */}
          {state === 'merged-new' && (
            <>
              <div className="h-px bg-[var(--border-subtle)]" />
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                  {postMergeCount} commit{postMergeCount !== 1 ? 's' : ''} since merge
                </span>
                <button
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-[5px]',
                    'rounded-[var(--radius-default)] text-[11px] font-medium',
                    'bg-[var(--accent)] text-white',
                    'hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer',
                    'self-start',
                  )}
                >
                  Prepare new PR
                </button>
                <span className="text-[10px] text-[var(--text-muted)] leading-snug">
                  Cherry-picks post-merge commits onto a fresh branch from main.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Branch Details ─────────────────────────────────────────────────────────

function BranchDetails({
  branchName,
  copied,
  onCopy,
}: {
  branchName: string
  copied: boolean
  onCopy: (name: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Branch name */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-page)] rounded-[var(--radius-md)]">
        <span className="text-[10px] font-medium font-mono text-[var(--text-secondary)] truncate flex-1">
          {branchName}
        </span>
        <button
          onClick={() => onCopy(branchName)}
          className="shrink-0 p-0.5 rounded text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors duration-100 cursor-pointer"
          title="Copy branch name"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>

      {/* Status rows — placeholder values until backend APIs exist */}
      <StatusRow label="Local" value="Clean" />
      <StatusRow label="Unpushed" value="None" />
      <StatusRow label="Remote" value="Up to date" />
    </div>
  )
}

function StatusRow({
  label,
  value,
  action,
  onAction,
}: {
  label: string
  value: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-0.5">
      <span className="text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="text-[11px] text-[var(--text-faint)]">{value}</span>
        {action && onAction && (
          <button
            onClick={onAction}
            className="text-[10px] font-medium text-[var(--accent)] hover:underline cursor-pointer"
          >
            {action}
          </button>
        )}
      </span>
    </div>
  )
}
