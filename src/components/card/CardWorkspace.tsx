'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ViewState } from '../../lib/hooks/useViewNavigation'
import { useRouter } from 'next/navigation'
import { cn } from '../../lib/cn'
import { useUser } from '../UserProvider'
import { useAgentSession } from '../../lib/hooks/useAgentSession'
import { useAttachments } from '../../lib/hooks/useAttachments'
import { useViewNavigation } from '../../lib/hooks/useViewNavigation'
import { SpecHeaderBar } from './SpecHeaderBar'
import type { DeviceKey } from './SpecHeaderBar'
import { ActionPills, type ActionPill } from './ActionPills'
import { JourneyBar } from './JourneyBar'
import { PrBar } from './PrBar'
import { useJockeyState } from '../../lib/hooks/useJockeyState'
import { BUILT_IN_SKILLS } from '../../lib/skills/registry'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ThinkingIndicator } from './ThinkingIndicator'
import { SpecEditor } from './SpecEditor'
import { MockupArtifact } from './MockupArtifact'
import { NewSpecDialog } from './NewSpecDialog'
import { ArtifactsSidebar, type CodeFileItem } from './ArtifactsSidebar'
import { Skeleton } from '../Skeleton'
import { CodeDiffArtifact } from './CodeDiffArtifact'
import { CodeEditorView } from './CodeEditorView'
import { SpecDiffView } from './SpecDiffView'
import { FileText, MessageCircle } from 'lucide-react'
import { parseSpec, buildDefaultSpec, generateSpecPath } from '../../lib/specs/format'
import { deriveLabel } from '../../lib/labels'
import { updateCardTitleFromSpec } from '../../lib/actions/cards'
import { formatRelativeTime } from '../../lib/formatRelativeTime'
import { isMockupPath } from '../../lib/paths'
import { useCardBackRegister } from './CardBackContext'

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
    prUrl?: string | null
  }
  cardTabContent: React.ReactNode
  initialFiles: SpecFileData[]
  initialCodeFiles?: { filePath: string; isNew: boolean; linesAdded?: number; linesRemoved?: number }[]
  filesLoading?: boolean
  mockups: MockupData[]
  projectSpecs: ProjectSpecData[]
  sessions: ConversationSessionData[]
  initialSessionId?: string | null
}

export function CardWorkspace({
  card,
  cardTabContent,
  initialFiles,
  initialCodeFiles = [],
  filesLoading = false,
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

  // Spec files state — synced from props when files load asynchronously.
  // Only sync once (empty → loaded), and never while user is editing.
  const [files, setFiles] = useState(initialFiles)
  const [codeFiles, setCodeFiles] = useState<{ filePath: string; isNew: boolean; linesAdded?: number; linesRemoved?: number }[]>(initialCodeFiles)
  const filesSyncedRef = useRef(initialFiles.length > 0)
  const codeFilesSyncedRef = useRef(initialCodeFiles.length > 0)

  useEffect(() => {
    if (!filesSyncedRef.current && initialFiles.length > 0 && !isEditingRef.current) {
      setFiles(initialFiles)
      filesSyncedRef.current = true
    }
  }, [initialFiles])

  useEffect(() => {
    if (!codeFilesSyncedRef.current && initialCodeFiles.length > 0) {
      setCodeFiles(initialCodeFiles)
      codeFilesSyncedRef.current = true
    }
  }, [initialCodeFiles])
  const [showNewSpecDialog, setShowNewSpecDialog] = useState(false)
  const [isEnsuring, setIsEnsuring] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const isEditingRef = useRef(false)

  // Mockup device state
  const [mockupDevice, setMockupDevice] = useState<DeviceKey>('desktop')
  const [expanded, setExpanded] = useState(false)
  const [showChanges, setShowChanges] = useState(true)

  // Jockey state — journal, pills, suggestions, scheduling
  const jockey = useJockeyState(card.id)

  // Agent session state — uses activeSessionId for history loading
  const {
    messages,
    isStreaming,
    fileWrites,
    thinkingSnippet,
    currentSessionId,
    currentSessionTitle,
    sendMessage: rawSendMessage,
  } = useAgentSession(card.id, activeSessionId, jockey.handleJockeyEvent)

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

  // When a session title is received from the server, update the local list and refresh sidebar
  useEffect(() => {
    if (!currentSessionId || !currentSessionTitle) return
    setSessions((prev) =>
      prev.map((s) => s.id === currentSessionId ? { ...s, title: currentSessionTitle } : s),
    )
    // Refresh server components (sidebar) to pick up the new session
    router.refresh()
  }, [currentSessionId, currentSessionTitle, router])

  // Attachments for chat
  const chatAttachments = useAttachments(card.id)

  // Separate specs and mockup files
  const specFiles = files.filter((f) => f.filePath.startsWith('.workhorse/specs/'))
  const mockupFiles = files
    .filter((f) => isMockupPath(f.filePath))
    .map((f) => ({ filePath: f.filePath, content: f.content }))
  const allMockupFiles = [
    ...mockupFiles,
    ...mockups
      .filter((m) => !mockupFiles.some((mf) => mf.filePath === m.filePath))
      .map((m) => ({ filePath: m.filePath, content: m.html })),
  ]

  // Code file items for the sidebar
  const codeFileItems: CodeFileItem[] = codeFiles.map((f) => ({
    filePath: f.filePath,
    ext: f.filePath.split('.').pop() ?? '',
    linesAdded: f.linesAdded,
    linesRemoved: f.linesRemoved,
  }))

  // All navigable files (specs + mockups + code) for prev/next
  const allNavigableFiles = [
    ...specFiles.map((f) => f.filePath),
    ...allMockupFiles.map((f) => f.filePath),
    ...codeFiles.map((f) => f.filePath),
  ]

  // Spec editing operations
  const handleStartEditing = useCallback(
    async () => {
      return true
    },
    [],
  )

  // Persist a file to the worktree API
  const persistFile = useCallback(
    async (filePath: string) => {
      const file = files.find((f) => f.filePath === filePath)
      if (!file) return
      const res = await fetch('/api/worktree-files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, filePath, content: file.content }),
      })
      if (!res.ok) {
        console.error('Failed to save file')
      }
    },
    [card.id, files],
  )

  const handleDoneEditing = useCallback(
    async (filePath: string) => {
      // Persist buffered content to the worktree
      await persistFile(filePath)
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
    [card.id, card.title, files, persistFile, router],
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

  // Compute initial view: if initialSessionId is provided (deep link), start in chat zone
  const initialViewForNav = initialSessionId
    ? {
        type: 'chat' as const,
        sessionId: initialSessionId,
        sessionTitle: initialSessions.find((s) => s.id === initialSessionId)?.title ?? null,
      }
    : undefined

  // View navigation
  const {
    view,
    isEditing,
    navigateTo,
    goBack,
    closeArtifact,
    openFile,
    navigateToFile,
    navigatePrev,
    navigateNext,
    enterEdit,
    finishEditing,
    savePrompt,
    saveAndFlip,
    discardAndFlip,
  } = useViewNavigation({
    allNavigableFiles,
    initialView: initialViewForNav,
    onStartEditing: handleStartEditing,
    onDoneEditing: handleDoneEditing,
    onRestoreContent: handleRestoreContent,
  })

  // Keep ref in sync with hook-derived isEditing (for use in setInterval)
  useEffect(() => {
    isEditingRef.current = isEditing
  }, [isEditing])

  // Refresh files from worktree periodically
  useEffect(() => {
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
  }, [card.id])

  // Track file writes from the agent — add new files to the list and fetch content
  useEffect(() => {
    for (const fw of fileWrites) {
      if (fw.filePath.startsWith('.workhorse/specs/') || isMockupPath(fw.filePath)) {
        setFiles((prev) => {
          if (prev.some((f) => f.filePath === fw.filePath)) return prev
          return [...prev, { filePath: fw.filePath, isNew: true, content: '' }]
        })
        // Immediately fetch the file content from the worktree so mockups
        // and specs are not blank when first added to the sidebar
        fetch(`/api/worktree-files?cardId=${card.id}&filePath=${encodeURIComponent(fw.filePath)}`)
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data?.content) {
              setFiles((prev) =>
                prev.map((f) => f.filePath === fw.filePath && !f.content ? { ...f, content: data.content as string } : f),
              )
            }
          })
          .catch(() => { /* best-effort */ })
      } else {
        // Track code file changes
        setCodeFiles((prev) => {
          if (prev.some((f) => f.filePath === fw.filePath)) return prev
          return [...prev, { filePath: fw.filePath, isNew: true }]
        })
      }
    }
  }, [fileWrites, card.id])

  // Open a file from card home in expanded mode (chat contracted)
  const openFileExpanded = useCallback(
    (filePath: string) => {
      setExpanded(true)
      openFile(filePath)
    },
    [openFile],
  )

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

  // Send message with optional skill
  const handleSendMessage = useCallback(
    (content: string, skillId?: string) => {
      const uploaded = chatAttachments.getUploadedAttachments()
      rawSendMessage(content, user.displayName, uploaded.length > 0 ? uploaded : undefined, skillId)
      chatAttachments.clear()

      if (view.type === 'card') {
        // Starting a new conversation from card home — navigate to chat zone
        setActiveSessionId(null)
        navigateTo({ type: 'chat', sessionId: null, sessionTitle: null })
      }
    },
    [rawSendMessage, user.displayName, chatAttachments, view.type, navigateTo],
  )

  const handlePillSelect = useCallback(
    (pill: ActionPill) => {
      handleSendMessage(pill.message, pill.skillId)
    },
    [handleSendMessage],
  )

  /** Trigger a skill from the journey bar */
  const handleTriggerSkill = useCallback(
    (skillId: string, label: string) => {
      const skill = BUILT_IN_SKILLS[skillId]
      const message = skill?.description ?? `Run ${label}`
      handleSendMessage(message, skillId)
    },
    [handleSendMessage],
  )

  /** Handle PR creation — update local state with the new PR URL */
  const [localPrUrl, setLocalPrUrl] = useState<string | null>(card.prUrl ?? null)
  const handlePrCreated = useCallback((prUrl: string) => {
    setLocalPrUrl(prUrl)
    router.refresh()
  }, [router])

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

  // Buffer content changes locally (does not write to API)
  const handleContentChange = useCallback(
    (filePath: string, content: string) => {
      setFiles((prev) =>
        prev.map((f) => (f.filePath === filePath ? { ...f, content } : f)),
      )
    },
    [],
  )

  const handleCreateSpec = useCallback(
    async (title: string, area: string) => {
      await ensureWorktree()
      const filePath = generateSpecPath(area, title)
      const content = buildDefaultSpec(title, area)
      await fetch('/api/worktree-files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, filePath, content }),
      })
      const newFile: SpecFileData = { filePath, isNew: true, content }
      setFiles((prev) => [...prev, newFile])
      setShowNewSpecDialog(false)
      openFile(filePath)
    },
    [card.id, ensureWorktree, openFile],
  )

  const handleSelectProjectSpec = useCallback(
    (filePath: string, content: string) => {
      setFiles((prev) => {
        if (prev.some((f) => f.filePath === filePath)) return prev
        return [...prev, { filePath, isNew: false, content }]
      })
      openFile(filePath)
    },
    [openFile],
  )

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return

      e.preventDefault()
      if (view.type === 'artifact') {
        if (isEditing) return // Don't close while editing — user must save/discard first
        closeArtifact()
      } else if (view.type === 'chat') {
        goBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view.type, isEditing, closeArtifact, goBack])

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  // Active file for artifact view
  const activeFilePath = view.type === 'artifact' ? view.filePath : null
  const activeFile = activeFilePath
    ? files.find((f) => f.filePath === activeFilePath) ?? null
    : null
  const isMockupFile = activeFilePath ? isMockupPath(activeFilePath) : false
  const isCodeFile = activeFilePath
    ? !activeFilePath.startsWith('.workhorse/') && !isMockupFile
    : false

  // Find mockup data (either from files or from mockups prop)
  const activeMockupHtml = isMockupFile && activeFilePath
    ? (files.find((f) => f.filePath === activeFilePath)?.content ||
       mockups.find((m) => m.filePath === activeFilePath)?.html ||
       '')
    : ''
  const activeMockupTitle = activeFilePath ? deriveLabel(activeFilePath, activeMockupHtml) : ''

  const extractedAreas = extractAreas(projectSpecs)

  // Convert jockey pill suggestions to ActionPill format
  const pills: ActionPill[] = jockey.pills.map(p => {
    const skill = BUILT_IN_SKILLS[p.skillId]
    return {
      label: p.label,
      message: skill?.description ?? `Run ${p.label}`,
      skillId: p.skillId,
    }
  })

  // Deduplicate: remove suggestions that already appear in pills
  const pillSkillIds = new Set(jockey.pills.map(p => p.skillId))
  const dedupedSuggestions = jockey.suggestions.filter(s => !pillSkillIds.has(s.skillId))

  // --- Chat column (shared between chat mode and artifact mode) ---
  const chatColumn = (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Journey bar — between topbar and chat */}
      <JourneyBar
        journalEntries={jockey.journalEntries}
        scheduledSteps={jockey.scheduledSteps}
        suggestions={dedupedSuggestions}
        activeStep={jockey.activeStep}
        onTriggerSkill={handleTriggerSkill}
        onScheduleStep={jockey.scheduleStep}
        onUnscheduleStep={jockey.unscheduleStep}
      />
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full" style={{ maxWidth: '680px', padding: '32px 24px 80px' }}>
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
                    <span className="font-medium">
                      {deriveLabel(fw.filePath, files.find((f) => f.filePath === fw.filePath)?.content)}
                    </span>
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
      {/* PR bar — bottom of chat area */}
      <PrBar
        cardId={card.id}
        hasCodeChanges={jockey.hasCodeChanges}
        prUrl={localPrUrl}
        onPrCreated={handlePrCreated}
      />
    </div>
  )

  // --- Artifact column (spec or mockup) ---
  const artifactColumn = activeFilePath ? (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-surface)]">
      <SpecHeaderBar
        filePath={activeFilePath}
        fileContent={activeFile?.content}
        allNavigableFiles={allNavigableFiles}
        specs={specFiles.map((f) => ({ filePath: f.filePath, isNew: f.isNew, content: f.content }))}
        mockups={allMockupFiles}
        codeFiles={codeFileItems}
        projectSpecs={projectSpecs}
        isEditing={isEditing}
        isMockup={isMockupFile}
        isCode={isCodeFile}
        device={mockupDevice}
        onDeviceChange={setMockupDevice}
        onPrev={navigatePrev}
        onNext={navigateNext}
        onSelectSpec={(fp) => navigateToFile(fp)}
        onSelectProjectSpec={handleSelectProjectSpec}
        onClose={() => { setExpanded(false); closeArtifact() }}
        onEdit={enterEdit}
        onSave={finishEditing}
        showChanges={showChanges}
        onToggleChanges={() => setShowChanges(!showChanges)}
        expanded={expanded}
        onToggleExpand={() => setExpanded(!expanded)}
      />
      {/* Render content based on file type and changes toggle */}
      {isCodeFile ? (
        showChanges && !isEditing ? (
          <CodeDiffArtifact cardId={card.id} filePath={activeFilePath} />
        ) : (
          <CodeEditorView
            cardId={card.id}
            filePath={activeFilePath}
            isEditing={isEditing}
            onContentChange={(content) => handleContentChange(activeFilePath, content)}
          />
        )
      ) : isMockupFile ? (
        <MockupArtifact
          html={activeMockupHtml}
          title={activeMockupTitle}
          device={mockupDevice}
          isEditing={isEditing}
          onContentChange={(newHtml) => {
            if (activeFilePath) handleContentChange(activeFilePath, newHtml)
          }}
        />
      ) : activeFile ? (
        showChanges && !isEditing ? (
          <SpecDiffView cardId={card.id} filePath={activeFile.filePath} currentContent={activeFile.content} />
        ) : (
          <div className="flex-1 overflow-y-auto flex justify-center">
            <div className="w-full" style={{ maxWidth: '720px', padding: '48px 40px 80px' }}>
              <SpecEditor
                key={activeFile.filePath}
                spec={{
                  id: activeFile.filePath,
                  filePath: activeFile.filePath,
                  content: activeFile.content,
                  isNew: activeFile.isNew,
                }}
                onContentChange={(_, content) =>
                  handleContentChange(activeFile.filePath, content)
                }
                isEditing={isEditing}
                onStartEditing={() => handleStartEditing()}
                cardStatus={card.status}
                hideEditButton
              />
            </div>
          </div>
        )
      ) : null}
    </div>
  ) : null

  // Register back handler for topbar: go to card home when in chat/artifact, null when already on card home
  const backHandler = view.type !== 'card' ? goBack : null
  useCardBackRegister(backHandler)

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ===== Card home ===== */}
      {view.type === 'card' && (
        <>
          <div className="flex-1 flex flex-col overflow-hidden">
            <JourneyBar
              journalEntries={jockey.journalEntries}
              scheduledSteps={jockey.scheduledSteps}
              suggestions={dedupedSuggestions}
              activeStep={jockey.activeStep}
              onTriggerSkill={handleTriggerSkill}
              onScheduleStep={jockey.scheduleStep}
              onUnscheduleStep={jockey.unscheduleStep}
            />
            <div className="flex-1 overflow-y-auto">
              {cardTabContent}

              {/* Conversations section */}
              <div className="max-w-[720px] mx-auto px-10 pb-8">
                {sessions.length > 0 && (
                  <div className="border-t border-[var(--border-subtle)] pt-6">
                    <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">
                      Conversations
                    </h3>
                    <div className="space-y-1">
                      {sessions.map((session) => {
                        const isSessionStreaming = isStreaming && activeSessionId === session.id
                        return (
                          <button
                            key={session.id}
                            onClick={() => openSession(session.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-default)] text-left text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                          >
                            <MessageCircle size={13} className="shrink-0 text-[var(--text-muted)]" />
                            <span className={cn(
                              'text-[13px] font-medium truncate flex-1',
                              isSessionStreaming && 'animate-pulse',
                            )}>
                              {session.title ?? 'New conversation'}
                            </span>
                            <span className="text-[11px] text-[var(--text-faint)] shrink-0">
                              {isSessionStreaming ? 'Working…' : formatRelativeTime(session.lastMessageAt)}
                            </span>
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
          <ArtifactsSidebar
            specs={specFiles.map((f) => ({ filePath: f.filePath, isNew: f.isNew, content: f.content }))}
            mockups={allMockupFiles}
            codeFiles={codeFileItems}
            activeFilePath={null}
            onSelectFile={(fp) => openFileExpanded(fp)}
          />
        </>
      )}

      {/* ===== Centred chat ===== */}
      {view.type === 'chat' && (
        <>
          {chatColumn}
          {filesLoading ? (
            <aside className="shrink-0 w-[248px] border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col p-4 space-y-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-10 mt-2" />
              <Skeleton className="h-4 w-2/3" />
            </aside>
          ) : (
            <ArtifactsSidebar
              specs={specFiles.map((f) => ({ filePath: f.filePath, isNew: f.isNew, content: f.content }))}
              mockups={allMockupFiles}
              codeFiles={codeFileItems}
              activeFilePath={activeFilePath}
              onSelectFile={(fp) => openFile(fp)}
            />
          )}
        </>
      )}

      {/* ===== Chat + artifact (spec or mockup open) ===== */}
      {view.type === 'artifact' && (
        <>
          {!expanded && (
            <div className="flex flex-col overflow-hidden" style={{ width: '40%', minWidth: '320px' }}>
              {chatColumn}
            </div>
          )}
          {expanded && (
            <div className="shrink-0 flex flex-col items-center py-3 border-r border-[var(--border-subtle)] bg-[var(--bg-page)]" style={{ width: '40px' }}>
              <button
                onClick={() => setExpanded(false)}
                className="p-2 rounded-[var(--radius-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                title="Show chat"
              >
                <MessageCircle size={16} />
              </button>
            </div>
          )}
          <div className="flex-1 flex flex-col overflow-hidden border-l border-[var(--border-subtle)]">
            {artifactColumn}
          </div>
        </>
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
                <span className="font-medium">
                  {deriveLabel(savePrompt.fromPath, files.find((f) => f.filePath === savePrompt.fromPath)?.content)}
                </span>
                . Save before switching?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={discardAndFlip}
                  className="px-[14px] py-[7px] rounded-[var(--radius-default)] text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={saveAndFlip}
                  className="px-[14px] py-[7px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer"
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
