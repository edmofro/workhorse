'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Button } from './Button'

interface GitHubRepo {
  fullName: string
  name: string
  owner: string
  htmlUrl: string
  defaultBranch: string
}

interface RepoPickerDialogProps {
  existingRepoUrls: Set<string>
  onSelect: (repo: GitHubRepo) => void
  onClose: () => void
}

export function RepoPickerDialog({
  existingRepoUrls,
  onSelect,
  onClose,
}: RepoPickerDialogProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function fetchRepos() {
      try {
        const res = await fetch('/api/github-repos', { signal: controller.signal })
        if (!res.ok) throw new Error('Failed to fetch repositories')
        const data: { repos: GitHubRepo[]; permissionsUnavailable: boolean } = await res.json()
        if (data.permissionsUnavailable) {
          setError('Repository permissions data is unavailable. Ensure your GitHub token has the repo scope.')
        } else {
          setRepos(data.repos)
        }
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to fetch repositories')
      } finally {
        setLoading(false)
      }
    }
    fetchRepos()

    return () => controller.abort()
  }, [])

  const filtered = useMemo(
    () => repos.filter((r) => r.fullName.toLowerCase().includes(search.toLowerCase())),
    [repos, search],
  )

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-full max-w-[480px] bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] flex flex-col max-h-[min(520px,80vh)]">
          <div className="p-5 pb-0">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-4">
              Add project from GitHub
            </h2>
            <div className="relative mb-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                placeholder="Search repositories..."
                className="w-full pl-8 pr-3 py-2 text-[13px] bg-[var(--bg-page)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-0">
            {loading && (
              <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
                <Loader2 size={16} className="animate-spin mr-2" />
                <span className="text-[13px]">Loading repositories...</span>
              </div>
            )}

            {error && (
              <div className="py-8 text-center text-[13px] text-[var(--text-muted)]">
                {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="py-8 text-center text-[13px] text-[var(--text-muted)]">
                {search ? 'No repositories match your search.' : 'No repositories found.'}
              </div>
            )}

            {!loading &&
              !error &&
              filtered.map((repo) => {
                const alreadyAdded = existingRepoUrls.has(repo.htmlUrl)
                return (
                  <button
                    key={repo.fullName}
                    onClick={() => {
                      if (!alreadyAdded) onSelect(repo)
                    }}
                    disabled={alreadyAdded}
                    className={`w-full text-left px-3 py-[10px] rounded-[var(--radius-default)] transition-colors duration-100 flex items-center justify-between ${
                      alreadyAdded
                        ? 'opacity-40 cursor-default'
                        : 'hover:bg-[var(--bg-hover)] cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">
                        {repo.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {repo.owner}
                        {alreadyAdded && ' · Already added'}
                      </div>
                    </div>
                    <div className="text-[11px] text-[var(--text-faint)]">
                      {repo.defaultBranch}
                    </div>
                  </button>
                )
              })}
          </div>

          <div className="p-5 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex justify-end">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
