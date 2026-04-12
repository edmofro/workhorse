import '../../../lib/ai/ensureSessionStorage'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'

/**
 * GET /api/chat-history?sessionId=xxx
 *
 * Retrieves chat history for a conversation session from the Agent SDK session transcript.
 * Messages are classified as 'interim', 'final', or 'in_progress' based on their position
 * in the transcript and whether the agent is currently active.
 */
export async function GET(request: NextRequest) {
  const user = await requireUser()

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  const convSession = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: { agentSessionId: true, userId: true, agentActiveAt: true },
  })

  if (!convSession) {
    return NextResponse.json({ messages: [] })
  }

  if (convSession.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!convSession.agentSessionId) {
    return NextResponse.json({ messages: [] })
  }

  const isAgentActive = convSession.agentActiveAt !== null

  try {
    // Attempt to load session messages from the Agent SDK
    const sdk = await import('@anthropic-ai/claude-agent-sdk')
    const getSessionMessages = 'getSessionMessages' in sdk ? sdk.getSessionMessages : undefined
    if (typeof getSessionMessages !== 'function') {
      return NextResponse.json({ messages: [] })
    }
    const transcript = await getSessionMessages(convSession.agentSessionId)

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json({ messages: [] })
    }

    // Map SDK transcript to our message format
    const rawMessages = transcript
      .filter((msg: Record<string, unknown>) =>
        msg.type === 'user' || msg.type === 'assistant',
      )
      .map((msg: Record<string, unknown>, idx: number) => {
        const apiMessage = msg.message as Record<string, unknown> | undefined
        let content = ''
        if (typeof apiMessage?.content === 'string') {
          content = apiMessage.content
        } else if (Array.isArray(apiMessage?.content)) {
          content = (apiMessage.content as Array<Record<string, unknown>>)
            .filter((c) => c.type === 'text')
            .map((c) => c.text as string)
            .join('')
        }

        return {
          id: `history-${idx}`,
          role: msg.type as 'user' | 'assistant',
          content,
          userName: msg.type === 'user' ? 'You' : 'Workhorse',
          createdAt: (msg.timestamp as string) ?? null,
        }
      })
      // Exclude empty assistant messages (turns that only used tools)
      .filter((msg: { role: string; content: string }) =>
        msg.role === 'user' || msg.content.length > 0,
      )

    // Classify each assistant message as interim, final, or in_progress
    const messages = classifyMessages(rawMessages, isAgentActive)

    return NextResponse.json({ messages })
  } catch {
    // Agent SDK not available or session expired — return empty
    return NextResponse.json({ messages: [] })
  }
}

/**
 * Classify assistant messages positionally:
 * - In a consecutive run of assistant messages between user messages,
 *   the last one is 'final', all others are 'interim'
 * - For the final run (after the last user message): if agentActiveAt
 *   is null (finished), last is 'final'; if non-null, all are 'in_progress'
 */
function classifyMessages(
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    userName: string
    createdAt: string | null
  }>,
  isAgentActive: boolean,
): Array<{
  id: string
  role: 'user' | 'assistant'
  content: string
  userName: string
  createdAt: string | null
  classification?: 'interim' | 'final' | 'in_progress'
}> {
  // Find the index of the last user message
  let lastUserIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIdx = i
      break
    }
  }

  // Process assistant message runs
  const result: typeof messages & { classification?: string }[] = []

  let i = 0
  while (i < messages.length) {
    const msg = messages[i]

    if (msg.role === 'user') {
      result.push({ ...msg })
      i++
      continue
    }

    // Collect consecutive assistant messages
    const runStart = i
    while (i < messages.length && messages[i].role === 'assistant') {
      i++
    }
    const runEnd = i // exclusive

    // Determine if this is the final run (after last user message)
    const isFinalRun = runStart > lastUserIdx

    for (let j = runStart; j < runEnd; j++) {
      const isLast = j === runEnd - 1

      let classification: 'interim' | 'final' | 'in_progress'
      if (isFinalRun && isAgentActive) {
        // Agent still working — all messages in the current run are in-progress
        classification = 'in_progress'
      } else if (isLast) {
        classification = 'final'
      } else {
        classification = 'interim'
      }

      result.push({ ...messages[j], classification })
    }
  }

  return result
}
