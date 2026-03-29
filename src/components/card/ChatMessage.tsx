import { Avatar } from '../Avatar'
import { MarkdownContent } from './MarkdownContent'
import { MessageAttachments } from './AttachmentPreview'
import type { AttachmentData } from '../../lib/attachments'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  userName?: string
  timestamp?: string
  compact?: boolean
  attachments?: AttachmentData[]
}

export function ChatMessage({
  role,
  content,
  userName,
  timestamp,
  compact = false,
  attachments,
}: ChatMessageProps) {
  const isAI = role === 'assistant'

  return (
    <div style={{ marginBottom: compact ? '16px' : '24px' }}>
      <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
        <Avatar
          variant={isAI ? 'ai' : 'human'}
          size="chat"
          initial={userName ?? 'U'}
        />
        <span className="text-[13px] font-medium">
          {isAI ? 'Workhorse' : userName ?? 'You'}
        </span>
        {timestamp && (
          <span className="text-[11px] text-[var(--text-faint)]">
            {formatTime(timestamp)}
          </span>
        )}
      </div>
      <div
        className="text-[14px] text-[var(--text-secondary)] leading-[1.7]"
        style={{ paddingLeft: '36px' }}
      >
        <MarkdownContent content={content} />
        {attachments && attachments.length > 0 && (
          <MessageAttachments attachments={attachments} />
        )}
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
