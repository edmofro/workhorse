'use client'

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
import { usePrSection, type PrSectionInput } from '../../lib/hooks/usePrSection'
import type { BranchStatusData } from '../../lib/hooks/queries'

export type { PrSectionInput as PrSectionProps }

export function PrSection(props: PrSectionInput) {
  const s = usePrSection(props)

  if (s.state === 'hidden') return null

  if (s.state === 'create') {
    return (
      <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
        {s.error && (
          <p className="text-[11px] text-[var(--diff-red,#dc2626)] mb-1.5">{s.error}</p>
        )}
        <button
          onClick={s.handleCreatePr}
          className={cn(
            'inline-flex items-center gap-2 px-[14px] py-[7px]',
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

  if (s.state === 'updating') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)]">
        <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
        <span className="text-[12px] font-medium text-[var(--text-muted)]">
          {s.isCreating ? 'Creating PR…' : 'Updating…'}
        </span>
      </div>
    )
  }

  return (
    <div className="border-b border-[var(--border-subtle)]">
      {/* Collapsed bar */}
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={s.toggleExpanded}
          className={cn(
            'flex items-center gap-2 flex-1 min-w-0 rounded-[var(--radius-md)] -mx-1 px-1 py-0.5',
            'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
          )}
        >
          {s.isMerged ? (
            <GitMerge size={14} className="shrink-0 text-[var(--text-muted)]" />
          ) : (
            <GitPullRequest size={14} className="shrink-0 text-[var(--green)]" />
          )}
          <span
            className={cn(
              'text-[12px] font-medium truncate',
              s.isMerged ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]',
            )}
          >
            {s.displayTitle}
          </span>
          {s.displayNumber && (
            <span className="shrink-0 text-[11px] font-medium font-mono text-[var(--text-muted)]">
              {s.displayNumber}
            </span>
          )}
          {s.state === 'merged-new' && (
            <span className="shrink-0 text-[11px] font-semibold text-[var(--accent)] bg-[rgba(194,65,12,0.06)] px-1.5 py-px rounded-full">
              {s.postMergeCommits} new
            </span>
          )}
          <ChevronDown
            size={10}
            className={cn(
              'shrink-0 text-[var(--text-faint)] transition-transform duration-100 ml-auto',
              s.expanded && 'rotate-180',
            )}
          />
        </button>

        {s.safePrUrl && (
          <a
            href={s.safePrUrl}
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
      {s.expanded && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {s.error && (
            <p className="text-[11px] text-[var(--diff-red,#dc2626)]">{s.error}</p>
          )}

          {!s.isMerged && (
            <CiStatusRow ci={s.ci} checksUrl={s.checksUrl} />
          )}

          {s.liveBranchName && (
            <>
              <div className="h-px bg-[var(--border-subtle)]" />
              <BranchDetails
                branchName={s.liveBranchName}
                basedOn={s.basedOn}
                isCardDependency={s.isCardDependency}
                upstreamBehind={s.upstreamBehind}
                localChanges={s.localChanges}
                unpushedCommits={s.unpushedCommits}
                remoteAhead={s.remoteAhead}
                copied={s.copied}
                disabled={s.isOperating}
                onCopy={s.handleCopyBranch}
                onCommit={s.handleCommit}
                onPush={s.handlePush}
                onPull={s.handlePull}
              />
            </>
          )}

          {s.state === 'merged-new' && (
            <>
              <div className="h-px bg-[var(--border-subtle)]" />
              <div className="pt-0.5">
                <button
                  disabled
                  className={cn(
                    'inline-flex items-center gap-2 px-[14px] py-[7px]',
                    'rounded-[var(--radius-default)] text-[12px] font-medium',
                    'bg-[var(--accent)] text-white opacity-50 cursor-not-allowed',
                  )}
                  title="Not yet available — conflict resolution must be implemented first"
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
