'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { GitBranch, ExternalLink, ChevronDown, Clipboard, Globe } from 'lucide-react'
import { Button } from '../Button'
import { cn } from '../../lib/cn'

type LaunchMode = 'launch' | 'copy'

const STORAGE_KEY = 'workhorse:launch-mode'

function getStoredMode(): LaunchMode {
  if (typeof window === 'undefined') return 'launch'
  return (localStorage.getItem(STORAGE_KEY) as LaunchMode) ?? 'launch'
}

function setStoredMode(mode: LaunchMode) {
  localStorage.setItem(STORAGE_KEY, mode)
}

interface CommitButtonProps {
  featureId: string
  hasSpecs: boolean
  specsDirty: boolean
  status: string
  existingPrUrl?: string | null
  existingBranch?: string | null
}

export function CommitButton({
  featureId,
  hasSpecs,
  specsDirty,
  status,
  existingPrUrl,
}: CommitButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [prUrl, setPrUrl] = useState(existingPrUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mode, setMode] = useState<LaunchMode>('launch')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Hydrate stored mode on mount
  useEffect(() => {
    setMode(getStoredMode())
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [dropdownOpen])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

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

  async function copyPrompt(): Promise<boolean> {
    try {
      const res = await fetch(`/api/handoff?featureId=${featureId}`)
      if (!res.ok) throw new Error('Failed to generate prompt')
      const { prompt } = await res.json()
      await navigator.clipboard.writeText(prompt)
      return true
    } catch {
      setError('Failed to copy prompt')
      return false
    }
  }

  async function handleLaunch() {
    setDropdownOpen(false)
    const ok = await copyPrompt()
    if (ok) {
      setToast('Prompt copied — opening Claude Code')
      window.open('https://claude.ai/code', '_blank')
    }
  }

  async function handleCopy() {
    setDropdownOpen(false)
    const ok = await copyPrompt()
    if (ok) {
      setToast('Prompt copied')
    }
  }

  function handleModeAction() {
    if (mode === 'launch') handleLaunch()
    else handleCopy()
  }

  function selectMode(newMode: LaunchMode) {
    setMode(newMode)
    setStoredMode(newMode)
    if (newMode === 'launch') handleLaunch()
    else handleCopy()
  }

  const isSpecComplete = status === 'SPEC_COMPLETE'
  const hasCommitted = !!prUrl

  return (
    <div className="flex items-center gap-[6px]">
      {/* Commit button — always visible once there are specs, disabled when clean */}
      <Button
        onClick={handleCommit}
        disabled={!hasSpecs || isPending || (hasCommitted && !specsDirty)}
      >
        <GitBranch size={12} />
        {isPending
          ? 'Committing...'
          : hasCommitted && !specsDirty
            ? 'Committed'
            : hasCommitted
              ? 'Update spec'
              : 'Commit spec'}
      </Button>

      {/* View PR link */}
      {prUrl && (
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-[6px] px-[14px] py-[7px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100"
        >
          <ExternalLink size={12} />
          View PR
        </a>
      )}

      {/* Launch / Copy split button — only when SPEC_COMPLETE and committed */}
      {isSpecComplete && hasCommitted && (
        <div ref={dropdownRef} className="relative">
          <div className="inline-flex rounded-[var(--radius-default)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] overflow-hidden">
            <button
              onClick={handleModeAction}
              className="inline-flex items-center gap-[6px] px-[14px] py-[7px] text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
            >
              {mode === 'launch' ? <Globe size={12} /> : <Clipboard size={12} />}
              {mode === 'launch' ? 'Launch Claude Code' : 'Copy prompt'}
            </button>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex items-center px-[6px] py-[7px] border-l border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
            >
              <ChevronDown size={12} />
            </button>
          </div>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-[var(--radius-default)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)] z-50">
              <button
                onClick={() => selectMode('launch')}
                className={cn(
                  'flex items-center gap-[8px] w-full px-[12px] py-[8px] text-xs text-left transition-colors duration-100 cursor-pointer',
                  mode === 'launch'
                    ? 'text-[var(--text-primary)] bg-[var(--bg-hover)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                )}
              >
                <Globe size={12} />
                Launch Claude Code
              </button>
              <button
                onClick={() => selectMode('copy')}
                className={cn(
                  'flex items-center gap-[8px] w-full px-[12px] py-[8px] text-xs text-left transition-colors duration-100 cursor-pointer',
                  mode === 'copy'
                    ? 'text-[var(--text-primary)] bg-[var(--bg-hover)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                )}
              >
                <Clipboard size={12} />
                Copy prompt
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inline error */}
      {error && (
        <span className="text-[11px] text-[var(--accent)]">{error}</span>
      )}

      {/* Toast */}
      {toast && (
        <span className="text-[11px] text-[var(--text-secondary)] animate-fade-in">
          {toast}
        </span>
      )}
    </div>
  )
}
