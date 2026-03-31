'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface User {
  id: string
  displayName: string
}

interface Team {
  id: string
  name: string
  colour: string
}

interface CardFilterProps {
  teams: Team[]
  users: User[]
  basePath: string
  /** Render as a positioned dropdown panel (no trigger button) */
  asDropdown?: boolean
  onClose?: () => void
}

export function CardFilter({ teams, users, basePath, asDropdown, onClose }: CardFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const currentTeam = searchParams.get('team')
  const currentStatus = searchParams.get('status')
  const currentAssignee = searchParams.get('assignee')

  const hasFilters = (currentTeam && teams.length > 1) || currentStatus || currentAssignee

  function applyFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    const qs = params.toString()
    router.push(`${basePath}${qs ? `?${qs}` : ''}`)
  }

  function clearFilters() {
    router.push(basePath)
    if (asDropdown) onClose?.()
    else setShowFilters(false)
  }

  const panel = (
    <div className={`${asDropdown ? 'absolute right-0 top-full mt-1' : 'absolute right-0 top-full mt-2'} w-[240px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] shadow-[var(--shadow-lg)] z-40 p-3 space-y-3`}>
      {/* Status */}
      <div>
        <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">
          Status
        </label>
        <select
          value={currentStatus ?? ''}
          onChange={(e) => applyFilter('status', e.target.value || null)}
          className="w-full px-2 py-1 text-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none"
        >
          <option value="">All</option>
          <option value="NOT_STARTED">Not started</option>
          <option value="SPECIFYING">Specifying</option>
          <option value="IMPLEMENTING">Implementing</option>
          <option value="COMPLETE">Complete</option>
        </select>
      </div>

      {/* Assignee */}
      <div>
        <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">
          Assignee
        </label>
        <select
          value={currentAssignee ?? ''}
          onChange={(e) => applyFilter('assignee', e.target.value || null)}
          className="w-full px-2 py-1 text-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none"
        >
          <option value="">Anyone</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
        >
          Clear filters
        </button>
      )}
    </div>
  )

  // When used as a dropdown from the board header, render just the panel
  if (asDropdown) {
    return (
      <>
        <div className="fixed inset-0 z-30" onClick={onClose} />
        {panel}
      </>
    )
  }

  // Legacy standalone mode with its own trigger button
  return (
    <div className="relative">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="inline-flex items-center justify-center gap-[6px] cursor-pointer font-medium text-xs leading-none transition-colors duration-100 rounded-[var(--radius-default)] px-[14px] py-[7px] bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)]"
      >
        Filter
        {hasFilters && (
          <span className="w-[6px] h-[6px] rounded-full bg-[var(--accent)]" />
        )}
      </button>

      {showFilters && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowFilters(false)} />
          {panel}
        </>
      )}
    </div>
  )
}
