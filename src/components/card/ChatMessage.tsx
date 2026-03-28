import { Avatar } from '../Avatar'
import { MarkdownContent } from './MarkdownContent'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  userName?: string
  timestamp?: string
}

export function ChatMessage({
  role,
  content,
  userName,
  timestamp,
}: ChatMessageProps) {
  const isAI = role === 'assistant'

  return (
    <div style={{ marginBottom: '28px' }}>
      <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
        <Avatar
          variant={isAI ? 'ai' : 'human'}
          size="chat"
          initial={userName ?? 'U'}
        />
        <span className="text-[13px] font-semibold">
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
        style={{ paddingLeft: '34px' }}
      >
        <MarkdownContent content={content} />
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
