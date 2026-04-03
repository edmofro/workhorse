'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { ExternalLink, MoreHorizontal, Loader2, Copy, Check } from 'lucide-react'
import { usePortalMenu } from '../PropertyDropdown'
import { toggleAutoFix } from '../../lib/actions/cards'

interface PrBarProps {
  cardId: string
  hasCodeChanges: boolean
  prUrl: string | null
  autoFixEnabled: boolean
  onPrCreated: (prUrl: string) => void
  onAutoFixToggled?: (enabled: boolean) => void
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function PrBar({ cardId, hasCodeChanges, prUrl, autoFixEnabled, onPrCreated, onAutoFixToggled }: PrBarProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [localAutoFix, setLocalAutoFix] = useState(autoFixEnabled)
  const [, startTransition] = useTransition()
  const { open, setOpen, toggle, triggerRef, menuRef, pos } = usePortalMenu()

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

  function handleCopyUrl() {
    if (!safePrUrl) return
    navigator.clipboard.writeText(safePrUrl)
    setCopied(true)
    setOpen(false)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleToggleAutoFix() {
    const next = !localAutoFix
    setLocalAutoFix(next)
    onAutoFixToggled?.(next)
    startTransition(async () => {
      try {
        await toggleAutoFix(cardId, next)
      } catch {
        setLocalAutoFix(!next)
        onAutoFixToggled?.(!next)
      }
    })
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
            ref={triggerRef}
            onClick={toggle}
            className={cn(
              'p-[6px] rounded-[var(--radius-default)]',
              'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
            )}
            title="More options"
          >
            <MoreHorizontal size={14} />
          </button>

          {/* Overflow menu */}
          {open && pos && createPortal(
            <div
              ref={menuRef}
              style={{ position: 'fixed', top: pos.top, left: pos.left }}
              className="z-50 w-[200px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] py-1"
            >
              <button
                onClick={handleCopyUrl}
                className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer flex items-center gap-2"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy PR URL'}
              </button>
              <div className="mx-2 my-1 border-t border-[var(--border-subtle)]" />
              <button
                onClick={handleToggleAutoFix}
                className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer flex items-center justify-between"
              >
                <span>Auto-fix CI</span>
                <span
                  className={cn(
                    'relative inline-flex h-[14px] w-[26px] shrink-0 rounded-full transition-colors duration-100',
                    localAutoFix ? 'bg-[var(--accent)]' : 'bg-[var(--bg-inset)]',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white transition-[left] duration-100',
                      localAutoFix ? 'left-[14px]' : 'left-[2px]',
                    )}
                  />
                </span>
              </button>
            </div>,
            document.body,
          )}
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
