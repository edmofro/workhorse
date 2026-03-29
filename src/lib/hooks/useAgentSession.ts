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

export function useAgentSession(cardId: string) {
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const isStreamingRef = useRef(false)
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallInfo[]>([])
  const [fileWrites, setFileWrites] = useState<FileWriteNotification[]>([])
  const [committedFiles, setCommittedFiles] = useState<string[]>([])
  const [thinkingSnippet, setThinkingSnippet] = useState<string | null>(null)
  const thinkingBufferRef = useRef('')
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const historyCardIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load chat history from Agent SDK session on mount or when cardId changes
  useEffect(() => {
    if (historyCardIdRef.current === cardId) return
    historyCardIdRef.current = cardId

    async function loadHistory() {
      try {
        const res = await fetch(`/api/chat-history?cardId=${cardId}`)
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
  }, [cardId])

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
      abortRef.current = new AbortController()

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
          body: JSON.stringify({ cardId, message: content, attachmentIds, mode }),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) throw new Error('Agent session request failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let assistantContent = ''
        // Track the stable ID separately from the message's display ID,
        // so we can always find the message to update even after the
        // assistant event swaps in the real uuid.
        const stableId = assistantId

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
              processEvent(event, stableId, assistantContent, (newContent) => {
                assistantContent = newContent
              })
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
    currentContent: string,
    setContent: (c: string) => void,
  ) {
    // Handle streaming text and thinking events
    if (event.type === 'stream_event') {
      const streamEvent = event.event as Record<string, unknown> | undefined
      if (streamEvent?.type === 'content_block_delta') {
        const delta = streamEvent.delta as Record<string, unknown> | undefined

        // Text deltas — append to the assistant message
        if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
          setThinkingSnippet(null)
          thinkingBufferRef.current = ''
          const newContent = currentContent + delta.text
          setContent(newContent)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: newContent } : m,
            ),
          )
        }

        // Thinking deltas — accumulate into buffer for periodic sampling
        if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
          thinkingBufferRef.current += delta.thinking as string
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
          if (currentContent && !currentContent.endsWith(textParts)) {
            // New text from a later turn — append to what we already have
            const newContent = currentContent + '\n\n' + textParts
            setContent(newContent)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: newContent } : m,
              ),
            )
          } else if (!currentContent) {
            // First text, not yet streamed via deltas
            setContent(textParts)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: textParts } : m,
              ),
            )
          }
          // If currentContent already ends with textParts, it was streamed
          // via deltas — no update needed, just confirming what's there.
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
    sendMessage,
    interrupt,
  }
}
