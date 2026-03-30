'use client'

import { useRef, useEffect } from 'react'
import { Maximize2, X } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ThinkingIndicator } from './ThinkingIndicator'
import { ActionPills, type ActionPill } from './ActionPills'
import type { SessionMessage } from '../../lib/hooks/useAgentSession'
import type { PendingAttachment } from '../../lib/attachments'

interface FloatingChatProps {
  messages: SessionMessage[]
  isStreaming: boolean
  thinkingSnippet?: string | null
  pills: ActionPill[]
  onSend: (content: string) => void
  onPillSelect: (pill: ActionPill) => void
  onExpand?: () => void
  onClose?: () => void
  /** Whether to show as a pill button (collapsed) or a panel */
  variant: 'pill' | 'panel'
  /** Height in px for panel variant */
  height?: number
  placeholder?: string
  disabled?: boolean
  // Attachment support
  pendingAttachments?: PendingAttachment[]
  onAddFiles?: (files: FileList) => void
  onRemoveAttachment?: (id: string) => void
  isUploading?: boolean
}

export function FloatingChat({
  messages,
  isStreaming,
  thinkingSnippet,
  pills,
  onSend,
  onPillSelect,
  onExpand,
  onClose,
  variant,
  height = 200,
  placeholder,
  disabled,
  pendingAttachments,
  onAddFiles,
  onRemoveAttachment,
  isUploading,
}: FloatingChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (variant === 'pill') {
    return (
      <button
        onClick={onExpand}
        className="absolute left-1/2 -translate-x-1/2 bottom-5 px-5 py-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full shadow-[var(--shadow-md)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer z-10"
      >
        Chat
      </button>
    )
  }

  const recentMessages = messages.slice(-6)

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] flex flex-col overflow-hidden z-10"
      style={{ height: `${height}px`, maxHeight: '60vh', maxWidth: '640px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] shrink-0">
        <span className="text-[12px] font-medium text-[var(--text-muted)]">
          Chat
        </span>
        <div className="flex items-center gap-1">
          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
              title="Expand to full screen"
            >
              <Maximize2 size={12} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Messages (compact) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {recentMessages.length === 0 && pills.length === 0 && (
          <p className="text-[12px] text-[var(--text-faint)] text-center py-2">
            Start a conversation
          </p>
        )}
        {recentMessages.map((msg) => (
          <div key={msg.id} className="mb-2 last:mb-3">
            <ChatMessage
              role={msg.role}
              content={msg.content}
              userName={msg.userName}
              timestamp={msg.createdAt}
              attachments={msg.attachments}
            />
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <ThinkingIndicator snippet={thinkingSnippet ?? null} />
        )}
      </div>

      {/* Pills + Input */}
      <div className="shrink-0 border-t border-[var(--border-subtle)]">
        {pills.length > 0 && (
          <div className="px-3 pt-2">
            <ActionPills
              pills={pills}
              onSelect={onPillSelect}
              disabled={disabled || isStreaming}
            />
          </div>
        )}
        <ChatInput
          onSend={onSend}
          disabled={disabled || isStreaming}
          placeholder={placeholder ?? 'Ask something...'}
          compact
          pendingAttachments={pendingAttachments}
          onAddFiles={onAddFiles}
          onRemoveAttachment={onRemoveAttachment}
          isUploading={isUploading}
        />
      </div>
    </div>
  )
}
