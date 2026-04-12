'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AttachmentData } from '../attachments'

/** Map Agent SDK tool names to user-facing verb labels. */
function verbFromToolName(toolName: string): string {
  switch (toolName) {
    case 'Read': return 'Reading codebase...'
    case 'Grep': return 'Searching files...'
    case 'Glob': return 'Finding files...'
    case 'Write': return 'Writing files...'
    case 'Edit': return 'Editing files...'
    default: return 'Working...'
  }
}

export interface SessionMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  userName?: string
  createdAt?: string
  attachments?: AttachmentData[]
}

export interface ToolCallInfo {
  id: string
  name: string
  status: 'running' | 'done'
  summary?: string
}

export interface FileWriteNotification {
  filePath: string
  timestamp: string
}

export function useAgentSession(
  cardId: string,
  sessionId: string | null,
  onJockeyEvent?: (event: Record<string, unknown>) => void,
) {
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const isStreamingRef = useRef(false)
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallInfo[]>([])
  const [fileWrites, setFileWrites] = useState<FileWriteNotification[]>([])
  const [committedFiles, setCommittedFiles] = useState<string[]>([])
  const [thinkingSnippet, setThinkingSnippet] = useState<string | null>(null)
  const [thinkingVerb, setThinkingVerb] = useState<string>('Thinking...')
  const thinkingBufferRef = useRef('')
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const historySessionIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const wasAbortedRef = useRef(false)
  const [queuedMessage, setQueuedMessage] = useState<{
    content: string
    userName: string
    attachments?: AttachmentData[]
    skillId?: string
    tempId: string
  } | null>(null)
  const queuedMessageRef = useRef(queuedMessage)
  queuedMessageRef.current = queuedMessage
  // Track the conversation session ID and title (may be set after first message)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId)
  const currentSessionIdRef = useRef<string | null>(sessionId)
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string | null>(null)
  const onJockeyEventRef = useRef(onJockeyEvent)
  onJockeyEventRef.current = onJockeyEvent

  // Text buffering for smooth streaming — accumulate deltas and flush every ~60ms
  const textBufferRef = useRef('')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assistantContentRef = useRef('')
  const assistantIdRef = useRef('')
  const turnConfirmedRef = useRef(false)

  // Update currentSessionId when prop changes — abort any in-flight stream
  // ONLY if this is an explicit session switch (not a sync-back from the server).
  // When the server assigns a session ID to a new conversation, currentSessionIdRef
  // is already set to that value by processEvent, so we skip the abort.
  useEffect(() => {
    if (sessionId !== currentSessionIdRef.current) {
      // Genuine session switch — abort any in-flight stream and clear messages
      // so stale cached data from react-query can't leak into the wrong session
      if (abortRef.current) {
        abortRef.current.abort()
      }
      setMessages([])
      historySessionIdRef.current = null
    }
    setCurrentSessionId(sessionId)
    currentSessionIdRef.current = sessionId
  }, [sessionId])

  // Load chat history from Agent SDK session — cached by react-query so switching
  // back to a previously-viewed session is instant
  const { data: historyData, isFetching: isHistoryFetching } = useQuery({
    queryKey: ['chat-history', sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/chat-history?sessionId=${sessionId}`)
      if (!res.ok) return { messages: [] }
      return res.json()
    },
    enabled: !!sessionId,
    staleTime: 30_000,
    gcTime: 10 * 60_000, // Keep chat history cached for 10 minutes
  })

  useEffect(() => {
    if (!sessionId) {
      if (historySessionIdRef.current !== null) {
        setMessages([])
        historySessionIdRef.current = null
      }
      return
    }
    // Sync history once per session switch — never overwrite after that, because
    // streaming and local state may have added messages the server doesn't know about.
    if (historySessionIdRef.current === sessionId) return
    // Never overwrite local messages while actively streaming — the local state
    // is more up-to-date than the server history (which may not be persisted yet).
    if (isStreamingRef.current) return
    // Wait for the fetch to settle so we don't apply stale cached data from a
    // previously-viewed session while the fresh fetch is still in flight.
    if (isHistoryFetching) return
    if (historyData !== undefined && currentSessionIdRef.current === sessionId) {
      historySessionIdRef.current = sessionId
      setMessages(historyData?.messages?.length > 0 ? historyData.messages : [])
    }
  }, [sessionId, historyData, isHistoryFetching])

  // Stable ref for sendMessage — initialised after sendMessage is defined (below),
  // kept in sync every render so the dispatch effect doesn't depend on callback identity
  const sendMessageRef = useRef<typeof sendMessage | null>(null)

  // Track whether recovery is active so sendMessage doesn't conflict
  const recoveryAbortRef = useRef<AbortController | null>(null)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current)
        thinkingTimerRef.current = null
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }
      recoveryAbortRef.current?.abort()
    }
  }, [])

  // Recovery on return — when mounting with a sessionId, check if it's
  // actively streaming and reconnect to the live event stream if so.
  useEffect(() => {
    if (!sessionId || isStreamingRef.current) return

    const abort = new AbortController()
    recoveryAbortRef.current = abort

    async function tryRecover() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/events`, {
          signal: abort.signal,
        })
        if (!res.ok || !res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        // Read the first event to check status
        const firstChunk = await reader.read()
        if (firstChunk.done || abort.signal.aborted) return

        buf += decoder.decode(firstChunk.value, { stream: true })
        const firstLines = buf.split('\n')
        buf = firstLines.pop() ?? ''

        let isLiveStreaming = false
        for (const line of firstLines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'status' && event.status === 'idle') return
            if (event.type === 'status' && event.status === 'streaming') {
              isLiveStreaming = true
              break
            }
          } catch { /* skip */ }
        }

        if (!isLiveStreaming || abort.signal.aborted) return

        // Session is actively streaming — set up recovery state
        const recoveryAssistantId = `recovery-${Date.now()}-assistant`
        setMessages((prev) => {
          // Only add placeholder if there isn't already an empty assistant msg
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last.content === '') return prev
          return [...prev, { id: recoveryAssistantId, role: 'assistant', content: '', userName: 'Workhorse' }]
        })

        setIsStreaming(true)
        isStreamingRef.current = true
        assistantContentRef.current = ''
        assistantIdRef.current = recoveryAssistantId
        textBufferRef.current = ''
        thinkingBufferRef.current = ''
        turnConfirmedRef.current = false

        function flushTextBuffer() {
          if (!textBufferRef.current) return
          const flushed = assistantContentRef.current + textBufferRef.current
          assistantContentRef.current = flushed
          textBufferRef.current = ''
          const id = assistantIdRef.current
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content: flushed } : m)),
          )
        }

        function scheduleFlush() {
          if (flushTimerRef.current) return
          flushTimerRef.current = setTimeout(() => {
            flushTimerRef.current = null
            flushTextBuffer()
          }, 60)
        }

        // Start thinking snippet sampler
        thinkingTimerRef.current = setInterval(() => {
          const b = thinkingBufferRef.current
          if (!b) return
          const tail = b.slice(-120)
          const lastNewline = tail.lastIndexOf('\n')
          const line = lastNewline >= 0 ? tail.slice(lastNewline + 1) : tail
          const snippet = line.trim().slice(0, 80)
          if (snippet) setThinkingSnippet(snippet)
        }, 1500)

        // Process remaining buffered data and continue reading
        const processLines = (text: string) => {
          const lines = text.split('\n')
          const remainder = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const event = JSON.parse(data)
              if (event.type === 'status' && event.status === 'idle') {
                // Stream ended
                return { remainder, done: true }
              }
              processEvent(event, recoveryAssistantId, scheduleFlush)
            } catch { /* skip */ }
          }
          return { remainder, done: false }
        }

        // Process any replay events still in buffer
        const initial = processLines(buf)
        buf = initial.remainder
        if (initial.done) {
          // Clean up
          setIsStreaming(false)
          isStreamingRef.current = false
          setThinkingSnippet(null)
          if (thinkingTimerRef.current) { clearInterval(thinkingTimerRef.current); thinkingTimerRef.current = null }
          return
        }

        // Continue reading live events
        while (!abort.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break

          buf += decoder.decode(value, { stream: true })
          const result = processLines(buf)
          buf = result.remainder
          if (result.done) break
        }

        // Flush remaining text
        if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null }
        if (textBufferRef.current) {
          const finalContent = assistantContentRef.current + textBufferRef.current
          textBufferRef.current = ''
          assistantContentRef.current = finalContent
          const id = assistantIdRef.current
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content: finalContent } : m)),
          )
        }

        setIsStreaming(false)
        isStreamingRef.current = false
        setActiveToolCalls([])
        setThinkingSnippet(null)
        thinkingBufferRef.current = ''
        if (thinkingTimerRef.current) { clearInterval(thinkingTimerRef.current); thinkingTimerRef.current = null }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        // Recovery is best-effort — if it fails, the user just doesn't see the in-progress stream
      }
    }

    tryRecover()

    return () => { abort.abort() }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (content: string, userName: string, attachments?: AttachmentData[], skillId?: string) => {
      if (!content.trim() && (!attachments || attachments.length === 0)) return

      // Cancel any active recovery stream — sendMessage takes over
      recoveryAbortRef.current?.abort()
      recoveryAbortRef.current = null

      // If already streaming, queue the message for after the current turn
      if (isStreamingRef.current) {
        const tempId = `temp-${Date.now()}-queued`
        // Remove the previous queued message's optimistic preview if overwriting
        const prev = queuedMessageRef.current
        if (prev) {
          setMessages((msgs) => msgs.filter((m) => m.id !== prev.tempId))
        }
        setQueuedMessage({ content, userName, attachments, skillId, tempId })
        const userMsg: SessionMessage = {
          id: tempId,
          role: 'user',
          content,
          userName,
          createdAt: new Date().toISOString(),
          attachments,
        }
        setMessages((prev) => [...prev, userMsg])
        return
      }

      // Add user message
      const userMsg: SessionMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        userName,
        createdAt: new Date().toISOString(),
        attachments,
      }
      setMessages((prev) => [...prev, userMsg])

      // Add placeholder for assistant
      const assistantId = `temp-${Date.now()}-assistant`
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', userName: 'Workhorse' },
      ])

      setIsStreaming(true)
      isStreamingRef.current = true
      setActiveToolCalls([])
      setThinkingSnippet(null)
      setThinkingVerb('Thinking...')
      thinkingBufferRef.current = ''
      textBufferRef.current = ''
      assistantContentRef.current = ''
      assistantIdRef.current = assistantId
      turnConfirmedRef.current = false
      abortRef.current = new AbortController()
      wasAbortedRef.current = false

      // Flush buffered text to React state — called on a 60ms throttle
      // so multiple small deltas batch into one smooth render.
      function flushTextBuffer() {
        if (!textBufferRef.current) return
        const flushed = assistantContentRef.current + textBufferRef.current
        assistantContentRef.current = flushed
        textBufferRef.current = ''
        const id = assistantIdRef.current
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, content: flushed } : m)),
        )
      }

      function scheduleFlush() {
        if (flushTimerRef.current) return
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null
          flushTextBuffer()
        }, 60)
      }

      // Sample thinking snippets every 1.5s from the buffer
      thinkingTimerRef.current = setInterval(() => {
        const buf = thinkingBufferRef.current
        if (!buf) return
        // Take the last ~80 chars, find a word boundary
        const tail = buf.slice(-120)
        const lastNewline = tail.lastIndexOf('\n')
        const line = lastNewline >= 0 ? tail.slice(lastNewline + 1) : tail
        const snippet = line.trim().slice(0, 80)
        if (snippet) setThinkingSnippet(snippet)
      }, 1500)

      try {
        const attachmentIds = attachments?.map((a) => a.id) ?? []
        const res = await fetch('/api/agent-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId,
            sessionId: currentSessionIdRef.current,
            message: content,
            attachmentIds,
            skillId,
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) throw new Error('Agent session request failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)

            if (data === '[DONE]') continue

            try {
              const event = JSON.parse(data)
              processEvent(event, assistantId, scheduleFlush)
            } catch {
              // Ignore unparseable events
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          wasAbortedRef.current = true
          return
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'An error occurred. Please try again.' }
              : m,
          ),
        )
      } finally {
        // Flush any remaining buffered text before closing
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current)
          flushTimerRef.current = null
        }
        if (textBufferRef.current) {
          const finalContent = assistantContentRef.current + textBufferRef.current
          const id = assistantIdRef.current
          textBufferRef.current = ''
          assistantContentRef.current = finalContent
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content: finalContent } : m)),
          )
        }
        // If aborted with no content, show "Stopped." notice
        if (wasAbortedRef.current && !assistantContentRef.current) {
          const id = assistantIdRef.current
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content: 'Stopped.' } : m)),
          )
        }

        setIsStreaming(false)
        isStreamingRef.current = false
        setActiveToolCalls([])
        setThinkingSnippet(null)
        thinkingBufferRef.current = ''
        if (thinkingTimerRef.current) {
          clearInterval(thinkingTimerRef.current)
          thinkingTimerRef.current = null
        }
        abortRef.current = null
      }
    },
    [cardId],
  )
  sendMessageRef.current = sendMessage

  // Dispatch queued message when streaming stops
  useEffect(() => {
    if (!isStreaming && queuedMessage) {
      const { content, userName, attachments, skillId, tempId } = queuedMessage
      setQueuedMessage(null)
      // Remove the optimistic preview — sendMessage will add its own user message
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      sendMessageRef.current?.(content, userName, attachments, skillId)
    }
  }, [isStreaming, queuedMessage])

  function processEvent(
    event: Record<string, unknown>,
    assistantId: string,
    scheduleFlush: () => void,
  ) {
    // Handle session ID from server (conversation session, not Agent SDK session)
    if (event.type === 'session') {
      const newSessionId = event.sessionId as string
      setCurrentSessionId(newSessionId)
      currentSessionIdRef.current = newSessionId
      return
    }

    // Handle session metadata update (sent after exchange completes, includes title)
    if (event.type === 'session_update') {
      if (event.title) {
        setCurrentSessionTitle(event.title as string)
      }
      return
    }


    // Handle streaming text and thinking events
    if (event.type === 'stream_event') {
      const streamEvent = event.event as Record<string, unknown> | undefined

      // Detect tool use starts to derive the thinking verb
      if (streamEvent?.type === 'content_block_start') {
        const block = streamEvent.content_block as Record<string, unknown> | undefined
        if (block?.type === 'tool_use' && typeof block.name === 'string') {
          setThinkingVerb(verbFromToolName(block.name as string))
        }
        if (block?.type === 'thinking') {
          setThinkingVerb('Thinking...')
        }
      }

      if (streamEvent?.type === 'content_block_delta') {
        const delta = streamEvent.delta as Record<string, unknown> | undefined

        // Text deltas — buffer and schedule a throttled flush to React state
        if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
          setThinkingSnippet(null)
          thinkingBufferRef.current = ''
          // If a previous turn was confirmed, add a blank-line separator
          if (turnConfirmedRef.current && assistantContentRef.current) {
            textBufferRef.current += '\n\n'
            turnConfirmedRef.current = false
          }
          textBufferRef.current += delta.text
          scheduleFlush()
        }

        // Thinking deltas — accumulate into buffer for periodic sampling (capped to avoid unbounded growth)
        if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
          thinkingBufferRef.current = (thinkingBufferRef.current + (delta.thinking as string)).slice(-256)
        }
      }
    }

    // Handle complete assistant messages — confirms the content that was
    // already streamed via text_delta events. Text from later turns is
    // handled by text_delta with a newline separator, so we only need to
    // flush and confirm here (never re-append).
    if (event.type === 'assistant') {
      const msg = event.message as Record<string, unknown> | undefined
      if (msg?.content && Array.isArray(msg.content)) {
        const hasText = (msg.content as Array<Record<string, unknown>>).some(
          (c) => c.type === 'text',
        )

        if (hasText) {
          // Flush any pending buffer so assistantContentRef is up to date
          const currentContent = assistantContentRef.current + textBufferRef.current
          textBufferRef.current = ''
          if (flushTimerRef.current) {
            clearTimeout(flushTimerRef.current)
            flushTimerRef.current = null
          }

          assistantContentRef.current = currentContent
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: currentContent } : m,
            ),
          )
          turnConfirmedRef.current = true
        }
      }
    }

    // Handle result events (end of agent query)
    if (event.type === 'result') {
      const subtype = event.subtype as string | undefined
      const stopReason = event.stop_reason as string | undefined

      if (subtype === 'error_max_turns' && stopReason === 'tool_use') {
        // Agent was cut off mid-work — append a friendly continuation message
        const continuationMsg = 'I had more to explore but ran out of steps — send another message and I\u2019ll continue where I left off.'
        setMessages((prev) => {
          const lastMsg = prev.find((m) => m.id === assistantId)
          if (lastMsg && lastMsg.content) {
            // Already has content — append continuation note
            return prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + '\n\n' + continuationMsg }
                : m,
            )
          }
          // No content yet — use as the message
          return prev.map((m) =>
            m.id === assistantId ? { ...m, content: continuationMsg } : m,
          )
        })
      }
    }

    // Handle tool use summaries (file operations)
    if (event.type === 'tool_use_summary') {
      const summary = event.summary as string
      // Detect file write operations
      if (summary.includes('Updated') || summary.includes('Created') || summary.includes('Wrote')) {
        const fileMatch = summary.match(/(?:Updated|Created|Wrote)\s+`?([^`\n]+)`?/)
        if (fileMatch) {
          setFileWrites((prev) => [
            ...prev,
            { filePath: fileMatch[1], timestamp: new Date().toISOString() },
          ])
        }
      }
      setActiveToolCalls((prev) =>
        prev.map((tc) => {
          const ids = event.preceding_tool_use_ids as string[] | undefined
          if (ids?.includes(tc.id)) {
            return { ...tc, status: 'done' as const, summary }
          }
          return tc
        }),
      )
    }

    // Handle commit notification
    if (event.type === 'commit') {
      const files = event.files as string[]
      setCommittedFiles(files)
    }

    // Handle jockey assessment event
    if (event.type === 'jockey') {
      onJockeyEventRef.current?.(event)
    }
  }

  const interrupt = useCallback(() => {
    abortRef.current?.abort()
    // Clear any queued message so it doesn't fire after the abort settles
    const queued = queuedMessageRef.current
    if (queued) {
      setMessages((msgs) => msgs.filter((m) => m.id !== queued.tempId))
      setQueuedMessage(null)
    }
  }, [])

  return {
    messages,
    isStreaming,
    activeToolCalls,
    fileWrites,
    committedFiles,
    thinkingSnippet,
    thinkingVerb,
    currentSessionId,
    currentSessionTitle,
    sendMessage,
    interrupt,
  }
}
