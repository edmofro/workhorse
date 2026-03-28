'use client'

import { useState, useCallback, useRef } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  userName?: string
  createdAt?: string
}

export function useChat(featureId: string, userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const initMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs)
  }, [])

  const sendMessage = useCallback(
    async (content: string, userName: string) => {
      if (!content.trim() || isStreaming) return

      // Add user message
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        userName,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      // Add placeholder for assistant
      const assistantId = `temp-${Date.now()}-assistant`
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', userName: 'Workhorse' },
      ])

      setIsStreaming(true)
      abortRef.current = new AbortController()

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featureId, message: content, userId }),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) throw new Error('Chat request failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          accumulated += decoder.decode(value, { stream: true })
          const current = accumulated
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: current } : m,
            ),
          )
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
        abortRef.current = null
      }
    },
    [featureId, userId, isStreaming],
  )

  return { messages, isStreaming, sendMessage, initMessages }
}
