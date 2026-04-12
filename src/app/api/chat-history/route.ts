import '../../../lib/ai/ensureSessionStorage'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'

/**
 * GET /api/chat-history?sessionId=xxx
 *
 * Retrieves chat history for a conversation session from the Agent SDK session transcript.
 * Falls back gracefully if the session no longer exists or getSessionMessages
 * is not available.
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
    select: { agentSessionId: true, userId: true },
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

  try {
    // Attempt to load session messages from the Agent SDK
    // The SDK stores sessions on disk; getSessionMessages retrieves them
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
    // SDK SessionMessage shape: { type: 'user'|'assistant', message: unknown, uuid, session_id }
    const rawMessages = transcript
      .filter((msg: Record<string, unknown>) =>
        msg.type === 'user' || msg.type === 'assistant',
      )
      .map((msg: Record<string, unknown>, idx: number) => {
        // The actual content is in msg.message (an API message object), not msg.content
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
      .filter((msg: { content: string }) => msg.content.length > 0)

    // Collapse consecutive assistant messages into one — the SDK stores
    // each internal agent turn separately, but the UI shows a single
    // assistant bubble per user message (matching the live streaming view).
    const messages: typeof rawMessages = []
    for (const msg of rawMessages) {
      const prev = messages[messages.length - 1]
      if (prev && prev.role === 'assistant' && msg.role === 'assistant') {
        prev.content = prev.content + '\n\n' + msg.content
      } else {
        messages.push({ ...msg })
      }
    }

    return NextResponse.json({ messages })
  } catch {
    // Agent SDK not available or session expired — return empty
    return NextResponse.json({ messages: [] })
  }
}
