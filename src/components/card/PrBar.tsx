'use client'

import { cn } from '../../lib/cn'
import { ExternalLink, MoreHorizontal } from 'lucide-react'

interface PrBarProps {
  hasCodeChanges: boolean
  prUrl: string | null
  onCreatePr: () => void
}

export function PrBar({ hasCodeChanges, prUrl, onCreatePr }: PrBarProps) {
  // Don't show if no code changes outside .workhorse/
  if (!hasCodeChanges) return null

  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 px-4 py-2',
        'border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]',
      )}
    >
      {prUrl ? (
        <>
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-[6px]',
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
          onClick={onCreatePr}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-[6px]',
            'rounded-[var(--radius-default)] text-[12px] font-medium',
            'bg-[var(--accent)] text-white',
            'hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer',
          )}
        >
          Create PR
        </button>
      )}
    </div>
  )
}
