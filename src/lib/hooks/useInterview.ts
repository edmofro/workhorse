'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { AttachmentData } from '../attachments'

export interface InterviewMessage {
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

export function useInterview(cardId: string) {
  const [messages, setMessages] = useState<InterviewMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const isStreamingRef = useRef(false)
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallInfo[]>([])
  const [fileWrites, setFileWrites] = useState<FileWriteNotification[]>([])
  const [committedFiles, setCommittedFiles] = useState<string[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Load chat history from Agent SDK session on mount
  useEffect(() => {
    if (historyLoaded) return
    setHistoryLoaded(true)

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
  }, [cardId, historyLoaded])

  const sendMessage = useCallback(
    async (content: string, userName: string, attachments?: AttachmentData[], mode?: string) => {
      if ((!content.trim() && (!attachments || attachments.length === 0)) || isStreamingRef.current) return

      // Add user message
      const userMsg: InterviewMessage = {
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
        { id: assistantId, role: 'assistant', content: '', userName: 'Interviewer' },
      ])

      setIsStreaming(true)
      isStreamingRef.current = true
      setActiveToolCalls([])
      abortRef.current = new AbortController()

      try {
        const attachmentIds = attachments?.map((a) => a.id) ?? []
        const res = await fetch('/api/interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId, message: content, attachmentIds, mode }),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) throw new Error('Interview request failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let assistantContent = ''

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
              processEvent(event, assistantId, assistantContent, (newContent) => {
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
    // Handle streaming text events
    if (event.type === 'stream_event') {
      const streamEvent = event.event as Record<string, unknown> | undefined
      if (streamEvent?.type === 'content_block_delta') {
        const delta = streamEvent.delta as Record<string, unknown> | undefined
        if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
          const newContent = currentContent + delta.text
          setContent(newContent)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: newContent } : m,
            ),
          )
        }
      }
    }

    // Handle complete assistant messages
    if (event.type === 'assistant') {
      const msg = event.message as Record<string, unknown> | undefined
      if (msg?.content && Array.isArray(msg.content)) {
        const textParts = (msg.content as Array<Record<string, unknown>>)
          .filter((c) => c.type === 'text')
          .map((c) => c.text as string)
          .join('')

        if (textParts) {
          setContent(textParts)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: textParts, id: (event.uuid as string) ?? m.id }
                : m,
            ),
          )
        }
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
    sendMessage,
    interrupt,
  }
}
