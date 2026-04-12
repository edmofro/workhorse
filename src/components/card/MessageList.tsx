'use client'

import { useMemo } from 'react'
import { ChatMessage } from './ChatMessage'
import { CollapsedTurns } from './CollapsedTurns'
import type { SessionMessage } from '../../lib/hooks/useAgentSession'

interface MessageListProps {
  messages: SessionMessage[]
  /** Whether the agent is currently streaming. When true, the current run stays expanded. */
  isStreaming: boolean
}

interface MessageGroup {
  type: 'user' | 'final' | 'in_progress' | 'collapsed'
  messages: SessionMessage[]
}

/**
 * Renders messages with interim/final classification and collapsing.
 *
 * - Interim messages (completed runs) are collapsed by default
 * - Final messages are always shown
 * - In-progress messages (current run while streaming) are expanded
 * - User messages are always shown
 */
export function MessageList({ messages, isStreaming }: MessageListProps) {
  const groups = useMemo(
    () => groupMessages(messages, isStreaming),
    [messages, isStreaming],
  )

  return (
    <>
      {groups.map((group, i) => {
        if (group.type === 'collapsed') {
          return <CollapsedTurns key={`collapsed-${i}`} messages={group.messages} />
        }

        return group.messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            userName={msg.userName}
            timestamp={msg.createdAt}
            attachments={msg.attachments}
          />
        ))
      })}
    </>
  )
}

/**
 * Group messages for display: user messages pass through, assistant messages
 * are grouped into runs and classified for collapsing.
 */
function groupMessages(messages: SessionMessage[], isStreaming: boolean): MessageGroup[] {
  const groups: MessageGroup[] = []

  // Precompute the last user message index to avoid O(n²) scanning
  let lastUserIdx = -1
  for (let j = messages.length - 1; j >= 0; j--) {
    if (messages[j].role === 'user') { lastUserIdx = j; break }
  }

  let i = 0

  while (i < messages.length) {
    const msg = messages[i]

    if (msg.role === 'user') {
      groups.push({ type: 'user', messages: [msg] })
      i++
      continue
    }

    // Collect consecutive assistant messages
    const runStart = i
    while (i < messages.length && messages[i].role === 'assistant') {
      i++
    }
    const run = messages.slice(runStart, i)

    // Check if this is the final run (no more user messages after it)
    const isFinalRun = runStart > lastUserIdx

    // Check classifications from the server
    const hasClassifications = run.some((m) => m.classification)

    if (hasClassifications) {
      // Use server-provided classifications
      const interimMsgs = run.filter((m) => m.classification === 'interim')
      const finalMsgs = run.filter((m) => m.classification === 'final')
      const inProgressMsgs = run.filter((m) => m.classification === 'in_progress')

      if (interimMsgs.length > 0) {
        groups.push({ type: 'collapsed', messages: interimMsgs })
      }
      if (finalMsgs.length > 0) {
        groups.push({ type: 'final', messages: finalMsgs })
      }
      if (inProgressMsgs.length > 0) {
        groups.push({ type: 'in_progress', messages: inProgressMsgs })
      }
    } else if (isFinalRun && isStreaming) {
      // Currently streaming — show all messages in the current run expanded
      groups.push({ type: 'in_progress', messages: run })
    } else if (run.length > 1) {
      // Completed run with multiple messages — collapse interim, show final
      const interim = run.slice(0, -1)
      const final = run.slice(-1)
      groups.push({ type: 'collapsed', messages: interim })
      groups.push({ type: 'final', messages: final })
    } else {
      // Single message run — show as final
      groups.push({ type: 'final', messages: run })
    }
  }

  return groups
}
