'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '../UserProvider'
import { useChat } from '../../lib/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

interface ChatViewProps {
  featureId: string
  initialMessages: {
    id: string
    role: string
    content: string
    userName?: string
    createdAt: string
  }[]
}

export function ChatView({ featureId, initialMessages }: ChatViewProps) {
  const { user } = useUser()
  const { messages, isStreaming, sendMessage, initMessages } = useChat(
    featureId,
    user.id,
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialised = useRef(false)

  useEffect(() => {
    if (!initialised.current) {
      initMessages(
        initialMessages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          userName: m.role === 'user' ? (m.userName ?? user.displayName) : 'Workhorse',
          createdAt: m.createdAt,
        })),
      )
      initialised.current = true
    }
  }, [initialMessages, initMessages, user.displayName])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSend(content: string) {
    sendMessage(content, user.displayName)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden items-center">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto w-full flex justify-center"
      >
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
            />
          ))}
          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex items-center gap-2 pl-[34px] text-[13px] text-[var(--text-muted)]">
              <span className="animate-pulse">Thinking...</span>
            </div>
          )}
        </div>
      </div>
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  )
}
