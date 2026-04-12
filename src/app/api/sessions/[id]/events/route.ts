import { requireUser } from '../../../../../lib/auth/session'
import { prisma } from '../../../../../lib/prisma'
import { subscribe, isActive, clearStaleSessions } from '../../../../../lib/sessionEvents'
import { NextRequest } from 'next/server'

/**
 * GET /api/sessions/[id]/events
 *
 * SSE endpoint for subscribing to a session's live event stream.
 * If the session is actively streaming, replays recent events then
 * streams live. If idle or stale, sends a single `idle` event and closes.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await requireUser()
  } catch {
    return new Response('Unauthorised', { status: 401 })
  }

  const { id: sessionId } = await params

  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, agentActiveAt: true },
  })

  if (!session || session.userId !== user.id) {
    return new Response('Not found', { status: 404 })
  }

  // Check for stale activity — clear if older than threshold
  if (session.agentActiveAt) {
    const cleared = await clearStaleSessions({ sessionId })
    if (cleared > 0) {
      session.agentActiveAt = null
    }
  }

  // If not active or no active channel, return idle
  if (!session.agentActiveAt || !isActive(sessionId)) {
    const encoder = new TextEncoder()
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ type: 'status', status: 'idle' })}\n\n`),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      },
    )
  }

  // Stream live events
  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Send streaming status
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'status', status: 'streaming' })}\n\n`),
      )

      unsubscribe = subscribe(sessionId, (event) => {
        // The channel_closed sentinel means the agent finished — send idle and close
        if (event.type === 'channel_closed') {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', status: 'idle' })}\n\n`))
            controller.close()
          } catch {
            // Already closed
          }
          return
        }

        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          unsubscribe?.()
        }
      })
    },
    cancel() {
      unsubscribe?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
