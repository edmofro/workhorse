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
import { useBranchStatus, type BranchStatusData } from '../../lib/hooks/queries'

interface PrSectionProps {
  cardId: string
  cardIdentifier: string
  hasCodeChanges: boolean
  prUrl: string | null
  prNumber: number | null
  cardBranch: string | null
  dependsOn: { identifier: string; title: string }[]
  defaultBranch: string
  repoOwner: string
  repoName: string
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

export function PrSection({
  cardId,
  cardIdentifier,
  hasCodeChanges,
  prUrl,
  prNumber,
  cardBranch,
  dependsOn,
  defaultBranch,
  repoOwner,
  repoName,
  onPrCreated,
}: PrSectionProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isOperating, setIsOperating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Poll for live branch + PR status
  const shouldPoll = !!(prUrl || cardBranch || hasCodeChanges)
  const { data: status } = useBranchStatus(cardIdentifier, shouldPoll)

  const safePrUrl = prUrl && isSafeUrl(prUrl) ? prUrl : null

  // Use live data from polling, falling back to props
  const prMerged = status?.pr?.merged ?? false
  const prTitle = status?.pr?.title ?? null
  const liveNumber = status?.prNumber ?? prNumber
  const displayNumber = liveNumber ? `#${liveNumber}` : null
  const displayTitle = prTitle ?? 'Pull request'
  const ci = status?.ci ?? null
  const branch = status?.branch ?? null
  const liveBranchName = branch?.name ?? cardBranch
  const upstreamBehind = status?.upstreamBehind ?? 0
  const basedOn = dependsOn.length > 0 ? dependsOn[0].identifier : defaultBranch

  // Build GitHub checks URL
  const checksUrl = liveBranchName
    ? `https://github.com/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}/commits/${encodeURIComponent(liveBranchName)}`
    : null

  // Detect post-merge new commits
  const postMergeCommits = (prMerged && branch) ? branch.unpushedCommits : 0

  // Derive state
  type PrState = 'hidden' | 'create' | 'open' | 'merged' | 'merged-new' | 'updating'
  let state: PrState = 'hidden'
  if (isCreating) {
    state = 'updating'
  } else if (safePrUrl && prMerged && postMergeCommits > 0) {
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

  const runOperation = useCallback(async (url: string, body: Record<string, unknown>) => {
    setIsOperating(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Operation failed' }))
        throw new Error(data.error ?? 'Operation failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setIsOperating(false)
    }
  }, [])

  const handleCommit = useCallback(() => runOperation('/api/auto-commit', { cardId }), [cardId, runOperation])
  const handlePush = useCallback(() => runOperation('/api/git-push', { cardId }), [cardId, runOperation])
  const handlePull = useCallback(() => runOperation('/api/git-pull', { cardId }), [cardId, runOperation])

  if (state === 'hidden') return null

  // Pre-PR: just the Create PR button
  if (state === 'create') {
    return (
      <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
        {error && (
          <p className="text-[11px] text-[var(--diff-red,#dc2626)] mb-1.5">{error}</p>
        )}
        <button
          onClick={handleCreatePr}
          className={cn(
            'inline-flex items-center gap-1.5 px-3.5 py-[5px]',
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
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)]">
        <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
        <span className="text-[12px] font-medium text-[var(--text-muted)]">
          {isCreating ? 'Creating PR…' : 'Updating…'}
        </span>
      </div>
    )
  }

  const isMerged = state === 'merged' || state === 'merged-new'

  return (
    <div className="border-b border-[var(--border-subtle)]">
      {/* Collapsed bar */}
      <div className="flex items-center gap-2 px-4 py-2">
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
            <span className="shrink-0 text-[11px] font-semibold text-[var(--accent)] bg-[rgba(194,65,12,0.06)] px-1.5 py-px rounded-full">
              {postMergeCommits} new
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
            <p className="text-[11px] text-[var(--diff-red,#dc2626)]">{error}</p>
          )}

          {/* CI status */}
          {!isMerged && (
            <CiStatusRow ci={ci} checksUrl={checksUrl} />
          )}

          {liveBranchName && (
            <>
              <div className="h-px bg-[var(--border-subtle)]" />
              <BranchDetails
                branchName={liveBranchName}
                basedOn={basedOn}
                isCardDependency={dependsOn.length > 0}
                upstreamBehind={upstreamBehind}
                localChanges={branch?.localChanges ?? 0}
                unpushedCommits={branch?.unpushedCommits ?? 0}
                remoteAhead={branch?.remoteAhead ?? 0}
                copied={copied}
                disabled={isOperating}
                onCopy={handleCopyBranch}
                onCommit={handleCommit}
                onPush={handlePush}
                onPull={handlePull}
              />
            </>
          )}

          {/* Prepare new PR for post-merge commits */}
          {state === 'merged-new' && (
            <>
              <div className="h-px bg-[var(--border-subtle)]" />
              <div className="pt-0.5">
                <button
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3.5 py-[5px]',
                    'rounded-[var(--radius-default)] text-[12px] font-medium',
                    'bg-[var(--accent)] text-white',
                    'hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer',
                  )}
                  title="Cherry-picks post-merge commits onto a fresh branch and creates a new PR"
                >
                  Prepare new PR
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CI Status ──────────────────────────────────────────────────────────

function CiStatusRow({ ci, checksUrl }: { ci: BranchStatusData['ci'] | null; checksUrl: string | null }) {
  if (!ci || ci.total === 0) {
    return (
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-medium text-[var(--text-muted)]">CI</span>
        <span className="text-[11px] text-[var(--text-faint)]">No checks</span>
      </div>
    )
  }

  const label =
    ci.status === 'passing' ? 'Passing' :
    ci.status === 'failing' ? 'Failing' :
    ci.status === 'pending' ? 'Running' :
    'Unknown'

  const colour =
    ci.status === 'passing' ? 'text-[var(--green)]' :
    ci.status === 'failing' ? 'text-[var(--diff-red,#dc2626)]' :
    ci.status === 'pending' ? 'text-[var(--amber)]' :
    'text-[var(--text-faint)]'

  return (
    <div className="flex items-center justify-between px-0.5">
      <span className="text-[11px] font-medium text-[var(--text-muted)]">CI</span>
      {checksUrl ? (
        <a
          href={checksUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('text-[11px] font-medium hover:underline', colour)}
        >
          {label}
        </a>
      ) : (
        <span className={cn('text-[11px] font-medium', colour)}>{label}</span>
      )}
    </div>
  )
}

// ─── Branch Details ─────────────────────────────────────────────────────

function BranchDetails({
  branchName,
  basedOn,
  isCardDependency,
  upstreamBehind,
  localChanges,
  unpushedCommits,
  remoteAhead,
  copied,
  disabled,
  onCopy,
  onCommit,
  onPush,
  onPull,
}: {
  branchName: string
  basedOn: string
  isCardDependency: boolean
  upstreamBehind: number
  localChanges: number
  unpushedCommits: number
  remoteAhead: number
  copied: boolean
  disabled?: boolean
  onCopy: (name: string) => void
  onCommit: () => void
  onPush: () => void
  onPull: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Branch name */}
      <div className="flex items-center gap-1 px-2 py-2 bg-[var(--bg-page)] rounded-[var(--radius-md)]">
        <span className="text-[11px] font-medium font-mono text-[var(--text-secondary)] truncate flex-1">
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

      {/* Based on */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-medium text-[var(--text-muted)]">Based on</span>
        <span className="flex items-center gap-1">
          <span className={cn(
            'text-[11px] font-medium text-[var(--text-primary)]',
            isCardDependency && 'font-mono',
          )}>
            {basedOn}
          </span>
          {upstreamBehind > 0 && (
            <>
              <span className="text-[11px] font-semibold text-[var(--accent)]">
                ↑{upstreamBehind}
              </span>
              <button className="text-[11px] font-medium text-[var(--accent)] hover:underline cursor-pointer">
                Update
              </button>
            </>
          )}
        </span>
      </div>

      {/* Status rows */}
      <StatusRow
        label="Local"
        value={localChanges > 0 ? `${localChanges} file${localChanges !== 1 ? 's' : ''}` : 'Clean'}
        isWarning={localChanges > 0}
        action={localChanges > 0 ? 'Commit' : undefined}
        onAction={localChanges > 0 ? onCommit : undefined}
        disabled={disabled}
      />
      <StatusRow
        label="Unpushed"
        value={unpushedCommits > 0 ? `${unpushedCommits} commit${unpushedCommits !== 1 ? 's' : ''}` : 'None'}
        isWarning={unpushedCommits > 0}
        action={unpushedCommits > 0 ? 'Push' : undefined}
        onAction={unpushedCommits > 0 ? onPush : undefined}
        disabled={disabled}
      />
      <StatusRow
        label="Remote"
        value={remoteAhead > 0 ? `${remoteAhead} ahead` : 'Up to date'}
        isWarning={remoteAhead > 0}
        action={remoteAhead > 0 ? 'Pull' : undefined}
        onAction={remoteAhead > 0 ? onPull : undefined}
        disabled={disabled}
      />
    </div>
  )
}

function StatusRow({
  label,
  value,
  isWarning,
  action,
  onAction,
  disabled,
}: {
  label: string
  value: string
  isWarning?: boolean
  action?: string
  onAction?: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-0.5">
      <span className="text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
      <span className="flex items-center gap-1">
        <span className={cn(
          'text-[11px]',
          isWarning ? 'font-medium text-[var(--text-secondary)]' : 'text-[var(--text-faint)]',
        )}>
          {value}
        </span>
        {action && onAction && (
          <button
            onClick={onAction}
            disabled={disabled}
            className={cn(
              'text-[11px] font-medium text-[var(--accent)] hover:underline cursor-pointer',
              disabled && 'opacity-50 cursor-not-allowed hover:no-underline',
            )}
          >
            {action}
          </button>
        )}
      </span>
    </div>
  )
}
