'use client'

import { useState, useCallback, useEffect, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '../UserProvider'
import { useInterview } from '../../lib/hooks/useInterview'
import { useAttachments } from '../../lib/hooks/useAttachments'
import { RightPanel } from './RightPanel'
import { FloatingChat } from './FloatingChat'
import { ActionPills, getPillsForContext, type ActionPill } from './ActionPills'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SpecEditor } from './SpecEditor'
import { FileHistory } from './FileHistory'
import { NewSpecDialog } from './NewSpecDialog'
import { MockupViewer } from './MockupViewer'
import { FileText } from 'lucide-react'
import { parseSpec, buildDefaultSpec, generateSpecPath } from '../../lib/specs/format'
import { updateCardTitleFromSpec } from '../../lib/actions/cards'

type ViewState =
  | { type: 'card' }
  | { type: 'chat' }
  | { type: 'spec'; filePath: string }
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

type ViewAction =
  | { type: 'navigate'; to: ViewState }
  | { type: 'back' }

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
  }
}

interface CardWorkspaceProps {
  card: {
    id: string
    identifier: string
    title: string
    status: string
    cardBranch: string | null
  }
  /** CardTab content rendered by the parent (server component) */
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

  // Interview state
  const {
    messages,
    isStreaming,
    fileWrites,
    sendMessage: rawSendMessage,
  } = useInterview(card.id)

  // Attachments for chat
  const chatAttachments = useAttachments(card.id)

  // Refresh files from worktree periodically (only in views that show files)
  useEffect(() => {
    if (view.type === 'mockup' || view.type === 'chat') return

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
              // Merge: update existing files, add new ones, keep locally-added files
              // (e.g. project specs opened via handleSelectProjectSpec)
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

  // Track file writes from the interview — add them to the files list
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

  // Separate specs and mockup files from the files list
  const specFiles = files.filter((f) => f.filePath.startsWith('.workhorse/specs/'))
  const mockupFiles = files
    .filter((f) => f.filePath.startsWith('.workhorse/design/mockups/'))
    .map((f) => ({ filePath: f.filePath }))

  // Combine DB mockups with file-based mockups
  const allMockupFiles = [
    ...mockupFiles,
    ...mockups
      .filter((m) => !mockupFiles.some((mf) => mf.filePath === m.filePath))
      .map((m) => ({ filePath: m.filePath })),
  ]

  // View navigation with history stack (single atomic dispatch)
  const navigateTo = useCallback((next: ViewState) => {
    dispatchView({ type: 'navigate', to: next })
  }, [])

  const goBack = useCallback(() => {
    dispatchView({ type: 'back' })
  }, [])

  // Send message with mode support
  const handleSendMessage = useCallback(
    (content: string, mode?: string) => {
      const uploaded = chatAttachments.getUploadedAttachments()
      rawSendMessage(content, user.displayName, uploaded.length > 0 ? uploaded : undefined, mode)
      chatAttachments.clear()

      // Expand to full-screen chat on first message from card view
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
      navigateTo({ type: 'spec', filePath })
    },
    [card.id, card.identifier, ensureWorktree, navigateTo],
  )

  const handleSelectProjectSpec = useCallback(
    async (filePath: string, content: string) => {
      // Open for reading — navigating to spec view
      // If the user edits it, it will be written to the worktree and show up in card specs
      const existing = files.find((f) => f.filePath === filePath)
      if (!existing) {
        // Add as a temporary read-only file for viewing
        setFiles((prev) => {
          if (prev.some((f) => f.filePath === filePath)) return prev
          return [...prev, { filePath, isNew: false, content }]
        })
      }
      navigateTo({ type: 'spec', filePath })
    },
    [files, navigateTo],
  )

  // Keyboard shortcut: Escape to go back
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && view.type !== 'card') {
        e.preventDefault()
        goBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view.type, goBack])

  const pills = getPillsForContext(card.status, messages.length > 0, view.type === 'spec' ? 'spec' : view.type === 'mockup' ? 'mockup' : view.type === 'chat' ? 'chat' : 'card')

  // Active spec file for spec view
  const activeSpec = view.type === 'spec'
    ? files.find((f) => f.filePath === view.filePath) ?? null
    : null

  // Active mockup for mockup view
  const activeMockup = view.type === 'mockup'
    ? mockups.find((m) => m.filePath === view.filePath) ?? null
    : null

  const extractedAreas = extractAreas(projectSpecs)

  // Chat heights per view — padding derived as height + 20px for breathing room
  const cardChatHeight = 260
  const specChatHeight = 200

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Card view */}
        {view.type === 'card' && (
          <div className="flex-1 overflow-y-auto" style={{ paddingBottom: `${cardChatHeight + 20}px` }}>
            {cardTabContent}
          </div>
        )}

        {/* Full-screen chat */}
        {view.type === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden items-center">
            <div className="flex-1 overflow-y-auto w-full flex justify-center">
              <div className="w-full" style={{ maxWidth: '680px', padding: '32px 24px' }}>
                {messages.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-[14px] text-[var(--text-muted)] mb-1">
                      Start the spec interview
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

                {/* File write notifications — click-through */}
                {fileWrites.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {fileWrites.map((fw, i) => (
                      <button
                        key={i}
                        onClick={() => navigateTo({ type: 'spec', filePath: fw.filePath })}
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
                  <div className="flex items-center gap-2 pl-[34px] text-[13px] text-[var(--text-muted)]">
                    <span className="animate-pulse">Interviewer is working…</span>
                  </div>
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
        )}

        {/* Spec view */}
        {view.type === 'spec' && activeSpec && (
          <div className="flex-1 overflow-y-auto bg-[var(--bg-surface)] flex justify-center relative" style={{ paddingBottom: `${specChatHeight + 20}px` }}>
            <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-[var(--text-faint)] font-mono">
                  {activeSpec.filePath}
                </span>
                <div className="flex items-center gap-3">
                  <FileHistory cardId={card.id} filePath={activeSpec.filePath} />
                </div>
              </div>

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
                isEditing={isEditing}
                onStartEditing={() => handleStartEditing(activeSpec.filePath)}
                onDoneEditing={() => handleDoneEditing(activeSpec.filePath)}
                cardStatus={card.status}
              />
            </div>

            {/* Floating chat in spec view */}
            <FloatingChat
              messages={messages}
              isStreaming={isStreaming}
              pills={getPillsForContext(card.status, messages.length > 0, 'spec')}
              onSend={(content) => handleSendMessage(content)}
              onPillSelect={handlePillSelect}
              onExpand={() => navigateTo({ type: 'chat' })}
              variant="panel"
              height={specChatHeight}
              placeholder="Ask about this spec..."
              disabled={isStreaming}
              pendingAttachments={chatAttachments.pending}
              onAddFiles={chatAttachments.addFiles}
              onRemoveAttachment={chatAttachments.removeAttachment}
              isUploading={chatAttachments.isUploading}
            />
          </div>
        )}

        {/* Mockup view */}
        {view.type === 'mockup' && activeMockup && (
          <MockupViewer
            mockup={activeMockup}
            onClose={goBack}
          />
        )}

        {/* Floating chat in card view */}
        {view.type === 'card' && (
          <FloatingChat
            messages={messages}
            isStreaming={isStreaming}
            pills={pills}
            onSend={(content) => handleSendMessage(content)}
            onPillSelect={handlePillSelect}
            onExpand={() => navigateTo({ type: 'chat' })}
            variant="panel"
            height={cardChatHeight}
            placeholder={
              card.status === 'NOT_STARTED'
                ? 'Describe what you\'d like to build...'
                : 'Continue the conversation...'
            }
            disabled={isStreaming}
            pendingAttachments={chatAttachments.pending}
            onAddFiles={chatAttachments.addFiles}
            onRemoveAttachment={chatAttachments.removeAttachment}
            isUploading={chatAttachments.isUploading}
          />
        )}
      </div>

      {/* Right panel — visible in card, chat, and spec views (not mockup) */}
      {view.type !== 'mockup' && (
        <RightPanel
          specs={specFiles.map((f) => ({ filePath: f.filePath, isNew: f.isNew }))}
          mockups={allMockupFiles}
          projectSpecs={projectSpecs}
          activeFilePath={view.type === 'spec' ? view.filePath : null}
          onSelectSpec={(filePath) => navigateTo({ type: 'spec', filePath })}
          onSelectMockup={(filePath) => navigateTo({ type: 'mockup', filePath })}
          onCreateSpec={() => setShowNewSpecDialog(true)}
          onSelectProjectSpec={handleSelectProjectSpec}
        />
      )}

      {showNewSpecDialog && (
        <NewSpecDialog
          cardIdentifier={card.identifier}
          existingAreas={extractedAreas}
          onConfirm={handleCreateSpec}
          onCancel={() => setShowNewSpecDialog(false)}
          isCreating={isEnsuring}
        />
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
