'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '../UserProvider'
import { useInterview } from '../../lib/hooks/useInterview'
import { useAttachments } from '../../lib/hooks/useAttachments'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { FileText } from 'lucide-react'

interface InterviewViewProps {
  cardId: string
}

export function InterviewView({ cardId }: InterviewViewProps) {
  const { user } = useUser()
  const {
    messages,
    isStreaming,
    fileWrites,
    sendMessage,
  } = useInterview(cardId)
  const {
    pending,
    addFiles,
    removeAttachment,
    clear: clearAttachments,
    getUploadedAttachments,
    isUploading,
  } = useAttachments(cardId)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, fileWrites])

  function handleSend(content: string) {
    const attachments = getUploadedAttachments()
    sendMessage(content, user.displayName, attachments.length > 0 ? attachments : undefined)
    clearAttachments()
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
                The interviewer has full access to the target codebase.
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
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-default)] bg-[var(--green-alpha)] border border-[rgba(22,163,74,0.15)] text-[12px] text-[var(--text-secondary)]"
                >
                  <FileText size={12} className="text-[var(--green)] shrink-0" />
                  <span>Updated <code className="text-[11px] font-mono">{fw.filePath}</code></span>
                </div>
              ))}
            </div>
          )}

          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex items-center gap-2 pl-[34px] text-[13px] text-[var(--text-muted)]">
              <span className="animate-pulse">Interviewer is working...</span>
            </div>
          )}
        </div>
      </div>
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        pendingAttachments={pending}
        onAddFiles={addFiles}
        onRemoveAttachment={removeAttachment}
        isUploading={isUploading}
      />
    </div>
  )
}
