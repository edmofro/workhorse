'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SpecEditor } from './SpecEditor'
import { SpecListSidebar } from './SpecListSidebar'
import { FileHistory } from './FileHistory'
import { updateCardTitleFromSpec } from '../../lib/actions/cards'
import { parseSpec } from '../../lib/specs/format'

interface SpecFileData {
  filePath: string
  isNew: boolean
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
}

export function SpecTab({ card, initialFiles }: SpecTabProps) {
  const [files, setFiles] = useState(initialFiles)
  const [activeFilePath, setActiveFilePath] = useState(files[0]?.filePath ?? null)
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()

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

      // If the card still has the placeholder title, update it from the spec
      if (card.title === 'Untitled spec') {
        const file = files.find((f) => f.filePath === filePath)
        if (file) {
          const parsed = parseSpec(file.content)
          if (parsed.frontmatter.title && parsed.frontmatter.title !== 'Untitled') {
            await updateCardTitleFromSpec(card.id, parsed.frontmatter.title)
            router.refresh()
          }
        }
      }
    },
    [card.id, card.title, files, router],
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

  // If no files, show empty state
  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] text-[var(--text-muted)] mb-1">
            No specs yet
          </p>
          <p className="text-[13px] text-[var(--text-faint)] mb-4">
            Start a chat interview to develop specs, or wait for the interviewer to create spec files.
          </p>
        </div>
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
        projectSpecs={[]}
        activeSpecId={activeFilePath}
        onSelect={setActiveFilePath}
        onAdd={() => {}}
        onAttachProjectSpec={() => {}}
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
    </div>
  )
}
