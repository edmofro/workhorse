'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ViewState } from '../../lib/hooks/useViewNavigation'
import { useRouter } from 'next/navigation'
import { useUser } from '../UserProvider'
import { useAgentSession } from '../../lib/hooks/useAgentSession'
import { useAttachments } from '../../lib/hooks/useAttachments'
import { useViewNavigation } from '../../lib/hooks/useViewNavigation'
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
import { FileText, MessageCircle } from 'lucide-react'
import { parseSpec, buildDefaultSpec, generateSpecPath } from '../../lib/specs/format'
import { updateCardTitleFromSpec } from '../../lib/actions/cards'
import { formatRelativeTime } from '../../lib/formatRelativeTime'

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

export interface ConversationSessionData {
  id: string
  title: string | null
  messageCount: number
  lastMessageAt: string
  createdAt: string
}

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
  sessions: ConversationSessionData[]
  initialSessionId?: string | null
}

export function CardWorkspace({
  card,
  cardTabContent,
  initialFiles,
  mockups,
  projectSpecs,
  sessions: initialSessions,
  initialSessionId,
}: CardWorkspaceProps) {
  const { user } = useUser()
  const router = useRouter()

  // Sessions state (can be updated when new sessions are created)
  const [sessions, setSessions] = useState(initialSessions)

  // The active session ID for the chat zone (null = no session yet)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessionId ?? null,
  )

  // Spec files state
  const [files, setFiles] = useState(initialFiles)
  const [showNewSpecDialog, setShowNewSpecDialog] = useState(false)
  const [isEnsuring, setIsEnsuring] = useState(false)
  const [specsPanelOpen, setSpecsPanelOpen] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const isEditingRef = useRef(false)

  // Agent session state — uses activeSessionId for history loading
  const {
    messages,
    isStreaming,
    fileWrites,
    thinkingSnippet,
    currentSessionId,
    sendMessage: rawSendMessage,
  } = useAgentSession(card.id, activeSessionId)

  // Sync back the session ID from the hook (set after first message creates a session)
  const activeSessionIdRef = useRef(activeSessionId)
  activeSessionIdRef.current = activeSessionId

  useEffect(() => {
    if (currentSessionId && currentSessionId !== activeSessionIdRef.current) {
      setActiveSessionId(currentSessionId)
      // Add to sessions list if not already there
      setSessions((prev) => {
        if (prev.some((s) => s.id === currentSessionId)) return prev
        return [
          {
            id: currentSessionId,
            title: null,
            messageCount: 0,
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]
      })
    }
  }, [currentSessionId])

  // Attachments for chat
  const chatAttachments = useAttachments(card.id)

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

  // Spec editing operations
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
      return true
    },
    [card.id],
  )

  const handleDoneEditing = useCallback(
    async (filePath: string) => {
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
    },
    [card.id, card.title, files, router],
  )

  const handleReleaseLock = useCallback(
    async (filePath: string) => {
      await fetch(
        `/api/file-lock?cardId=${card.id}&filePath=${encodeURIComponent(filePath)}`,
        { method: 'DELETE' },
      )
    },
    [card.id],
  )

  // Restore file content from worktree (used on discard)
  const handleRestoreContent = useCallback(
    async (filePath: string) => {
      try {
        const res = await fetch(
          `/api/worktree-files?cardId=${card.id}&filePath=${encodeURIComponent(filePath)}`,
        )
        if (res.ok) {
          const data = await res.json()
          setFiles((prev) =>
            prev.map((f) => (f.filePath === filePath ? { ...f, content: data.content as string } : f)),
          )
        }
      } catch {
        // Best-effort restore
      }
    },
    [card.id],
  )

  // View navigation (extracted hook — isEditing derived from view state)
  const {
    view,
    isEditing,
    navigateTo,
    goBack,
    closeArtifact,
    openFile,
    focusNavigate,
    navigatePrev,
    navigateNext,
    enterFocus,
    enterEdit,
    finishEditing,
    exitFocus,
    savePrompt,
    saveAndFlip,
    discardAndFlip,
  } = useViewNavigation({
    allNavigableFiles,
    onStartEditing: handleStartEditing,
    onDoneEditing: handleDoneEditing,
    onReleaseLock: handleReleaseLock,
    onRestoreContent: handleRestoreContent,
  })

  // Keep ref in sync with hook-derived isEditing (for use in setInterval)
  useEffect(() => {
    isEditingRef.current = isEditing
  }, [isEditing])

  // Refresh files from worktree periodically
  useEffect(() => {
    if (view.type === 'mockup') return

    const interval = setInterval(async () => {
      if (isEditingRef.current) return
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
  }, [card.id, view.type])

  // Track file writes from the agent — auto-expand specs panel when specs are written
  useEffect(() => {
    let hasNewSpec = false
    for (const fw of fileWrites) {
      if (fw.filePath.startsWith('.workhorse/specs/')) {
        hasNewSpec = true
        setFiles((prev) => {
          if (prev.some((f) => f.filePath === fw.filePath)) return prev
          return [...prev, { filePath: fw.filePath, isNew: true, content: '' }]
        })
      }
    }
    if (hasNewSpec) {
      setSpecsPanelOpen(true)
    }
  }, [fileWrites])

  // Navigate to a session's chat zone
  const openSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId)
      setActiveSessionId(sessionId)
      navigateTo({
        type: 'chat',
        sessionId,
        sessionTitle: session?.title ?? null,
      })
    },
    [sessions, navigateTo],
  )

  // Send message with mode support
  const handleSendMessage = useCallback(
    (content: string, mode?: string) => {
      const uploaded = chatAttachments.getUploadedAttachments()
      rawSendMessage(content, user.displayName, uploaded.length > 0 ? uploaded : undefined, mode)
      chatAttachments.clear()

      if (view.type === 'card') {
        // Starting a new conversation from card home — navigate to chat zone
        // The session will be created by the API and synced back via currentSessionId
        setActiveSessionId(null) // Will be set when server responds
        navigateTo({ type: 'chat', sessionId: null, sessionTitle: null })
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
    (filePath: string, content: string) => {
      setFiles((prev) => {
        if (prev.some((f) => f.filePath === filePath)) return prev
        return [...prev, { filePath, isNew: false, content }]
      })
      navigateTo({ type: 'artifact', filePath })
    },
    [navigateTo],
  )

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return

      e.preventDefault()
      if (view.type === 'focus') {
        exitFocus()
      } else if (view.type === 'artifact') {
        closeArtifact()
      } else if (view.type === 'chat') {
        goBack()
      } else if (view.type === 'mockup') {
        goBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view.type, exitFocus, closeArtifact, goBack])

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

  // Session title for the chat zone header
  const chatSessionTitle = view.type === 'chat' ? view.sessionTitle : null

  const chatColumn = (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Session header bar in chat zone */}
      {view.type === 'chat' && chatSessionTitle && (
        <div className="shrink-0 px-4 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <MessageCircle size={13} className="text-[var(--text-muted)]" />
          <span className="text-[13px] font-medium text-[var(--text-secondary)] truncate">
            {chatSessionTitle}
          </span>
        </div>
      )}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full" style={{ maxWidth: '680px', padding: '32px 24px 16px' }}>
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
                  onClick={() => openFile(fw.filePath)}
                  className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-default)] bg-[var(--green-alpha)] border border-[rgba(22,163,74,0.15)] text-[12px] text-[var(--text-secondary)] cursor-pointer hover:border-[rgba(22,163,74,0.3)] transition-colors duration-100 w-full text-left"
                >
                  <FileText size={12} className="text-[var(--green)] shrink-0" />
                  <span>
                    Updated{' '}
                    <code className="text-[11px] font-mono">
                      {fw.filePath.split('/').pop()}
                    </code>
                  </span>
                  <span className="ml-auto text-[11px] text-[var(--accent)] font-medium">
                    Open →
                  </span>
                </button>
              ))}
            </div>
          )}

          {isStreaming && thinkingSnippet && (
            <ThinkingIndicator snippet={thinkingSnippet} />
          )}
        </div>
      </div>

      {/* Pills + Input */}
      <div className="w-full flex flex-col items-center shrink-0 border-t border-[var(--border-subtle)] pt-3">
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
        allNavigableFiles={allNavigableFiles}
        specs={specFiles.map((f) => ({ filePath: f.filePath, isNew: f.isNew }))}
        projectSpecs={projectSpecs}
        isFocusMode={view.type === 'focus'}
        isEditing={view.type === 'focus' && view.editing}
        onPrev={navigatePrev}
        onNext={navigateNext}
        onSelectSpec={(fp) => {
          if (view.type === 'focus') focusNavigate(fp)
          else navigateTo({ type: 'artifact', filePath: fp } as ViewState)
        }}
        onSelectProjectSpec={handleSelectProjectSpec}
        onToggleFocus={view.type === 'focus' ? exitFocus : enterFocus}
        onClose={view.type === 'focus' ? exitFocus : closeArtifact}
        onEdit={enterEdit}
      />
      <div className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
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
            onDoneEditing={finishEditing}
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

            {/* Conversations and specs/mockups sections */}
            <div className="max-w-[720px] mx-auto px-10 pb-8">
              {/* Conversations section */}
              {sessions.length > 0 && (
                <div className="border-t border-[var(--border-subtle)] pt-6">
                  <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">
                    Conversations
                  </h3>
                  <div className="space-y-1">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => openSession(session.id)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-default)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                      >
                        <MessageCircle size={13} className="shrink-0 text-[var(--text-muted)]" />
                        <span className="text-[13px] font-medium truncate flex-1">
                          {session.title ?? 'New conversation'}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                          {formatRelativeTime(session.lastMessageAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline specs and mockups */}
              {(specFiles.length > 0 || allMockupFiles.length > 0) && (
                <div className="border-t border-[var(--border-subtle)] pt-6 mt-2">
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
              placeholder="Start a new conversation..."
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
            collapsed={!specsPanelOpen}
            onToggle={() => setSpecsPanelOpen((prev) => !prev)}
          />
        </>
      )}

      {/* ===== Chat + artifact (spec open) ===== */}
      {view.type === 'artifact' && (
        <>
          <div className="flex flex-col overflow-hidden" style={{ width: '40%', minWidth: '320px' }}>
            {chatColumn}
          </div>
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
            onSelectFile={focusNavigate}
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
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-2">
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
                  onClick={discardAndFlip}
                  className="px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={saveAndFlip}
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

