'use client'

import { useEffect, useRef } from 'react'
import { useChat } from '../../lib/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

interface ChatSidebarProps {
  cardId: string
  userId: string
  userName: string
  messages: {
    id: string
    role: string
    content: string
    userName?: string
    createdAt: string
  }[]
}

export function ChatSidebar({
  cardId,
  userId,
  userName,
  messages: initialMessages,
}: ChatSidebarProps) {
  const {
    messages,
    isStreaming,
    sendMessage,
    initMessages,
  } = useChat(cardId, userId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialised = useRef(false)

  useEffect(() => {
    if (!initialised.current) {
      initMessages(
        initialMessages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          userName: m.role === 'user' ? (m.userName ?? userName) : 'Workhorse',
          createdAt: m.createdAt,
        })),
      )
      initialised.current = true
    }
  }, [initialMessages, initMessages, userName])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <aside
      className="flex flex-col overflow-hidden bg-[var(--bg-page)] border-r border-[var(--border-subtle)] shrink-0"
      style={{ width: '320px' }}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ padding: '20px 16px' }}
      >
        {messages.length === 0 && (
          <p className="text-[13px] text-[var(--text-muted)] text-center py-4">
            Chat with the AI to refine this spec.
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: '20px' }}>
            <ChatMessage
              role={msg.role}
              content={msg.content}
              userName={msg.userName}
            />
          </div>
        ))}
      </div>
      <ChatInput
        onSend={(content) => sendMessage(content, userName)}
        disabled={isStreaming}
        compact
      />
    </aside>
  )
}
