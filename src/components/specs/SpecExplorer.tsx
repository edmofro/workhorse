'use client'

import { useState, useEffect } from 'react'
import { SpecTree } from './SpecTree'
import { SpecDocument } from './SpecDocument'

interface SpecFile {
  path: string
  content: string
}

interface SpecExplorerProps {
  owner: string
  repoName: string
  defaultBranch: string
}

export function SpecExplorer({
  owner,
  repoName,
  defaultBranch,
}: SpecExplorerProps) {
  const [files, setFiles] = useState<SpecFile[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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
          <p className="text-[13px] text-[var(--text-faint)]">
            Specs will appear here once they are committed to the{' '}
            <code className="text-[12px] bg-[var(--bg-inset)] px-1 rounded">.workhorse/specs/</code>{' '}
            directory in the repository.
          </p>
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
        <div className="p-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search specs..."
            className="w-full px-2 py-[5px] text-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] transition-[border-color] duration-150 placeholder:text-[var(--text-faint)]"
          />
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
