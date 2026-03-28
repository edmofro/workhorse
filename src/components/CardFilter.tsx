'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'
import { useState } from 'react'
import { Button } from './Button'

interface User {
  id: string
  displayName: string
}

interface CardFilterProps {
  users: User[]
  basePath: string
}

export function CardFilter({ users, basePath }: CardFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const currentStatus = searchParams.get('status')
  const currentAssignee = searchParams.get('assignee')

  const hasFilters = currentStatus || currentAssignee

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
    setShowFilters(false)
  }

  return (
    <div className="relative">
      <Button
        variant="secondary"
        onClick={() => setShowFilters(!showFilters)}
      >
        <Filter size={12} />
        Filter
        {hasFilters && (
          <span className="w-[6px] h-[6px] rounded-full bg-[var(--accent)]" />
        )}
      </Button>

      {showFilters && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-full mt-2 w-[240px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] shadow-[var(--shadow-md)] z-40 p-3 space-y-3">
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
                <option value="SPEC_COMPLETE">Spec complete</option>
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
        </>
      )}
    </div>
  )
}
