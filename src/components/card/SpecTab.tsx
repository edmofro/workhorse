'use client'

import { useState, useCallback, useEffect } from 'react'
import { SpecEditor } from './SpecEditor'
import { SpecListSidebar } from './SpecListSidebar'
import { FileHistory } from './FileHistory'
import { NewSpecDialog } from './NewSpecDialog'
import { buildDefaultSpec, generateSpecPath } from '../../lib/specs/format'

interface SpecFileData {
  filePath: string
  isNew: boolean
  content: string
}

interface ProjectSpecData {
  filePath: string
  content: string
}

interface SpecTabProps {
  card: {
    id: string
    identifier: string
    title: string
    status: string
  }
  initialFiles: SpecFileData[]
  projectSpecs?: ProjectSpecData[]
}

export function SpecTab({ card, initialFiles, projectSpecs = [] }: SpecTabProps) {
  const [files, setFiles] = useState(initialFiles)
  const [activeFilePath, setActiveFilePath] = useState(files[0]?.filePath ?? null)
  const [isEditing, setIsEditing] = useState(false)
  const [showNewSpecDialog, setShowNewSpecDialog] = useState(false)
  const [isEnsuring, setIsEnsuring] = useState(false)

  const activeFile = files.find((f) => f.filePath === activeFilePath) ?? null

  // Refresh files from worktree periodically (detect external changes)
  // Skip refresh while user is actively editing to avoid overwriting their work
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isEditing) return
      if (document.hidden) return // Skip while tab is in background
      try {
        const res = await fetch(`/api/worktree-files?cardId=${card.id}`)
        if (res.ok) {
          const data = await res.json()
          const changedFiles = data.files as { filePath: string; isNew: boolean }[]

          // Refresh content for changed files
          const refreshed = await Promise.all(
            changedFiles.map(async (f) => {
              const contentRes = await fetch(
                `/api/worktree-files?cardId=${card.id}&filePath=${encodeURIComponent(f.filePath)}`,
              )
              if (contentRes.ok) {
                const contentData = await contentRes.json()
                return { ...f, content: contentData.content as string }
              }
              return null
            }),
          )

          const validFiles = refreshed.filter((f): f is SpecFileData => f !== null)
          if (validFiles.length > 0) {
            setFiles(validFiles)
          }
        }
      } catch {
        // Ignore refresh errors
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [card.id, isEditing])

  /** Ensure the card has a worktree before writing any files */
  const ensureWorktree = useCallback(async () => {
    setIsEnsuring(true)
    try {
      const res = await fetch('/api/ensure-worktree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      })
      if (!res.ok) {
        throw new Error('Failed to prepare worktree')
      }
    } finally {
      setIsEnsuring(false)
    }
  }, [card.id])

  const handleSpecUpdate = useCallback(
    async (filePath: string, content: string) => {
      // Write to worktree
      await fetch('/api/worktree-files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, filePath, content }),
      })

      setFiles((prev) =>
        prev.map((f) => (f.filePath === filePath ? { ...f, content } : f)),
      )
    },
    [card.id],
  )

  const handleDoneEditing = useCallback(
    async (filePath: string) => {
      setIsEditing(false)

      // Release lock
      await fetch(
        `/api/file-lock?cardId=${card.id}&filePath=${encodeURIComponent(filePath)}`,
        { method: 'DELETE' },
      )

      // Auto-commit
      await fetch('/api/auto-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.id,
          commitMessage: 'Update spec',
        }),
      })
    },
    [card.id],
  )

  const handleStartEditing = useCallback(
    async (filePath: string) => {
      // Acquire lock
      const res = await fetch('/api/file-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, filePath }),
      })

      if (res.status === 409) {
        const data = await res.json()
        alert(`File is being edited by ${data.holder?.displayName ?? 'someone else'}`)
        return false
      }

      setIsEditing(true)
      return true
    },
    [card.id],
  )

  /** Create a brand-new spec file for this card */
  const handleCreateSpec = useCallback(
    async (title: string, area: string) => {
      await ensureWorktree()

      const filePath = generateSpecPath(area, title)
      const content = buildDefaultSpec(title, card.identifier, area)

      // Write file to worktree
      await fetch('/api/worktree-files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, filePath, content }),
      })

      const newFile: SpecFileData = { filePath, isNew: true, content }
      setFiles((prev) => [...prev, newFile])
      setActiveFilePath(filePath)
      setShowNewSpecDialog(false)
    },
    [card.id, card.identifier, ensureWorktree],
  )

  /** Copy a project spec into the card's worktree for editing */
  const handleAttachProjectSpec = useCallback(
    async (filePath: string, content: string) => {
      await ensureWorktree()

      // Write the project spec content into the card's worktree
      await fetch('/api/worktree-files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, filePath, content }),
      })

      const newFile: SpecFileData = { filePath, isNew: false, content }
      setFiles((prev) => {
        // Don't add duplicates
        if (prev.some((f) => f.filePath === filePath)) return prev
        return [...prev, newFile]
      })
      setActiveFilePath(filePath)
    },
    [card.id, ensureWorktree],
  )

  const mappedProjectSpecs = projectSpecs.map((ps) => ({
    id: ps.filePath,
    filePath: ps.filePath,
    content: ps.content,
  }))

  // If no files, show empty state with sidebar for project specs + new spec
  if (files.length === 0) {
    return (
      <div className="flex-1 flex overflow-hidden">
        <SpecListSidebar
          specs={[]}
          projectSpecs={mappedProjectSpecs}
          activeSpecId={null}
          onSelect={() => {}}
          onAdd={() => setShowNewSpecDialog(true)}
          onAttachProjectSpec={handleAttachProjectSpec}
        />

        <div className="flex-1 flex items-center justify-center bg-[var(--bg-surface)]">
          <div className="text-center max-w-[320px]">
            <p className="text-[14px] text-[var(--text-muted)] mb-1">
              No specs yet
            </p>
            <p className="text-[13px] text-[var(--text-faint)] mb-4">
              Create a new spec, edit an existing project spec, or start a chat interview.
            </p>
            <button
              onClick={() => setShowNewSpecDialog(true)}
              disabled={isEnsuring}
              className="inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-50"
            >
              {isEnsuring ? 'Preparing...' : 'New spec'}
            </button>
          </div>
        </div>

        {showNewSpecDialog && (
          <NewSpecDialog
            cardIdentifier={card.identifier}
            existingAreas={extractAreas(projectSpecs)}
            onConfirm={handleCreateSpec}
            onCancel={() => setShowNewSpecDialog(false)}
            isCreating={isEnsuring}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Spec list sidebar */}
      <SpecListSidebar
        specs={files.map((f) => ({
          id: f.filePath,
          filePath: f.filePath,
          isNew: f.isNew,
        }))}
        projectSpecs={mappedProjectSpecs}
        activeSpecId={activeFilePath}
        onSelect={setActiveFilePath}
        onAdd={() => setShowNewSpecDialog(true)}
        onAttachProjectSpec={handleAttachProjectSpec}
      />

      {/* Spec document */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-surface)] flex justify-center">
        {activeFile ? (
          <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-[var(--text-faint)] font-mono">
                {activeFile.filePath}
              </span>
              <div className="flex items-center gap-3">
                <FileHistory cardId={card.id} filePath={activeFile.filePath} />
              </div>
            </div>

            <SpecEditor
              key={activeFile.filePath}
              spec={{
                id: activeFile.filePath,
                filePath: activeFile.filePath,
                content: activeFile.content,
                isNew: activeFile.isNew,
              }}
              onContentChange={(_, content) =>
                handleSpecUpdate(activeFile.filePath, content)
              }
              isEditing={isEditing}
              onStartEditing={() => handleStartEditing(activeFile.filePath)}
              onDoneEditing={() => handleDoneEditing(activeFile.filePath)}
              cardStatus={card.status}
            />
          </div>
        ) : (
          <div className="text-center py-16 text-[var(--text-muted)] text-[13px]">
            Select a spec to view
          </div>
        )}
      </div>

      {showNewSpecDialog && (
        <NewSpecDialog
          cardIdentifier={card.identifier}
          existingAreas={extractAreas(projectSpecs)}
          onConfirm={handleCreateSpec}
          onCancel={() => setShowNewSpecDialog(false)}
          isCreating={isEnsuring}
        />
      )}
    </div>
  )
}

/** Extract unique area names from project spec file paths */
function extractAreas(specs: ProjectSpecData[]): string[] {
  const areas = new Set<string>()
  for (const spec of specs) {
    // Path format: .workhorse/specs/{area}/{slug}.md
    const parts = spec.filePath.split('/')
    if (parts.length >= 3 && parts[0] === '.workhorse' && parts[1] === 'specs') {
      areas.add(parts[2])
    }
  }
  return [...areas].sort()
}
