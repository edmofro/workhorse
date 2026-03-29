'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { SpecTree } from './SpecTree'
import { SpecDocument } from './SpecDocument'
import { createQuickCard } from '../../lib/actions/cards'

interface SpecFile {
  path: string
  content: string
}

interface Team {
  id: string
  name: string
}

interface SpecExplorerProps {
  owner: string
  repoName: string
  defaultBranch: string
  projectName: string
  teams: Team[]
}

export function SpecExplorer({
  owner,
  repoName,
  defaultBranch,
  projectName,
  teams,
}: SpecExplorerProps) {
  const [files, setFiles] = useState<SpecFile[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const defaultTeamId = teams[0]?.id

  useEffect(() => {
    async function fetchSpecs() {
      try {
        const res = await fetch(
          `/api/specs-tree?owner=${owner}&repo=${repoName}&branch=${defaultBranch}`,
        )
        if (res.ok) {
          const data = await res.json()
          setFiles(data.files)
          if (data.files.length > 0) {
            setSelectedPath(data.files[0].path)
          }
        }
      } catch {
        // GitHub token may not be configured
      } finally {
        setLoading(false)
      }
    }
    fetchSpecs()
  }, [owner, repoName, defaultBranch])

  function handleNewSpec() {
    if (!defaultTeamId) return
    startTransition(async () => {
      const card = await createQuickCard({ teamId: defaultTeamId })
      router.push(
        `/${encodeURIComponent(projectName.toLowerCase())}/cards/${card.identifier}`,
      )
    })
  }

  function handleEditSpec(specPath: string) {
    if (!defaultTeamId) return
    startTransition(async () => {
      const card = await createQuickCard({
        teamId: defaultTeamId,
        specPath,
      })
      router.push(
        `/${encodeURIComponent(projectName.toLowerCase())}/cards/${card.identifier}`,
      )
    })
  }

  const selectedFile = files.find((f) => f.path === selectedPath)

  const filteredFiles = search
    ? files.filter(
        (f) =>
          f.path.toLowerCase().includes(search.toLowerCase()) ||
          f.content.toLowerCase().includes(search.toLowerCase()),
      )
    : files

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-[var(--text-muted)]">Loading specs...</p>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-[360px]">
          <p className="text-[14px] text-[var(--text-muted)] mb-1">
            No specs found
          </p>
          <p className="text-[13px] text-[var(--text-faint)] mb-4">
            Specs will appear here once they are committed to the{' '}
            <code className="text-[12px] bg-[var(--bg-inset)] px-1 rounded">.workhorse/specs/</code>{' '}
            directory in the repository.
          </p>
          {defaultTeamId && (
            <button
              onClick={handleNewSpec}
              disabled={isPending}
              className="inline-flex items-center gap-[6px] px-[14px] py-[7px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-50"
            >
              <Plus size={12} />
              {isPending ? 'Creating...' : 'New spec'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Tree sidebar */}
      <aside
        className="flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-page)] shrink-0 overflow-hidden"
        style={{ width: '260px' }}
      >
        <div className="p-3 space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search specs..."
            className="w-full px-2 py-[5px] text-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] transition-[border-color] duration-150 placeholder:text-[var(--text-faint)]"
          />
          {defaultTeamId && (
            <button
              onClick={handleNewSpec}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-[6px] py-[5px] rounded-[var(--radius-default)] text-[12px] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-50"
            >
              <Plus size={11} />
              {isPending ? 'Creating...' : 'New spec'}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <SpecTree
            files={filteredFiles.map((f) => f.path)}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
          />
        </div>
      </aside>

      {/* Document viewer */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-surface)] flex justify-center">
        {selectedFile ? (
          <SpecDocument
            path={selectedFile.path}
            content={selectedFile.content}
            onEdit={defaultTeamId ? () => handleEditSpec(selectedFile.path) : undefined}
            isCreating={isPending}
          />
        ) : (
          <div className="text-center py-16 text-[var(--text-muted)] text-[13px]">
            Select a spec to view
          </div>
        )}
      </div>
    </div>
  )
}
