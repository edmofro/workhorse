import '../../../lib/ai/ensureSessionStorage'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'

/**
 * GET /api/chat-history?cardId=xxx
 *
 * Retrieves chat history for a card from the Agent SDK session transcript.
 * Falls back gracefully if the session no longer exists or getSessionMessages
 * is not available.
 */
export async function GET(request: NextRequest) {
  await requireUser()

  const { searchParams } = new URL(request.url)
  const cardId = searchParams.get('cardId')

  if (!cardId) {
    return NextResponse.json({ error: 'cardId is required' }, { status: 400 })
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { agentSessionId: true },
  })

  if (!card?.agentSessionId) {
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
    const transcript = await getSessionMessages(card.agentSessionId)

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json({ messages: [] })
    }

    // Map SDK transcript to our message format
    const messages = transcript
      .filter((msg: Record<string, unknown>) =>
        msg.role === 'user' || msg.role === 'assistant',
      )
      .map((msg: Record<string, unknown>, idx: number) => {
        let content = ''
        if (typeof msg.content === 'string') {
          content = msg.content
        } else if (Array.isArray(msg.content)) {
          content = (msg.content as Array<Record<string, unknown>>)
            .filter((c) => c.type === 'text')
            .map((c) => c.text as string)
            .join('')
        }

        return {
          id: `history-${idx}`,
          role: msg.role as 'user' | 'assistant',
          content,
          userName: msg.role === 'user' ? 'You' : 'Workhorse',
          createdAt: (msg.timestamp as string) ?? null,
        }
      })
      .filter((msg: { content: string }) => msg.content.length > 0)

    return NextResponse.json({ messages })
  } catch {
    // Agent SDK not available or session expired — return empty
    return NextResponse.json({ messages: [] })
  }
}
