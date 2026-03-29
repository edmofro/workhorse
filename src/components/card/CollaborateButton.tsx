'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Clipboard, Globe } from 'lucide-react'
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

interface CollaborateButtonProps {
  cardId: string
  cardBranch: string | null
  status: string
}

export function CollaborateButton({
  cardId,
  cardBranch,
  status,
}: CollaborateButtonProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mode, setMode] = useState<LaunchMode>(getStoredMode)
  const [toast, setToast] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Only show in SPECIFYING or IMPLEMENTING
  const visible = status === 'SPECIFYING' || status === 'IMPLEMENTING'

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

  if (!visible || !cardBranch) return null

  async function fetchPrompt(): Promise<string | null> {
    try {
      const res = await fetch(`/api/handoff?cardId=${encodeURIComponent(cardId)}`)
      if (!res.ok) return null
      const data = await res.json()
      return data.prompt as string
    } catch {
      return null
    }
  }

  async function copyPrompt(): Promise<boolean> {
    try {
      const prompt = await fetchPrompt()
      if (!prompt) return false
      await navigator.clipboard.writeText(prompt)
      return true
    } catch {
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

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <div className="inline-flex rounded-[var(--radius-default)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] overflow-hidden">
          <button
            onClick={handleModeAction}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
          >
            {mode === 'launch' ? <Globe size={12} /> : <Clipboard size={12} />}
            {mode === 'launch' ? 'Launch Claude Code' : 'Copy prompt'}
          </button>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex items-center px-1 py-2 border-l border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
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

      {toast && (
        <span className="text-[11px] text-[var(--text-secondary)]">
          {toast}
        </span>
      )}
    </>
  )
}
