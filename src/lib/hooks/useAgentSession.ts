'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AttachmentData } from '../attachments'

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

export function useAgentSession(cardId: string, sessionId: string | null) {
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const isStreamingRef = useRef(false)
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallInfo[]>([])
  const [fileWrites, setFileWrites] = useState<FileWriteNotification[]>([])
  const [committedFiles, setCommittedFiles] = useState<string[]>([])
  const [thinkingSnippet, setThinkingSnippet] = useState<string | null>(null)
  const thinkingBufferRef = useRef('')
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const historySessionIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Track the conversation session ID (may be set after first message)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId)
  const currentSessionIdRef = useRef<string | null>(sessionId)

  // Text buffering for smooth streaming — accumulate deltas and flush every ~60ms
  const textBufferRef = useRef('')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const assistantContentRef = useRef('')
  const assistantIdRef = useRef('')

  // Update currentSessionId when prop changes — abort any in-flight stream
  // to prevent events from the old session corrupting the new one
  useEffect(() => {
    setCurrentSessionId(sessionId)
    currentSessionIdRef.current = sessionId
    // Abort any active stream from the previous session
    if (abortRef.current) {
      abortRef.current.abort()
    }
  }, [sessionId])

  // Load chat history from Agent SDK session on mount or when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      // No session yet — clear messages
      if (historySessionIdRef.current !== null) {
        setMessages([])
        historySessionIdRef.current = null
      }
      return
    }
    if (historySessionIdRef.current === sessionId) return
    historySessionIdRef.current = sessionId

    async function loadHistory() {
      try {
        const res = await fetch(`/api/chat-history?sessionId=${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages)
          }
        }
      } catch {
        // Ignore — history retrieval is best-effort
      }
    }

    loadHistory()
  }, [sessionId])

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
    }
  }, [])

  const sendMessage = useCallback(
    async (content: string, userName: string, attachments?: AttachmentData[], mode?: string) => {
      if ((!content.trim() && (!attachments || attachments.length === 0)) || isStreamingRef.current) return

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
      thinkingBufferRef.current = ''
      textBufferRef.current = ''
      assistantContentRef.current = ''
      assistantIdRef.current = assistantId
      abortRef.current = new AbortController()

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
            mode,
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
        if (err instanceof DOMException && err.name === 'AbortError') return
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

    // Handle streaming text and thinking events
    if (event.type === 'stream_event') {
      const streamEvent = event.event as Record<string, unknown> | undefined
      if (streamEvent?.type === 'content_block_delta') {
        const delta = streamEvent.delta as Record<string, unknown> | undefined

        // Text deltas — buffer and schedule a throttled flush to React state
        if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
          setThinkingSnippet(null)
          thinkingBufferRef.current = ''
          textBufferRef.current += delta.text
          scheduleFlush()
        }

        // Thinking deltas — accumulate into buffer for periodic sampling (capped to avoid unbounded growth)
        if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
          thinkingBufferRef.current = (thinkingBufferRef.current + (delta.thinking as string)).slice(-256)
        }
      }
    }

    // Handle complete assistant messages — confirms streamed content or
    // appends text from a new turn. Keep the stable ID so subsequent
    // events in later turns can still find the message.
    if (event.type === 'assistant') {
      const msg = event.message as Record<string, unknown> | undefined
      if (msg?.content && Array.isArray(msg.content)) {
        const textParts = (msg.content as Array<Record<string, unknown>>)
          .filter((c) => c.type === 'text')
          .map((c) => c.text as string)
          .join('')

        if (textParts) {
          // Flush any pending buffer first so assistantContentRef is up to date
          const currentContent = assistantContentRef.current + textBufferRef.current
          textBufferRef.current = ''
          if (flushTimerRef.current) {
            clearTimeout(flushTimerRef.current)
            flushTimerRef.current = null
          }

          if (!currentContent || currentContent === textParts) {
            // First text, or exact match of already-streamed content — just confirm
            assistantContentRef.current = textParts
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: textParts } : m,
              ),
            )
          } else {
            // New text from a later turn — append to what we already have
            const newContent = currentContent + '\n\n' + textParts
            assistantContentRef.current = newContent
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: newContent } : m,
              ),
            )
          }
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
  }

  const interrupt = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    messages,
    isStreaming,
    activeToolCalls,
    fileWrites,
    committedFiles,
    thinkingSnippet,
    currentSessionId,
    sendMessage,
    interrupt,
  }
}
