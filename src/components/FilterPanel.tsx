'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface User {
  id: string
  displayName: string
}

interface FilterPanelProps {
  users: User[]
  basePath: string
  onClose: () => void
}

export function FilterPanel({ users, basePath, onClose }: FilterPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

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
    // Preserve non-filter params (like team) when clearing
    const params = new URLSearchParams(searchParams.toString())
    params.delete('status')
    params.delete('assignee')
    const qs = params.toString()
    router.push(`${basePath}${qs ? `?${qs}` : ''}`)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 w-[240px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] shadow-[var(--shadow-lg)] z-40 p-3 space-y-3">
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
    </>
  )
}
