'use client'

import { useState, useCallback, useEffect, useReducer, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '../UserProvider'
import { useAgentSession } from '../../lib/hooks/useAgentSession'
import { useAttachments } from '../../lib/hooks/useAttachments'
import { SpecsPanel } from './SpecsPanel'
import { SpecRail } from './SpecRail'
import { SpecHeaderBar } from './SpecHeaderBar'
import { ActionPills, getPillsForContext, type ActionPill } from './ActionPills'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ThinkingIndicator } from './ThinkingIndicator'
import { SpecEditor } from './SpecEditor'
import { NewSpecDialog } from './NewSpecDialog'
import { MockupViewer } from './MockupViewer'
import { FileText } from 'lucide-react'
import { parseSpec, buildDefaultSpec, generateSpecPath } from '../../lib/specs/format'
import { updateCardTitleFromSpec } from '../../lib/actions/cards'

// --- View state types ---

type ViewState =
  | { type: 'card' }
  | { type: 'chat' }
  | { type: 'artifact'; filePath: string }
  | { type: 'focus'; filePath: string; editing: boolean }
  | { type: 'mockup'; filePath: string }

interface SpecFileData {
  filePath: string
  isNew: boolean
  content: string
}

interface MockupData {
  id: string
  title: string
  html: string
  filePath: string
}

interface ProjectSpecData {
  filePath: string
  content: string
}

// --- View reducer ---

type ViewAction =
  | { type: 'navigate'; to: ViewState }
  | { type: 'back' }
  | { type: 'close_artifact' }

interface ViewNavState {
  current: ViewState
  history: ViewState[]
}

function viewReducer(state: ViewNavState, action: ViewAction): ViewNavState {
  switch (action.type) {
    case 'navigate':
      return {
        current: action.to,
        history: [...state.history, state.current],
      }
    case 'back': {
      if (state.history.length === 0) {
        return { current: { type: 'card' }, history: [] }
      }
      return {
        current: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
      }
    }
    case 'close_artifact':
      // Close artifact -> return to centred chat (not history-based)
      return {
        current: { type: 'chat' },
        history: state.history,
      }
  }
}

// --- Component ---

interface CardWorkspaceProps {
  card: {
    id: string
    identifier: string
    title: string
    status: string
    cardBranch: string | null
  }
  cardTabContent: React.ReactNode
  initialFiles: SpecFileData[]
  mockups: MockupData[]
  projectSpecs: ProjectSpecData[]
}

export function CardWorkspace({
  card,
  cardTabContent,
  initialFiles,
  mockups,
  projectSpecs,
}: CardWorkspaceProps) {
  const { user } = useUser()
  const router = useRouter()
  const [viewNav, dispatchView] = useReducer(viewReducer, {
    current: { type: 'card' },
    history: [],
  })
  const view = viewNav.current

  // Spec files state
  const [files, setFiles] = useState(initialFiles)
  const [isEditing, setIsEditing] = useState(false)
  const [showNewSpecDialog, setShowNewSpecDialog] = useState(false)
  const [isEnsuring, setIsEnsuring] = useState(false)
  const [savePrompt, setSavePrompt] = useState<{
    fromPath: string
    toPath: string
  } | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Agent session state
  const {
    messages,
    isStreaming,
    fileWrites,
    thinkingSnippet,
    sendMessage: rawSendMessage,
  } = useAgentSession(card.id)

  // Attachments for chat
  const chatAttachments = useAttachments(card.id)

  // Refresh files from worktree periodically
  useEffect(() => {
    if (view.type === 'mockup') return

    const interval = setInterval(async () => {
      if (isEditing) return
      if (document.hidden) return
      try {
        const res = await fetch(`/api/worktree-files?cardId=${card.id}`)
        if (res.ok) {
          const data = await res.json()
          const changedFiles = data.files as { filePath: string; isNew: boolean }[]

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
            setFiles((prev) => {
              const refreshedPaths = new Set(validFiles.map((f) => f.filePath))
              const kept = prev.filter((f) => !refreshedPaths.has(f.filePath))
              return [...validFiles, ...kept]
            })
          }
        }
      } catch {
        // Ignore refresh errors
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [card.id, isEditing, view.type])

  // Track file writes from the agent
  useEffect(() => {
    for (const fw of fileWrites) {
      if (fw.filePath.startsWith('.workhorse/specs/')) {
        setFiles((prev) => {
          if (prev.some((f) => f.filePath === fw.filePath)) return prev
          return [...prev, { filePath: fw.filePath, isNew: true, content: '' }]
        })
      }
    }
  }, [fileWrites])

  // Separate specs and mockup files
  const specFiles = files.filter((f) => f.filePath.startsWith('.workhorse/specs/'))
  const mockupFiles = files
    .filter((f) => f.filePath.startsWith('.workhorse/design/mockups/'))
    .map((f) => ({ filePath: f.filePath }))
  const allMockupFiles = [
    ...mockupFiles,
    ...mockups
      .filter((m) => !mockupFiles.some((mf) => mf.filePath === m.filePath))
      .map((m) => ({ filePath: m.filePath })),
  ]

  // All navigable files (specs + mockups) for prev/next
  const allNavigableFiles = [
    ...specFiles.map((f) => f.filePath),
    ...allMockupFiles.map((f) => f.filePath),
  ]

  // View navigation helpers
  const navigateTo = useCallback((next: ViewState) => {
    dispatchView({ type: 'navigate', to: next })
  }, [])

  const goBack = useCallback(() => {
    dispatchView({ type: 'back' })
  }, [])

  const closeArtifact = useCallback(() => {
    dispatchView({ type: 'close_artifact' })
  }, [])

  // Send message with mode support
  const handleSendMessage = useCallback(
    (content: string, mode?: string) => {
      const uploaded = chatAttachments.getUploadedAttachments()
      rawSendMessage(content, user.displayName, uploaded.length > 0 ? uploaded : undefined, mode)
      chatAttachments.clear()

      // Expand to full chat on first message from card home
      if (view.type === 'card') {
        navigateTo({ type: 'chat' })
      }
    },
    [rawSendMessage, user.displayName, chatAttachments, view.type, navigateTo],
  )

  const handlePillSelect = useCallback(
    (pill: ActionPill) => {
      handleSendMessage(pill.message, pill.mode)
    },
    [handleSendMessage],
  )

  // Spec operations
  const ensureWorktree = useCallback(async () => {
    setIsEnsuring(true)
    try {
      const res = await fetch('/api/ensure-worktree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      })
      if (!res.ok) {
        throw new Error(`Failed to ensure worktree: ${res.status}`)
      }
    } finally {
      setIsEnsuring(false)
    }
  }, [card.id])

  const handleSpecUpdate = useCallback(
    async (filePath: string, content: string) => {
      const res = await fetch('/api/worktree-files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, filePath, content }),
      })
      if (!res.ok) {
        console.error('Failed to save spec update')
        return
      }
      setFiles((prev) =>
        prev.map((f) => (f.filePath === filePath ? { ...f, content } : f)),
      )
    },
    [card.id],
  )

  const handleStartEditing = useCallback(
    async (filePath: string) => {
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

  const handleDoneEditing = useCallback(
    async (filePath: string) => {
      try {
        await fetch(
          `/api/file-lock?cardId=${card.id}&filePath=${encodeURIComponent(filePath)}`,
          { method: 'DELETE' },
        )
        await fetch('/api/auto-commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: card.id, commitMessage: 'Update spec' }),
        })
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
      } finally {
        setIsEditing(false)
      }
    },
    [card.id, card.title, files, router],
  )

  const handleCreateSpec = useCallback(
    async (title: string, area: string) => {
      await ensureWorktree()
      const filePath = generateSpecPath(area, title)
      const content = buildDefaultSpec(title, card.identifier, area)
      await fetch('/api/worktree-files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, filePath, content }),
      })
      const newFile: SpecFileData = { filePath, isNew: true, content }
      setFiles((prev) => [...prev, newFile])
      setShowNewSpecDialog(false)
      navigateTo({ type: 'artifact', filePath })
    },
    [card.id, card.identifier, ensureWorktree, navigateTo],
  )

  const handleSelectProjectSpec = useCallback(
    async (filePath: string, content: string) => {
      const existing = files.find((f) => f.filePath === filePath)
      if (!existing) {
        setFiles((prev) => {
          if (prev.some((f) => f.filePath === filePath)) return prev
          return [...prev, { filePath, isNew: false, content }]
        })
      }
      // Open as artifact if we're in chat, or replace current artifact
      if (view.type === 'chat' || view.type === 'artifact' || view.type === 'focus') {
        navigateTo({ type: 'artifact', filePath })
      } else {
        navigateTo({ type: 'artifact', filePath })
      }
    },
    [files, navigateTo, view.type],
  )

  // Open spec in artifact mode (from chat or specs panel)
  const handleOpenSpec = useCallback(
    (filePath: string) => {
      if (filePath.startsWith('.workhorse/design/mockups/')) {
        navigateTo({ type: 'mockup', filePath })
      } else {
        navigateTo({ type: 'artifact', filePath })
      }
    },
    [navigateTo],
  )

  // Focus mode: navigate to different file
  const handleFocusNavigate = useCallback(
    (filePath: string) => {
      if (view.type === 'focus' && view.editing && view.filePath !== filePath) {
        // Prompt save before flipping while editing
        setSavePrompt({ fromPath: view.filePath, toPath: filePath })
        return
      }
      dispatchView({
        type: 'navigate',
        to: { type: 'focus', filePath, editing: false },
      })
    },
    [view],
  )

  // Prev/Next spec navigation
  const handlePrevSpec = useCallback(() => {
    const currentPath = view.type === 'artifact' || view.type === 'focus' ? view.filePath : null
    if (!currentPath) return
    const idx = allNavigableFiles.indexOf(currentPath)
    if (idx > 0) {
      const newPath = allNavigableFiles[idx - 1]
      if (view.type === 'focus') {
        handleFocusNavigate(newPath)
      } else {
        dispatchView({ type: 'navigate', to: { type: 'artifact', filePath: newPath } })
      }
    }
  }, [view, allNavigableFiles, handleFocusNavigate])

  const handleNextSpec = useCallback(() => {
    const currentPath = view.type === 'artifact' || view.type === 'focus' ? view.filePath : null
    if (!currentPath) return
    const idx = allNavigableFiles.indexOf(currentPath)
    if (idx < allNavigableFiles.length - 1) {
      const newPath = allNavigableFiles[idx + 1]
      if (view.type === 'focus') {
        handleFocusNavigate(newPath)
      } else {
        dispatchView({ type: 'navigate', to: { type: 'artifact', filePath: newPath } })
      }
    }
  }, [view, allNavigableFiles, handleFocusNavigate])

  // Enter focus mode
  const handleEnterFocus = useCallback(() => {
    const filePath = view.type === 'artifact' ? view.filePath : null
    if (!filePath) return
    dispatchView({
      type: 'navigate',
      to: { type: 'focus', filePath, editing: false },
    })
  }, [view])

  // Enter focus + editing
  const handleEnterEdit = useCallback(async () => {
    const filePath =
      view.type === 'artifact' ? view.filePath :
      view.type === 'focus' ? view.filePath : null
    if (!filePath) return
    const ok = await handleStartEditing(filePath)
    if (!ok) return
    // If already in focus mode, just enable editing
    if (view.type === 'focus') {
      dispatchView({
        type: 'navigate',
        to: { type: 'focus', filePath, editing: true },
      })
    } else {
      // From artifact mode: enter focus + editing
      dispatchView({
        type: 'navigate',
        to: { type: 'focus', filePath, editing: true },
      })
    }
  }, [view, handleStartEditing])

  // Done editing -> back to focus read-only
  const handleFinishEditing = useCallback(async () => {
    const filePath = view.type === 'focus' ? view.filePath : null
    if (!filePath) return
    await handleDoneEditing(filePath)
    dispatchView({
      type: 'navigate',
      to: { type: 'focus', filePath, editing: false },
    })
  }, [view, handleDoneEditing])

  // Toggle focus off -> back to artifact
  const handleExitFocus = useCallback(() => {
    const filePath = view.type === 'focus' ? view.filePath : null
    if (!filePath) return
    dispatchView({
      type: 'navigate',
      to: { type: 'artifact', filePath },
    })
  }, [view])

  // Save prompt handlers
  const handleSaveAndFlip = useCallback(async () => {
    if (!savePrompt) return
    await handleDoneEditing(savePrompt.fromPath)
    dispatchView({
      type: 'navigate',
      to: { type: 'focus', filePath: savePrompt.toPath, editing: false },
    })
    setSavePrompt(null)
  }, [savePrompt, handleDoneEditing])

  const handleDiscardAndFlip = useCallback(async () => {
    if (!savePrompt) return
    // Release lock without committing
    await fetch(
      `/api/file-lock?cardId=${card.id}&filePath=${encodeURIComponent(savePrompt.fromPath)}`,
      { method: 'DELETE' },
    )
    setIsEditing(false)
    dispatchView({
      type: 'navigate',
      to: { type: 'focus', filePath: savePrompt.toPath, editing: false },
    })
    setSavePrompt(null)
  }, [savePrompt, card.id])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      // Don't intercept if inside an input/textarea
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return

      e.preventDefault()
      if (view.type === 'focus') {
        // Escape from focus -> artifact
        handleExitFocus()
      } else if (view.type === 'artifact') {
        // Escape from artifact -> close to centred chat
        closeArtifact()
      } else if (view.type === 'chat') {
        // Escape from chat -> card home
        goBack()
      } else if (view.type === 'mockup') {
        goBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view.type, handleExitFocus, closeArtifact, goBack])

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  // Active spec for artifact/focus views
  const activeFilePath =
    view.type === 'artifact' ? view.filePath :
    view.type === 'focus' ? view.filePath : null
  const activeSpec = activeFilePath
    ? files.find((f) => f.filePath === activeFilePath) ?? null
    : null

  // Active mockup
  const activeMockup = view.type === 'mockup'
    ? mockups.find((m) => m.filePath === view.filePath) ?? null
    : null

  const extractedAreas = extractAreas(projectSpecs)

  // Determine pill context
  const pillView =
    view.type === 'artifact' ? 'artifact' as const :
    view.type === 'chat' ? 'chat' as const :
    'card' as const
  const pills = getPillsForContext(card.status, messages.length > 0, pillView)

  // --- Chat column (shared between chat mode and artifact mode) ---

  const chatColumn = (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full" style={{ maxWidth: '680px', padding: '32px 24px' }}>
          {messages.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[14px] text-[var(--text-muted)] mb-1">
                Start developing specs
              </p>
              <p className="text-[13px] text-[var(--text-faint)]">
                Describe what you want to build and the AI will help develop acceptance criteria.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              userName={msg.userName}
              timestamp={msg.createdAt}
              attachments={msg.attachments}
            />
          ))}

          {/* File write notifications */}
          {fileWrites.length > 0 && (
            <div className="mt-3 space-y-1">
              {fileWrites.map((fw, i) => (
                <button
                  key={i}
                  onClick={() => handleOpenSpec(fw.filePath)}
                  className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-default)] bg-[var(--green-alpha)] border border-[rgba(22,163,74,0.15)] text-[12px] text-[var(--text-secondary)] cursor-pointer hover:border-[rgba(22,163,74,0.3)] transition-colors duration-100 w-full text-left"
                >
                  <FileText size={12} className="text-[var(--green)] shrink-0" />
                  <span>
                    Updated{' '}
                    <code className="text-[11px] font-mono">
                      {fw.filePath.split('/').pop()}
                    </code>
                  </span>
                  <span className="ml-auto text-[10px] text-[var(--accent)] font-medium">
                    Open →
                  </span>
                </button>
              ))}
            </div>
          )}

          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <ThinkingIndicator snippet={thinkingSnippet} />
          )}
        </div>
      </div>

      {/* Pills + Input */}
      <div className="w-full flex flex-col items-center shrink-0">
        {pills.length > 0 && !isStreaming && (
          <div style={{ maxWidth: '680px', padding: '0 24px' }} className="w-full mb-2">
            <ActionPills
              pills={pills}
              onSelect={handlePillSelect}
              disabled={isStreaming}
            />
          </div>
        )}
        <ChatInput
          onSend={(content) => handleSendMessage(content)}
          disabled={isStreaming}
          pendingAttachments={chatAttachments.pending}
          onAddFiles={chatAttachments.addFiles}
          onRemoveAttachment={chatAttachments.removeAttachment}
          isUploading={chatAttachments.isUploading}
        />
      </div>
    </div>
  )

  // --- Artifact column (spec editor) ---

  const artifactColumn = activeSpec ? (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-surface)]">
      <SpecHeaderBar
        filePath={activeSpec.filePath}
        cardId={card.id}
        specs={specFiles.map((f) => ({ filePath: f.filePath, isNew: f.isNew }))}
        projectSpecs={projectSpecs}
        isFocusMode={view.type === 'focus'}
        isEditing={view.type === 'focus' && view.editing}
        onPrev={handlePrevSpec}
        onNext={handleNextSpec}
        onSelectSpec={(fp) => {
          if (view.type === 'focus') handleFocusNavigate(fp)
          else dispatchView({ type: 'navigate', to: { type: 'artifact', filePath: fp } })
        }}
        onSelectProjectSpec={handleSelectProjectSpec}
        onToggleFocus={view.type === 'focus' ? handleExitFocus : handleEnterFocus}
        onClose={view.type === 'focus' ? handleExitFocus : closeArtifact}
        onEdit={handleEnterEdit}
      />
      <div className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full" style={{ maxWidth: '720px', padding: '32px 40px 80px' }}>
          <SpecEditor
            key={activeSpec.filePath}
            spec={{
              id: activeSpec.filePath,
              filePath: activeSpec.filePath,
              content: activeSpec.content,
              isNew: activeSpec.isNew,
            }}
            onContentChange={(_, content) =>
              handleSpecUpdate(activeSpec.filePath, content)
            }
            isEditing={view.type === 'focus' && view.editing}
            onStartEditing={() => handleStartEditing(activeSpec.filePath)}
            onDoneEditing={handleFinishEditing}
            cardStatus={card.status}
            hideEditButton
          />
        </div>
      </div>
    </div>
  ) : null

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ===== Card home ===== */}
      {view.type === 'card' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {cardTabContent}

            {/* Inline specs and mockups */}
            <div className="max-w-[720px] mx-auto px-10 pb-8">
              {(specFiles.length > 0 || allMockupFiles.length > 0) && (
                <div className="border-t border-[var(--border-subtle)] pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                      Specs &amp; Mockups
                    </h3>
                    <button
                      onClick={() => setShowNewSpecDialog(true)}
                      className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
                    >
                      + New spec
                    </button>
                  </div>
                  <div className="space-y-1">
                    {specFiles.map((spec) => {
                      const fileName = spec.filePath.split('/').pop()?.replace(/\.md$/, '') ?? spec.filePath
                      return (
                        <button
                          key={spec.filePath}
                          onClick={() => navigateTo({ type: 'artifact', filePath: spec.filePath })}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-default)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                        >
                          <FileText size={13} className="shrink-0 text-[var(--text-muted)]" />
                          <span className="text-[13px] font-medium">{fileName}</span>
                          {spec.isNew && (
                            <span className="text-[10px] text-[var(--green)] font-medium">new</span>
                          )}
                          {!spec.isNew && (
                            <span className="text-[10px] text-[var(--amber)] font-medium">updated</span>
                          )}
                        </button>
                      )
                    })}
                    {allMockupFiles.map((mockup) => {
                      const fileName = mockup.filePath.split('/').pop()?.replace(/\.html$/, '') ?? mockup.filePath
                      return (
                        <button
                          key={mockup.filePath}
                          onClick={() => navigateTo({ type: 'mockup', filePath: mockup.filePath })}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-default)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                        >
                          <FileText size={13} className="shrink-0 text-[var(--text-muted)]" />
                          <span className="text-[13px] font-medium">{fileName}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input bar + pills at bottom */}
          <div className="w-full flex flex-col items-center shrink-0">
            {pills.length > 0 && (
              <div style={{ maxWidth: '680px', padding: '0 24px' }} className="w-full mb-2">
                <ActionPills
                  pills={pills}
                  onSelect={handlePillSelect}
                  disabled={isStreaming}
                />
              </div>
            )}
            <ChatInput
              onSend={(content) => handleSendMessage(content)}
              disabled={isStreaming}
              placeholder={
                card.status === 'NOT_STARTED'
                  ? 'Describe what you\'d like to build...'
                  : 'Continue the conversation...'
              }
              pendingAttachments={chatAttachments.pending}
              onAddFiles={chatAttachments.addFiles}
              onRemoveAttachment={chatAttachments.removeAttachment}
              isUploading={chatAttachments.isUploading}
            />
          </div>
        </div>
      )}

      {/* ===== Centred chat ===== */}
      {view.type === 'chat' && (
        <>
          {chatColumn}
          <SpecsPanel
            specs={specFiles.map((f) => ({ filePath: f.filePath, isNew: f.isNew }))}
            mockups={allMockupFiles}
            onSelectSpec={(fp) => navigateTo({ type: 'artifact', filePath: fp })}
            onSelectMockup={(fp) => navigateTo({ type: 'mockup', filePath: fp })}
            onCreateSpec={() => setShowNewSpecDialog(true)}
          />
        </>
      )}

      {/* ===== Chat + artifact (spec open) ===== */}
      {view.type === 'artifact' && (
        <>
          {/* Chat left ~40% */}
          <div className="flex flex-col overflow-hidden" style={{ width: '40%', minWidth: '320px' }}>
            {chatColumn}
          </div>
          {/* Spec right ~60% */}
          <div className="flex flex-col overflow-hidden border-l border-[var(--border-subtle)]" style={{ flex: '1 1 60%' }}>
            {artifactColumn}
          </div>
        </>
      )}

      {/* ===== Focus mode (spec rail + artifact) ===== */}
      {view.type === 'focus' && (
        <>
          <SpecRail
            specs={specFiles.map((f) => ({ filePath: f.filePath, isNew: f.isNew }))}
            mockups={allMockupFiles}
            activeFilePath={view.filePath}
            onSelectFile={handleFocusNavigate}
          />
          <div className="flex flex-col overflow-hidden flex-1">
            {artifactColumn}
          </div>
        </>
      )}

      {/* ===== Mockup overlay ===== */}
      {view.type === 'mockup' && activeMockup && (
        <MockupViewer
          mockup={activeMockup}
          onClose={goBack}
        />
      )}

      {/* New spec dialog */}
      {showNewSpecDialog && (
        <NewSpecDialog
          cardIdentifier={card.identifier}
          existingAreas={extractedAreas}
          onConfirm={handleCreateSpec}
          onCancel={() => setShowNewSpecDialog(false)}
          isCreating={isEnsuring}
        />
      )}

      {/* Save prompt dialog */}
      {savePrompt && (
        <>
          <div className="fixed inset-0 z-40 bg-[rgba(28,25,23,0.40)]" />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="w-full max-w-[400px] bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-6">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] mb-2">
                Save changes?
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)] mb-5">
                You have unsaved changes to{' '}
                <code className="text-[12px] font-mono">
                  {savePrompt.fromPath.split('/').pop()}
                </code>
                . Save before switching?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleDiscardAndFlip}
                  className="px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveAndFlip}
                  className="px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function extractAreas(specs: ProjectSpecData[]): string[] {
  const areas = new Set<string>()
  for (const spec of specs) {
    const parts = spec.filePath.split('/')
    if (parts.length >= 3 && parts[0] === '.workhorse' && parts[1] === 'specs') {
      areas.add(parts[2])
    }
  }
  return [...areas].sort()
}
